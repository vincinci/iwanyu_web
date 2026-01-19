import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { parse } from "csv-parse/sync";
import pg from "pg";

// --- Helpers ---

function loadEnv(filePath) {
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

// --- Main Logic ---

async function main() {
  loadEnv(path.resolve(process.cwd(), ".env.local"));
  loadEnv(path.resolve(process.cwd(), ".env"));

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

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
      throw new Error("DATABASE_URL is missing in environment.");
  }

  const pool = new pg.Pool({
      connectionString,
      ssl: true,
      max: 1 // Sequential for script
  });

  console.log(`Connecting to DB...`);
  const client = await pool.connect();

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

  try {
      await client.query('BEGIN');

      // 2. Pre-process Vendors
      const vendorNames = new Set();
      for (const group of productsMap.values()) {
        const vendor = group[0]["Vendor"];
        if (vendor) vendorNames.add(titleCase(vendor));
      }

      // Get or Create Vendors
      const vendorMap = new Map(); // Name -> ID
      const { rows: existingVendors } = await client.query('SELECT id, name FROM vendors');
      existingVendors.forEach((v) => vendorMap.set(v.name.toLowerCase(), v.id));

      for (const vName of vendorNames) {
        if (!vendorMap.has(vName.toLowerCase())) {
            const vendorId = `v_${slugify(vName)}_${Date.now().toString(36)}`;
            
            await client.query(
                'INSERT INTO vendors (id, name, verified, status) VALUES ($1, $2, $3, $4)',
                [vendorId, vName, true, 'approved']
            );
            
            vendorMap.set(vName.toLowerCase(), vendorId);
            console.log(`Created vendor: ${vName}`);
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
        const published = toBool(mainRow["Published"]);

        const variants = group.filter(r => r["Option1 Value"] || r["Variant SKU"]);
        const effectiveVariants = variants.length > 0 ? variants : [mainRow];
        
        const prices = effectiveVariants.map(r => toNumber(r["Variant Price"])).filter(p => p > 0);
        const basePrice = prices.length > 0 ? Math.min(...prices) : 0;
        
        const images = new Set();
        group.forEach(r => {
            if (r["Image Src"]) images.add(r["Image Src"]);
            if (r["Variant Image"]) images.add(r["Variant Image"]);
        });
        const imageList = Array.from(images).filter(Boolean);
        const mainImage = imageList[0] || null;
        const totalStock = effectiveVariants.reduce((sum, r) => sum + toNumber(r["Variant Inventory Qty"]), 0);

        // Upsert Product
        let productId;
        
        const { rows: existingProds } = await client.query(
            'SELECT id FROM products WHERE title = $1 AND vendor_id = $2 LIMIT 1',
            [title, vendorId]
        );

        if (existingProds.length > 0) {
            productId = existingProds[0].id;
            await client.query(
                `UPDATE products SET description = $1, category = $2, price_rwf = $3, image_url = $4, in_stock = $5 WHERE id = $6`,
                [description, category, basePrice, mainImage, totalStock > 0, productId]
            );
            console.log(`Updated product: ${title}`);
        } else {
            // Need UUID for new product
            const res = await client.query(
                `INSERT INTO products (id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping)
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING id`,
                [vendorId, title, description, category, basePrice, mainImage, totalStock > 0, false]
            );
            productId = res.rows[0].id;
            console.log(`Inserted product: ${title}`);
        }

        // 4. Images
        // Check if table exists (it should, after migration)
        await client.query('DELETE FROM product_images WHERE product_id = $1', [productId]);
        
        for (let idx = 0; idx < imageList.length; idx++) {
            await client.query(
                'INSERT INTO product_images (product_id, url, position, alt_text) VALUES ($1, $2, $3, $4)',
                [productId, imageList[idx], idx + 1, title]
            );
        }

        // 5. Variants
        await client.query('DELETE FROM product_variants WHERE product_id = $1', [productId]);

        for (const r of effectiveVariants) {
            const vTitle = r["Option1 Value"] ? `${r["Option1 Value"]} ${r["Option2 Value"] || ""}`.trim() : "Default Title";
            await client.query(
                `INSERT INTO product_variants (
                    product_id, title, sku, price_rwf, inventory_quantity, 
                    option1_name, option1_value, option2_name, option2_value,
                    option3_name, option3_value, barcode, image_url, weight, weight_unit
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
                [
                    productId, vTitle, r["Variant SKU"], toNumber(r["Variant Price"]), toNumber(r["Variant Inventory Qty"]),
                    r["Option1 Name"], r["Option1 Value"], r["Option2 Name"], r["Option2 Value"],
                    r["Option3 Name"], r["Option3 Value"], r["Variant Barcode"], r["Variant Image"] || null,
                    toNumber(r["Variant Grams"]), "g"
                ]
            );
        }
      }

      await client.query('COMMIT');
  } catch (e) {
      await client.query('ROLLBACK');
      console.error(e);
      throw e;
  } finally {
      client.release();
      await pool.end();
  }

  console.log("Import complete.");
}

main().catch(console.error);
