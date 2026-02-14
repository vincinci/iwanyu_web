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
import { useLanguage } from "@/context/languageContext";
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
  const { t } = useLanguage();
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
        toast({ title: t("sellerNew.unsupportedFile"), description: f.name, variant: "destructive" });
        continue;
      }
      if (f.size > maxBytes) {
        toast({
          title: t("sellerNew.fileTooLarge"),
          description: `${f.name} ${t("sellerNew.exceedsUploadLimit")}`,
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
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="container py-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t("sellerNew.createProduct")}</h1>
            <p className="text-sm text-muted-foreground">{t("sellerNew.fastSetup")}</p>
          </div>
          <div className="shrink-0">
            <Link to="/seller/products">
              <Button variant="outline">{t("sellerNew.back")}</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container py-8 max-w-4xl">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base font-medium">{t("sellerNew.basics")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
            {!isAdmin && vendorOptions.length === 0 ? (
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
                <div className="font-medium text-foreground">{t("sellerNew.noApprovedStore")}</div>
                <div className="mt-1 text-muted-foreground">{t("sellerNew.submitVendorApplication")}</div>
                <div className="mt-3">
                  <Link to="/sell">
                    <Button variant="outline" className="rounded-md">{t("sellerNew.goToOnboarding")}</Button>
                  </Link>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground">{t("sellerNew.vendor")}</div>
                <Select value={vendorId} onValueChange={(v) => setVendorId(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t("sellerNew.chooseVendor")} />
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
                  <div className="mt-2 text-xs text-muted-foreground">{t("sellerNew.noStoreYet")}</div>
                ) : null}
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground">{t("sellerNew.orCreateVendor")}</div>
                <Input
                  className="mt-1"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder={t("sellerNew.vendorName")}
                />
                {!isAdmin ? (
                  <div className="mt-2 text-xs text-muted-foreground">{t("sellerNew.vendorRequiresApproval")}</div>
                ) : null}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("sellerNew.title")}</div>
              <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("sellerNew.titlePlaceholder")} />
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("sellerNew.description")}</div>
              <Textarea
                className="mt-1"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("sellerNew.descriptionPlaceholder")}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <div className="text-sm font-medium text-muted-foreground">{t("sellerNew.category")}</div>
                {categoryOptions.length === 0 ? (
                  <div className="mt-1 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                    {t("sellerNew.noCategories")}
                  </div>
                ) : (
                  <Select value={category} onValueChange={(v) => setCategory(v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t("sellerNew.selectCategory")} />
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
                <div className="text-sm font-medium text-muted-foreground">{t("sellerNew.priceRwf")}</div>
                <Input className="mt-1" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">{t("sellerNew.stock")}</div>
                <Select value={inStock ? "in" : "out"} onValueChange={(v) => setInStock(v === "in")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">{t("seller.inStock")}</SelectItem>
                    <SelectItem value="out">{t("seller.out")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("sellerNew.discountPercent")}</div>
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
                <CardTitle className="text-base font-medium">{t("sellerNew.media")}</CardTitle>
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
                      <div className="text-sm font-medium text-foreground">{t("sellerNew.imagesVideos")}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t("sellerNew.dragDrop")} {MAX_MEDIA_FILES}. {t("sellerNew.imagesMax")} {Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB, {t("sellerNew.videosMax")} {Math.round(MAX_VIDEO_BYTES / 1024 / 1024)}MB.
                      </div>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted transition-colors">
                      <ImagePlus size={16} />
                      <span>{t("sellerNew.addMedia")}</span>
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
                            title={t("sellerNew.setAsPrimary")}
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
                              <Badge variant="secondary" className="bg-background/90">{t("sellerNew.primary")}</Badge>
                            ) : null}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setMediaFiles((prev) => prev.filter((f) => fileKey(f) !== p.id));
                            }}
                            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md bg-background/90 text-muted-foreground shadow-sm hover:text-foreground"
                            aria-label={t("sellerNew.removeMedia")}
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
                  <div className="text-xs text-muted-foreground">{t("sellerNew.noMediaYet")}</div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base font-medium">{t("sellerNew.variants")}</CardTitle>
                  <button
                    type="button"
                    onClick={() => setVariantsEnabled((v) => !v)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {variantsEnabled ? t("sellerNew.disable") : t("sellerNew.enable")}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="text-sm text-muted-foreground">
                  {t("sellerNew.variantsHelp")}
                </div>

                {variantsEnabled ? (
                  <>
                    <div>
                      <div className="text-sm font-medium text-foreground">{t("sellerNew.colors")}</div>
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
                          placeholder={t("sellerNew.addColorPlaceholder")}
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
                      <div className="text-sm font-medium text-foreground">{t("sellerNew.sizes")}</div>
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
                        <Input value={newSize} onChange={(e) => setNewSize(e.target.value)} placeholder={t("sellerNew.addSizePlaceholder")} />
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
                    {t("sellerNew.variantsDisabled")}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4">
            <Card className="border-border lg:sticky lg:top-24">
              <CardHeader>
                <CardTitle className="text-base font-medium">{t("sellerNew.readyToPublish")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {canSubmit ? (
                    <span className="inline-flex items-center gap-2 text-foreground">
                      <CheckCircle2 size={16} className="text-green-600" /> {t("sellerNew.looksGood")}
                    </span>
                  ) : (
                    t("sellerNew.publishChecklist")
                  )}
                </div>

                <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("sellerNew.media")}</span>
                    <span className="text-foreground">{mediaFiles.length}/{MAX_MEDIA_FILES}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-muted-foreground">{t("sellerNew.variants")}</span>
                    <span className="text-foreground">{variantsEnabled ? `${colors.length} ${t("sellerNew.colorsLower")} · ${sizes.length} ${t("sellerNew.sizesLower")}` : t("sellerNew.off")}</span>
                  </div>
                </div>

                <Button
                  className="w-full rounded-md"
                  disabled={!canSubmit || uploading || (!isAdmin && vendorOptions.length === 0)}
                  onClick={async () => {
                    try {
                      if (!supabase) throw new Error(t("admin.supabaseMissing"));
                      if (!user) throw new Error(t("admin.notSignedIn"));
                      if (categoryOptions.length === 0) throw new Error(t("sellerNew.noCategories"));
                      if (!category.trim()) throw new Error(t("sellerNew.selectCategoryError"));

                      let resolvedVendorId = vendorId;
                      if (!resolvedVendorId && vendorName.trim().length >= 2) {
                        if (!isAdmin) throw new Error(t("sellerNew.vendorCreationRequiresApproval"));
                        const created = await createVendor({
                          name: vendorName.trim(),
                          location: "Kigali, Rwanda",
                          ownerUserId: user?.id,
                          verified: false,
                        });
                        resolvedVendorId = created.id;
                      }

                      if (!resolvedVendorId) throw new Error(t("sellerNew.missingVendor"));

                      setUploading(true);
                      setUploadProgress({});
                      setUploadingCount(mediaFiles.length);

                      const { data } = await supabase.auth.getSession();
                      const accessToken = data.session?.access_token;
                      if (!accessToken) throw new Error(t("sellerNew.missingSession"));

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

                      toast({ title: t("sellerNew.productUploaded"), description: t("sellerNew.productLive") });
                      navigate("/seller/products");
                    } catch (e) {
                      toast({
                        title: t("sellerNew.uploadFailed"),
                        description: e instanceof Error ? e.message : t("seller.unknownError"),
                        variant: "destructive",
                      });
                    } finally {
                      setUploading(false);
                    }
                  }}
                >
                  {uploading ? t("sellerNew.uploading") : t("sellerNew.publishProduct")}
                </Button>

                {uploading && mediaFiles.length > 0 && (
                  <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{t("sellerNew.uploadingMedia")}</span>
                      <span className="text-muted-foreground">
                        {mediaFiles.length - uploadingCount} / {mediaFiles.length} {t("sellerNew.complete")}
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
                    {t("admin.cancel")}
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
