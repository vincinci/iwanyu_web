import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";

// --- Helpers (copied/adapted from import-products-from-csv.mjs) ---

function loadDotEnvFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {}
}

function normalizeSupabaseUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (/^[a-z0-9]{20}$/.test(raw)) return `https://${raw}.supabase.co`;
  return raw;
}

function slugify(input) {
  return String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function titleCase(input) {
  if (!input) return "";
  const small = new Set(["and", "or", "the", "a", "an", "of", "to", "in", "on", "for", "with"]);
  return input
    .split(" ")
    .map((word, idx) => {
      const w = word.toLowerCase();
      if (idx !== 0 && small.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

function toBool(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || v === true;
}

function toNumber(v) {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

function pickEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return null;
}

// --- Main Logic ---

async function main() {
  loadDotEnvFile(path.resolve(process.cwd(), ".env.local"));
  loadDotEnvFile(path.resolve(process.cwd(), ".env"));

  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: node scripts/import-shopify-full.mjs /path/to/file.csv");
    process.exit(1);
  }

  const raw = fs.readFileSync(path.resolve(csvPath), "utf8");
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  });

  const supabaseUrl = normalizeSupabaseUrl(pickEnv("SUPABASE_URL", "VITE_SUPABASE_URL"));
  const serviceKey = pickEnv("SUPABASE_SERVICE_ROLE_KEY", "VITE_SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY");

  // Fallback for limited service role environments: try anon key if service key missing
  // NOTE: Schema changes and RLS bypass require service role.
  const authKey = serviceKey || pickEnv("VITE_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY");

  if (!supabaseUrl || !authKey) {
    throw new Error("Missing Supabase credentials (URL and KEY required)");
  }

  const supabase = createClient(supabaseUrl, authKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Loading ${rows.length} rows from CSV...`);

  // 1. Group by Handle
  const productsMap = new Map();

  for (const row of rows) {
    const handle = row["Handle"];
    if (!handle) continue;
    if (!productsMap.has(handle)) {
      productsMap.set(handle, []);
    }
    productsMap.get(handle).push(row);
  }

  console.log(`Found ${productsMap.size} unique products.`);

  // 2. Pre-process Vendors
  const vendorNames = new Set();
  for (const group of productsMap.values()) {
    const vendor = group[0]["Vendor"];
    if (vendor) vendorNames.add(titleCase(vendor));
  }

  // Get or Create Vendors
  const vendorMap = new Map(); // Name -> ID
  const { data: existingVendors } = await supabase.from("vendors").select("id, name");
  if (existingVendors) {
    existingVendors.forEach((v) => vendorMap.set(v.name.toLowerCase(), v.id));
  }

  for (const vName of vendorNames) {
    if (!vendorMap.has(vName.toLowerCase())) {
        const vendorId = `v_${slugify(vName)}_${Date.now().toString(36)}`;
        // Assume we can insert vendors. If fails (RLS), we might need manual insert.
        const { error } = await supabase.from("vendors").insert({
            id: vendorId,
            name: vName,
            verified: true // Auto-verify imported vendors?
        });
        if (!error) {
            vendorMap.set(vName.toLowerCase(), vendorId);
            console.log(`Created vendor: ${vName}`);
        } else {
            console.error(`Failed to create vendor ${vName}: ${error.message}`);
             // Try to fetch again in case it existed but we missed it race condition
             // Or just skip
        }
    }
  }

  // 3. Process Products
  for (const [handle, group] of productsMap) {
    const mainRow = group.find(r => r["Title"]) || group[0];
    const title = mainRow["Title"] || titleCase(handle.replace(/-/g, " "));
    const vendorName = titleCase(mainRow["Vendor"]) || "Unknown Vendor";
    const vendorId = vendorMap.get(vendorName.toLowerCase());

    if (!vendorId) {
        console.warn(`Skipping product ${handle}: Vendor '${vendorName}' not found/created.`);
        continue;
    }

    const description = mainRow["Body (HTML)"] || "";
    const category = mainRow["Type"] || mainRow["Product Category"] || "Uncategorized";
    const tags = mainRow["Tags"] || "";
    const published = toBool(mainRow["Published"]);

    // Calculate aggregate price/stock from variants
    // But we also want base fields
    const variants = group.filter(r => r["Option1 Value"] || r["Variant SKU"]);
    // If no explicit variants, the main row acts as the variant (simple product)
    const effectiveVariants = variants.length > 0 ? variants : [mainRow];
    
    // Base Price is lowest variant price
    const prices = effectiveVariants.map(r => toNumber(r["Variant Price"])).filter(p => p > 0);
    const basePrice = prices.length > 0 ? Math.min(...prices) : 0;
    
    // Base Image
    const images = new Set();
    group.forEach(r => {
        if (r["Image Src"]) images.add(r["Image Src"]);
        if (r["Variant Image"]) images.add(r["Variant Image"]);
    });
    const imageList = Array.from(images).filter(Boolean);
    const mainImage = imageList[0] || null;

    // Total Stock
    const totalStock = effectiveVariants.reduce((sum, r) => sum + toNumber(r["Variant Inventory Qty"]), 0);

    // Insert Product
    // We use a deterministic ID based on handle if possible, or random.
    // To allow re-running, we might want to upsert by ID if we knew it.
    // For now, let's look up by title/handle? No, products table has ID primary key.
    // We'll generate a consistent ID from handle? No, existing DB uses UUID.
    // We'll just generate a new one if we can't search. OR search by title + vendor.
    
    let productId;
    
    const { data: existingProduct } = await supabase
        .from("products")
        .select("id")
        .eq("title", title)
        .eq("vendor_id", vendorId)
        .maybeSingle(); // Use maybeSingle to avoid error on 0 rows

    if (existingProduct) {
        productId = existingProduct.id;
        // Update product?
        await supabase.from("products").update({
            description,
            category,
            price_rwf: basePrice,
            image_url: mainImage,
            in_stock: totalStock > 0
        }).eq("id", productId);
         console.log(`Updated product: ${title}`);
    } else {
        // Insert
        // IMPORTANT: We need an ID. `gen_random_uuid()` works in SQL.
        // If we let Supabase generate it, we need `select` back.
        const { data: newProd, error: insertErr } = await supabase
            .from("products")
            .insert({
                vendor_id: vendorId,
                title,
                description,
                category,
                price_rwf: basePrice,
                image_url: mainImage,
                in_stock: totalStock > 0,
                free_shipping: false
            })
            .select("id")
            .single();

        if (insertErr) {
            console.error(`Failed to insert product ${title}: ${insertErr.message}`);
            continue;
        }
        productId = newProd.id;
        console.log(`Inserted product: ${title}`);
    }

    // 4. Insert Images (product_images)
    // First, clear existing images? Or upsert?
    // We'll clear for clean slate if re-importing, IF table exists.
    const { error: imgCheckErr } = await supabase.from("product_images").select("id").limit(1);
    const hasImagesTable = !imgCheckErr || imgCheckErr.code !== '42P01'; // 42P01 is undefined table

    if (hasImagesTable) {
        await supabase.from("product_images").delete().eq("product_id", productId);
        const imageInserts = imageList.map((url, idx) => ({
            product_id: productId,
            url,
            position: idx + 1,
            alt_text: title
        }));
        if (imageInserts.length) {
            await supabase.from("product_images").insert(imageInserts);
        }
    }

    // 5. Insert Variants (product_variants)
    const { error: varCheckErr } = await supabase.from("product_variants").select("id").limit(1);
    const hasVariantsTable = !varCheckErr || varCheckErr.code !== '42P01';

    if (hasVariantsTable) {
        await supabase.from("product_variants").delete().eq("product_id", productId);
        const variantInserts = effectiveVariants.map((r) => ({
            product_id: productId,
            title: r["Option1 Value"] ? `${r["Option1 Value"]} ${r["Option2 Value"] || ""}`.trim() : "Default Title",
            sku: r["Variant SKU"],
            price_rwf: toNumber(r["Variant Price"]),
            inventory_quantity: toNumber(r["Variant Inventory Qty"]),
            option1_name: r["Option1 Name"],
            option1_value: r["Option1 Value"],
            option2_name: r["Option2 Name"],
            option2_value: r["Option2 Value"],
            option3_name: r["Option3 Name"],
            option3_value: r["Option3 Value"],
            barcode: r["Variant Barcode"],
            image_url: r["Variant Image"] || null,
            weight: toNumber(r["Variant Grams"]),
            weight_unit: "g"
        }));
        
        if (variantInserts.length) {
            await supabase.from("product_variants").insert(variantInserts);
        }
    }
  }

  console.log("Import complete.");
}

main().catch(console.error);
