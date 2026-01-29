import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMarketplace } from "@/context/marketplace";
import { useAuth } from "@/context/auth";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { createId } from "@/lib/ids";
import { uploadMediaToCloudinary } from "@/lib/cloudinary";
import { getAllCategoryOptions } from "@/lib/categories";
import type { Vendor } from "@/types/vendor";
import type { ProductVariantColor } from "@/types/product";
import { ImagePlus, Trash2, CheckCircle2, Plus } from "lucide-react";

const MAX_MEDIA_FILES = 8;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

type MediaPreview = {
  id: string;
  kind: "image" | "video";
  url: string;
  file: File;
};

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function colorToHex(name: string): string {
  const n = name.trim().toLowerCase();
  const map: Record<string, string> = {
    black: "#111827",
    white: "#ffffff",
    gray: "#9ca3af",
    grey: "#9ca3af",
    red: "#ef4444",
    blue: "#3b82f6",
    green: "#22c55e",
    yellow: "#eab308",
    orange: "#f97316",
    purple: "#a855f7",
    pink: "#ec4899",
    brown: "#92400e",
    beige: "#f5f5dc",
  };

  if (map[n]) return map[n];
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(name.trim())) return name.trim();
  return "#111827";
}

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
  const [mediaPreviews, setMediaPreviews] = useState<MediaPreview[]>([]);
  const [primaryMediaId, setPrimaryMediaId] = useState<string>("");
  const [inStock, setInStock] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadingCount, setUploadingCount] = useState(0);

  const [variantsEnabled, setVariantsEnabled] = useState(true);
  const [colors, setColors] = useState<ProductVariantColor[]>([
    { name: "Black", hex: "#111827" },
    { name: "White", hex: "#ffffff" },
    { name: "Red", hex: "#ef4444" },
  ]);
  const [sizes, setSizes] = useState<string[]>(["S", "M", "L", "XL"]);
  const [newColor, setNewColor] = useState<string>("");
  const [newSize, setNewSize] = useState<string>("");

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

  const addFiles = (incoming: File[]) => {
    const accepted: File[] = [];
    for (const f of incoming) {
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

    setMediaFiles((prev) => {
      const merged = [...prev, ...accepted];
      // de-dupe by key
      const seen = new Set<string>();
      const deduped: File[] = [];
      for (const f of merged) {
        const k = fileKey(f);
        if (seen.has(k)) continue;
        seen.add(k);
        deduped.push(f);
      }
      return deduped.slice(0, MAX_MEDIA_FILES);
    });
  };

  useEffect(() => {
    // Maintain object URL previews for selected files.
    setMediaPreviews((prev) => {
      const prevById = new Map(prev.map((p) => [p.id, p]));
      const next: MediaPreview[] = [];

      for (const file of mediaFiles) {
        const id = fileKey(file);
        const existing = prevById.get(id);
        if (existing) {
          next.push(existing);
          continue;
        }
        const kind = file.type.startsWith("video/") ? "video" : "image";
        const url = URL.createObjectURL(file);
        next.push({ id, kind, url, file });
      }

      // Revoke removed previews
      const nextIds = new Set(next.map((p) => p.id));
      for (const old of prev) {
        if (!nextIds.has(old.id)) URL.revokeObjectURL(old.url);
      }

      return next;
    });
  }, [mediaFiles]);

  useEffect(() => {
    if (!primaryMediaId && mediaPreviews.length > 0) setPrimaryMediaId(mediaPreviews[0].id);
    if (primaryMediaId && mediaPreviews.length > 0 && !mediaPreviews.some((p) => p.id === primaryMediaId)) {
      setPrimaryMediaId(mediaPreviews[0].id);
    }
  }, [mediaPreviews, primaryMediaId]);

  useEffect(() => {
    return () => {
      // cleanup previews
      for (const p of mediaPreviews) URL.revokeObjectURL(p.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background">
        <div className="container py-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Create product</h1>
            <p className="text-sm text-muted-foreground">Fast setup with media preview and simple variants.</p>
          </div>
          <div className="shrink-0">
            <Link to="/seller/products">
              <Button variant="outline" className="rounded-md">Back</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container py-8 max-w-4xl">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base font-medium">Basics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
            {!isAdmin && vendorOptions.length === 0 ? (
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
                <div className="font-medium text-foreground">No approved store yet</div>
                <div className="mt-1 text-muted-foreground">Submit your vendor application on the onboarding page first.</div>
                <div className="mt-3">
                  <Link to="/sell">
                    <Button variant="outline" className="rounded-md">Go to onboarding</Button>
                  </Link>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Vendor</div>
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
                  <div className="mt-2 text-xs text-muted-foreground">No store yet. Create one below.</div>
                ) : null}
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground">Or create vendor</div>
                <Input
                  className="mt-1"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="Vendor name"
                />
                {!isAdmin ? (
                  <div className="mt-2 text-xs text-muted-foreground">Vendors require admin approval. Use onboarding.</div>
                ) : null}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Title</div>
              <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Classic cotton t-shirt" />
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Description</div>
              <Textarea
                className="mt-1"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short, clear description. Include material, fit, what’s included."
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Category</div>
                {categoryOptions.length === 0 ? (
                  <div className="mt-1 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
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
                <div className="text-sm font-medium text-muted-foreground">Price (RWF)</div>
                <Input className="mt-1" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Stock</div>
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
              <div className="text-sm font-medium text-muted-foreground">Discount (%)</div>
              <Input
                className="mt-1"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(e.target.value)}
                inputMode="numeric"
                placeholder="0"
              />
            </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base font-medium">Media</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  className="rounded-lg border border-dashed border-border bg-muted/20 p-5"
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const files = Array.from(e.dataTransfer.files ?? []);
                    addFiles(files);
                  }}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">Images & videos</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Drag & drop, or choose files. Up to {MAX_MEDIA_FILES}. Images ≤ {Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB, videos ≤ {Math.round(MAX_VIDEO_BYTES / 1024 / 1024)}MB.
                      </div>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted transition-colors">
                      <ImagePlus size={16} />
                      <span>Add media</span>
                      <input
                        className="sr-only"
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        onChange={(e) => {
                          addFiles(Array.from(e.target.files ?? []));
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>

                {mediaPreviews.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {mediaPreviews.map((p) => {
                      const isPrimary = p.id === primaryMediaId;
                      return (
                        <div key={p.id} className="group relative overflow-hidden rounded-lg border border-border bg-card">
                          <button
                            type="button"
                            onClick={() => setPrimaryMediaId(p.id)}
                            className="block w-full"
                            title="Set as primary"
                          >
                            <div className="aspect-square bg-muted">
                              {p.kind === "video" ? (
                                <video className="h-full w-full object-cover" src={p.url} muted preload="metadata" />
                              ) : (
                                <img className="h-full w-full object-cover" src={p.url} alt={p.file.name} />
                              )}
                            </div>
                          </button>

                          <div className="absolute left-2 top-2 flex items-center gap-2">
                            {isPrimary ? (
                              <Badge variant="secondary" className="bg-background/90">Primary</Badge>
                            ) : null}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setMediaFiles((prev) => prev.filter((f) => fileKey(f) !== p.id));
                            }}
                            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md bg-background/90 text-muted-foreground shadow-sm hover:text-foreground"
                            aria-label="Remove media"
                          >
                            <Trash2 size={16} />
                          </button>

                          <div className="px-3 py-2">
                            <div className="truncate text-xs text-muted-foreground">{p.file.name}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">No media selected yet.</div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base font-medium">Variants</CardTitle>
                  <button
                    type="button"
                    onClick={() => setVariantsEnabled((v) => !v)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {variantsEnabled ? "Disable" : "Enable"}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="text-sm text-muted-foreground">
                  Add common options (like colors and sizes). These help buyers choose quickly.
                </div>

                {variantsEnabled ? (
                  <>
                    <div>
                      <div className="text-sm font-medium text-foreground">Colors</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {colors.map((c) => (
                          <div key={`${c.name}-${c.hex}`} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm">
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-border"
                              style={{ backgroundColor: c.hex }}
                              aria-label={c.name}
                            />
                            <span className="text-foreground">{c.name}</span>
                            <button
                              type="button"
                              className="ml-1 text-muted-foreground hover:text-foreground"
                              onClick={() => setColors((prev) => prev.filter((x) => !(x.name === c.name && x.hex === c.hex)))}
                              aria-label={`Remove ${c.name}`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <Input
                          value={newColor}
                          onChange={(e) => setNewColor(e.target.value)}
                          placeholder="Add a color (e.g. Blue or #3b82f6)"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-md"
                          onClick={() => {
                            const name = newColor.trim();
                            if (!name) return;
                            const hex = colorToHex(name);
                            setColors((prev) => {
                              const exists = prev.some((c) => c.name.toLowerCase() === name.toLowerCase());
                              if (exists) return prev;
                              return [...prev, { name, hex }];
                            });
                            setNewColor("");
                          }}
                        >
                          <Plus size={16} />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-foreground">Sizes</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {sizes.map((s) => (
                          <div key={s} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm">
                            <span className="text-foreground">{s}</span>
                            <button
                              type="button"
                              className="ml-1 text-muted-foreground hover:text-foreground"
                              onClick={() => setSizes((prev) => prev.filter((x) => x !== s))}
                              aria-label={`Remove ${s}`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <Input value={newSize} onChange={(e) => setNewSize(e.target.value)} placeholder="Add a size (e.g. XXL)" />
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-md"
                          onClick={() => {
                            const s = newSize.trim();
                            if (!s) return;
                            setSizes((prev) => (prev.includes(s) ? prev : [...prev, s]));
                            setNewSize("");
                          }}
                        >
                          <Plus size={16} />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    Variants are disabled. Product will be listed without selectable options.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4">
            <Card className="border-border lg:sticky lg:top-24">
              <CardHeader>
                <CardTitle className="text-base font-medium">Ready to publish</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {canSubmit ? (
                    <span className="inline-flex items-center gap-2 text-foreground">
                      <CheckCircle2 size={16} className="text-green-600" /> Looks good
                    </span>
                  ) : (
                    "Add title, price, category, and vendor to publish."
                  )}
                </div>

                <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Media</span>
                    <span className="text-foreground">{mediaFiles.length}/{MAX_MEDIA_FILES}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-muted-foreground">Variants</span>
                    <span className="text-foreground">{variantsEnabled ? `${colors.length} colors · ${sizes.length} sizes` : "Off"}</span>
                  </div>
                </div>

                <Button
                  className="w-full rounded-md"
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
                      setUploadProgress({});
                      setUploadingCount(mediaFiles.length);

                      const { data } = await supabase.auth.getSession();
                      const accessToken = data.session?.access_token;
                      if (!accessToken) throw new Error("Missing session");

                      const productId = createId("p");

                      // Upload all files in parallel with progress tracking
                      const uploadPromises = mediaFiles.map(async (file, idx) => {
                        const kind = file.type.startsWith("video/") ? "video" : "image";
                        const fileId = fileKey(file);
                        
                        try {
                          const result = await uploadMediaToCloudinary(file, {
                            kind,
                            folder: "products",
                            accessToken,
                            onProgress: (progress) => {
                              setUploadProgress((prev) => ({ ...prev, [fileId]: progress }));
                            },
                          });
                          
                          setUploadingCount((prev) => prev - 1);
                          return { idx, kind, url: result.url, publicId: result.publicId };
                        } catch (error) {
                          setUploadingCount((prev) => prev - 1);
                          throw error;
                        }
                      });

                      const uploadResults = await Promise.all(uploadPromises);
                      const uploaded = uploadResults.filter(Boolean) as Array<{
                        idx: number;
                        kind: "image" | "video";
                        url: string;
                        publicId: string;
                      }>;

                      const primaryIdx = mediaFiles.findIndex((f) => fileKey(f) === primaryMediaId);
                      const primaryFromSelected = uploaded.find((u) => u.idx === primaryIdx);
                      const primaryImage =
                        primaryFromSelected?.kind === "image"
                          ? primaryFromSelected.url
                          : uploaded.find((m) => m.kind === "image")?.url ?? "";

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
                        variants: variantsEnabled
                          ? {
                              colors,
                              sizes,
                            }
                          : undefined,
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
                  {uploading ? "Uploading..." : "Publish product"}
                </Button>

                {uploading && mediaFiles.length > 0 && (
                  <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">Uploading media...</span>
                      <span className="text-muted-foreground">
                        {mediaFiles.length - uploadingCount} / {mediaFiles.length} complete
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {mediaFiles.map((file) => {
                        const fileId = fileKey(file);
                        const progress = uploadProgress[fileId] || 0;
                        const isComplete = progress === 100;
                        
                        return (
                          <div key={fileId} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="truncate max-w-[200px] text-muted-foreground">
                                {file.name}
                              </span>
                              <span className={`font-medium ${isComplete ? 'text-green-600' : 'text-foreground'}`}>
                                {isComplete ? '✓' : `${progress}%`}
                              </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  isComplete ? 'bg-green-600' : 'bg-black'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Link to="/seller/products" className="block">
                  <Button variant="outline" className="w-full rounded-md">
                    Cancel
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
