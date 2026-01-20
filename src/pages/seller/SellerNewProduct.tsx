import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMarketplace } from "@/context/marketplace";
import { useAuth } from "@/context/auth";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { createId } from "@/lib/ids";
import { uploadMediaToCloudinary } from "@/lib/cloudinary";
import { getAllCategoryOptions } from "@/lib/categories";
import type { Vendor } from "@/types/vendor";

const MAX_MEDIA_FILES = 8;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export default function SellerNewProductPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { vendors, createVendor, upsertProduct, getVendorsForOwner } = useMarketplace();

  const supabase = getSupabaseClient();

  const isAdmin = user?.role === "admin";
  const [ownedVendors, setOwnedVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadOwnedVendors() {
      if (!supabase || !user || isAdmin) {
        setOwnedVendors([]);
        return;
      }

      const { data, error } = await supabase
        .from("vendors")
        .select("id, name, location, verified, owner_user_id, status")
        .eq("owner_user_id", user.id)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(50);

      if (cancelled) return;
      if (error) {
        setOwnedVendors([]);
        return;
      }

      const rows = (data ?? []) as Array<{
        id: string;
        name: string;
        location: string | null;
        verified: boolean;
        owner_user_id: string | null;
        status: string | null;
      }>;

      setOwnedVendors(
        rows.map((v) => ({
          id: v.id,
          name: v.name,
          location: v.location ?? undefined,
          verified: Boolean(v.verified),
          ownerUserId: v.owner_user_id ?? undefined,
          status: (v.status ?? "approved") as Vendor["status"],
        }))
      );
    }

    void loadOwnedVendors();
    return () => {
      cancelled = true;
    };
  }, [supabase, user, isAdmin]);

  const myVendors = user ? ownedVendors : [];
  const vendorOptions = isAdmin ? vendors : myVendors;

  const firstVendorId = vendorOptions[0]?.id ?? "";

  const [vendorId, setVendorId] = useState<string>(firstVendorId);
  const [vendorName, setVendorName] = useState<string>("");

  useEffect(() => {
    if (!vendorId && firstVendorId) setVendorId(firstVendorId);
  }, [vendorId, firstVendorId]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("0");
  const [discountPercentage, setDiscountPercentage] = useState("0");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [inStock, setInStock] = useState(true);
  const [uploading, setUploading] = useState(false);

  const categoryOptions = useMemo(() => getAllCategoryOptions(), []);

  useEffect(() => {
    if (!category && categoryOptions.length > 0) setCategory(categoryOptions[0]);
  }, [category, categoryOptions]);

  const canSubmit = useMemo(() => {
    return (
      title.trim().length >= 3 &&
      Number(price) > 0 &&
      category.trim().length > 0 &&
      categoryOptions.length > 0 &&
      (vendorId || vendorName.trim().length >= 2)
    );
  }, [title, price, vendorId, vendorName, category, categoryOptions.length]);

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200 bg-white">
        <div className="container py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-iwanyu-foreground">New Product</h1>
            <p className="text-sm text-gray-600">Upload a product for your store.</p>
          </div>
          <Link to="/seller/products">
            <Button variant="outline" className="rounded-full">Back</Button>
          </Link>
        </div>
      </div>

      <div className="container py-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Product details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isAdmin && vendorOptions.length === 0 ? (
              <div className="rounded-lg border border-iwanyu-border bg-white p-4 text-sm text-gray-700">
                <div className="font-semibold text-gray-900">No approved store yet</div>
                <div className="mt-1 text-gray-600">Submit your vendor application on the onboarding page first.</div>
                <div className="mt-3">
                  <Link to="/sell">
                    <Button variant="outline" className="rounded-full">Go to onboarding</Button>
                  </Link>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-sm font-medium text-gray-700">Select vendor</div>
                <Select value={vendorId} onValueChange={(v) => setVendorId(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendorOptions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isAdmin && myVendors.length === 0 ? (
                  <div className="mt-2 text-xs text-gray-500">No store yet. Create one below.</div>
                ) : null}
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700">Or create vendor</div>
                <Input
                  className="mt-1"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="Vendor name"
                />
                {!isAdmin ? (
                  <div className="mt-2 text-xs text-gray-500">Vendors require admin approval. Use onboarding.</div>
                ) : null}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700">Title</div>
              <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Product title" />
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700">Description</div>
              <Textarea
                className="mt-1"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the product"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <div className="text-sm font-medium text-gray-700">Category</div>
                {categoryOptions.length === 0 ? (
                  <div className="mt-1 rounded-md border border-iwanyu-border bg-white p-3 text-xs text-gray-600">
                    No categories available.
                  </div>
                ) : (
                  <Select value={category} onValueChange={(v) => setCategory(v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">Price</div>
                <Input className="mt-1" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">Stock</div>
                <Select value={inStock ? "in" : "out"} onValueChange={(v) => setInStock(v === "in")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">In stock</SelectItem>
                    <SelectItem value="out">Out of stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700">Discount (%)</div>
              <Input
                className="mt-1"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(e.target.value)}
                inputMode="numeric"
                placeholder="0"
              />
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700">Media (images/videos)</div>
              <Input
                className="mt-1"
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => {
                  const next = Array.from(e.target.files ?? []);
                  const accepted: File[] = [];
                  for (const f of next) {
                    const isVideo = f.type.startsWith("video/");
                    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
                    if (!f.type.startsWith("image/") && !isVideo) {
                      toast({ title: "Unsupported file", description: f.name, variant: "destructive" });
                      continue;
                    }
                    if (f.size > maxBytes) {
                      toast({
                        title: "File too large",
                        description: `${f.name} exceeds the upload limit`,
                        variant: "destructive",
                      });
                      continue;
                    }
                    accepted.push(f);
                  }
                  const merged = [...mediaFiles, ...accepted].slice(0, MAX_MEDIA_FILES);
                  setMediaFiles(merged);
                }}
              />
              <div className="mt-2 text-xs text-gray-500">
                Up to {MAX_MEDIA_FILES} files. Images ≤ {Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB, videos ≤ {Math.round(MAX_VIDEO_BYTES / 1024 / 1024)}MB.
              </div>

              {mediaFiles.length > 0 ? (
                <div className="mt-3 grid gap-2">
                  {mediaFiles.map((f) => (
                    <div key={`${f.name}-${f.size}`} className="flex items-center justify-between rounded-md border border-iwanyu-border bg-white px-3 py-2 text-sm">
                      <div className="truncate text-gray-700">{f.name}</div>
                      <Button
                        variant="outline"
                        className="rounded-full"
                        onClick={() => setMediaFiles((prev) => prev.filter((x) => x !== f))}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                className="rounded-full bg-iwanyu-primary text-white hover:bg-iwanyu-primary/90"
                disabled={!canSubmit || uploading || (!isAdmin && vendorOptions.length === 0)}
                onClick={async () => {
                  try {
                    if (!supabase) throw new Error("Supabase is not configured");
                    if (!user) throw new Error("Not signed in");
                    if (categoryOptions.length === 0) throw new Error("No categories available");
                    if (!category.trim()) throw new Error("Please select a category");

                    let resolvedVendorId = vendorId;
                    if (!resolvedVendorId && vendorName.trim().length >= 2) {
                      if (!isAdmin) throw new Error("Vendor creation requires approval. Use onboarding (/sell). ");
                      const created = await createVendor({
                        name: vendorName.trim(),
                        location: "Kigali, Rwanda",
                        ownerUserId: user?.id,
                        verified: false,
                      });
                      resolvedVendorId = created.id;
                    }

                    if (!resolvedVendorId) throw new Error("Missing vendor");

                    setUploading(true);

                    const { data } = await supabase.auth.getSession();
                    const accessToken = data.session?.access_token;
                    if (!accessToken) throw new Error("Missing session");

                    const productId = createId("p");

                    const uploaded = [] as Array<{ kind: "image" | "video"; url: string; publicId: string }>;
                    for (const file of mediaFiles) {
                      const kind = file.type.startsWith("video/") ? "video" : "image";
                      const result = await uploadMediaToCloudinary(file, { kind, folder: "products", accessToken });
                      uploaded.push({ kind, url: result.url, publicId: result.publicId });
                    }

                    const primaryImage = uploaded.find((m) => m.kind === "image")?.url ?? "";

                    await upsertProduct({
                      id: productId,
                      vendorId: resolvedVendorId,
                      title: title.trim(),
                      description: description.trim() || "",
                      category: category.trim(),
                      price: Number(price),
                      rating: 0,
                      reviewCount: 0,
                      image: primaryImage,
                      inStock,
                      freeShipping: false,
                      discountPercentage: Math.max(0, Math.min(100, Number(discountPercentage || 0))),
                    });

                    if (uploaded.length > 0) {
                      await supabase.from("product_media").insert(
                        uploaded.map((m, idx) => ({
                          product_id: productId,
                          vendor_id: resolvedVendorId,
                          kind: m.kind,
                          url: m.url,
                          public_id: m.publicId,
                          position: idx,
                        }))
                      );
                    }

                    toast({ title: "Product uploaded", description: "Your product is live." });
                    navigate("/seller/products");
                  } catch (e) {
                    toast({
                      title: "Upload failed",
                      description: e instanceof Error ? e.message : "Unknown error",
                      variant: "destructive",
                    });
                  } finally {
                    setUploading(false);
                  }
                }}
              >
                {uploading ? "Uploading..." : "Upload product"}
              </Button>
              <Link to="/seller/products">
                <Button variant="outline" className="rounded-full">Cancel</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
