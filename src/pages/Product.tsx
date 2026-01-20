import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ShoppingCart, Star, Clock } from "lucide-react";
import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/context/cart";
import { useMarketplace } from "@/context/marketplace";
import { useRecentlyViewed } from "@/context/recentlyViewed";
import { formatMoney } from "@/lib/money";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { getOptimizedCloudinaryUrl } from "@/lib/cloudinary";
import { ProductCard } from "@/components/ProductCard";

type ProductMedia = {
  id: string;
  kind: "image" | "video";
  url: string;
};

export default function ProductPage() {
  const { productId } = useParams();
  const { toast } = useToast();
  const { addItem } = useCart();
  const { products, getVendorById } = useMarketplace();
  const { add: addToRecentlyViewed, productIds: recentlyViewedIds } = useRecentlyViewed();
  const supabase = getSupabaseClient();

  // Track recently viewed products
  useEffect(() => {
    if (productId) {
      addToRecentlyViewed(productId);
    }
  }, [productId, addToRecentlyViewed]);

  const [media, setMedia] = useState<ProductMedia[]>([]);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);

  const product = useMemo(() => products.find((p) => p.id === productId), [products, productId]);

  const vendor = product?.vendorId ? getVendorById(product.vendorId) : undefined;

  const galleryMedia = useMemo<ProductMedia[]>(() => {
    if (!product) return [];

    const fallback: ProductMedia[] = product.image
      ? [{ id: `primary-${product.id}`, kind: "image", url: product.image }]
      : [];

    const source = media.length > 0 ? media : fallback;

    // De-dupe by kind+url to avoid repeated thumbnails.
    const seen = new Set<string>();
    const deduped: ProductMedia[] = [];
    for (const m of source) {
      const key = `${m.kind}:${m.url}`;
      if (!m.url || seen.has(key)) continue;
      seen.add(key);
      deduped.push(m);
    }

    return deduped;
  }, [media, product]);

  useEffect(() => {
    if (galleryMedia.length === 0) {
      setSelectedMediaId(null);
      return;
    }
    if (selectedMediaId && galleryMedia.some((m) => m.id === selectedMediaId)) return;
    setSelectedMediaId(galleryMedia[0].id);
  }, [galleryMedia, selectedMediaId]);

  const selectedMedia = useMemo(() => {
    if (!galleryMedia.length) return null;
    if (!selectedMediaId) return galleryMedia[0];
    return galleryMedia.find((m) => m.id === selectedMediaId) ?? galleryMedia[0];
  }, [galleryMedia, selectedMediaId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase || !productId) return;
      const { data, error } = await supabase
        .from("product_media")
        .select("id, kind, url")
        .eq("product_id", productId)
        .order("position", { ascending: true });

      if (cancelled) return;
      if (error) {
        setMedia([]);
        return;
      }
      setMedia((data ?? []) as ProductMedia[]);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [supabase, productId]);

  if (!product) {
    return (
      <StorefrontPage>
        <div className="container py-10">
          <h1 className="text-2xl font-semibold text-foreground">Product not found</h1>
          <Link to="/" className="mt-2 inline-block text-sm text-muted-foreground hover:text-foreground">
            Back to home
          </Link>
        </div>
      </StorefrontPage>
    );
  }

  return (
    <StorefrontPage>
      <div className="container min-h-screen py-10 lg:py-12">
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/category/${product.category.toLowerCase().replace(/\s+/g, "-")}`}>{product.category}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{product.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <Card className="overflow-hidden border-border">
              <CardContent className="p-0">
                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-center rounded-xl border border-border bg-background p-4">
                    {selectedMedia?.kind === "video" ? (
                      <video
                        className="h-[340px] w-full max-w-[560px] rounded-lg object-contain"
                        controls
                        preload="metadata"
                        src={getOptimizedCloudinaryUrl(selectedMedia.url, { kind: "video", width: 1000 })}
                      />
                    ) : selectedMedia?.url ? (
                      <img
                        src={getOptimizedCloudinaryUrl(selectedMedia.url, { kind: "image", width: 1000 })}
                        alt={product.title}
                        className="h-[340px] w-full max-w-[560px] object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-[320px] w-full items-center justify-center text-sm text-muted-foreground">
                        No media
                      </div>
                    )}
                  </div>

                  {galleryMedia.length > 1 ? (
                    <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {galleryMedia.slice(0, 12).map((m) => {
                        const isSelected = m.id === selectedMediaId;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSelectedMediaId(m.id)}
                            className={
                              "overflow-hidden rounded-lg border bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
                              (isSelected ? "border-primary" : "border-border hover:border-primary/60")
                            }
                            aria-label={m.kind === "image" ? "View image" : "View video"}
                          >
                            {m.kind === "image" ? (
                              <img
                                src={getOptimizedCloudinaryUrl(m.url, { kind: "image", width: 240 })}
                                alt=""
                                className="h-14 w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-14 items-center justify-center text-xs text-muted-foreground">
                                Video
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-5">
            <Card className="border-border lg:sticky lg:top-24">
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  {product.inStock ? <Badge variant="secondary">In stock</Badge> : <Badge variant="destructive">Out of stock</Badge>}
                  {typeof product.discountPercentage === "number" && product.discountPercentage > 0 ? (
                    <Badge variant="outline">Save {product.discountPercentage}%</Badge>
                  ) : null}
                </div>

                <CardTitle className="mt-3 text-[22px] leading-snug text-foreground sm:text-2xl">
                  {product.title}
                </CardTitle>

                {vendor?.name ? (
                  <div className="mt-2 text-sm text-muted-foreground">by {vendor.name}</div>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => {
                      const filled = i < Math.floor(product.rating);
                      return (
                        <Star
                          key={i}
                          size={16}
                          className={filled ? "text-primary" : "text-muted-foreground"}
                          fill={filled ? "currentColor" : "none"}
                        />
                      );
                    })}
                    <span className="ml-1 text-muted-foreground">({product.reviewCount})</span>
                  </div>

                  <span className="text-muted-foreground">·</span>

                  <div className="text-muted-foreground">{product.category}</div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="flex items-end justify-between">
                  <div className="text-3xl font-semibold text-foreground">{formatMoney(product.price)}</div>
                  {product.freeShipping ? <Badge variant="secondary">Free shipping</Badge> : null}
                </div>

                {typeof product.discountPercentage === "number" && product.discountPercentage > 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Was {formatMoney(product.price * (1 + product.discountPercentage / 100))}
                  </div>
                ) : null}

                <Separator />

                <div className="grid gap-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-muted-foreground">Vendor</div>
                    <div className="font-medium text-foreground">{vendor?.name ?? "—"}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-muted-foreground">Shipping</div>
                    <div className="font-medium text-foreground">
                      {product.freeShipping ? "Free" : "Calculated at checkout"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    className="w-full"
                    disabled={!product.inStock}
                    onClick={() => {
                      addItem({ productId: product.id, title: product.title, price: product.price, image: product.image });
                      toast({ title: "Added to cart", description: `${product.title} has been added to your cart.` });
                    }}
                  >
                    <ShoppingCart size={18} className="mr-2" />
                    {product.inStock ? "Add to cart" : "Out of stock"}
                  </Button>
                  <Link to="/cart">
                    <Button variant="outline" className="w-full">
                      View cart
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-xl">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {product.description?.trim() ? product.description : "No description provided."}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-5">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-xl">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="text-muted-foreground">Availability</div>
                  <div className="font-medium text-foreground">{product.inStock ? "In stock" : "Out of stock"}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-muted-foreground">Category</div>
                  <div className="font-medium text-foreground">{product.category}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-14">
          <h2 className="mb-6 text-xl font-semibold text-foreground">Recommended Products</h2>
          {products.filter((p) => p.category === product.category && p.id !== product.id).length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
              No recommendations available right now.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {products
                .filter((p) => p.category === product.category && p.id !== product.id)
                .slice(0, 12)
                .map((relatedProduct) => (
                  <ProductCard key={relatedProduct.id} product={relatedProduct} />
                ))}
            </div>
          )}
        </div>

        {/* Recently Viewed Products */}
        {recentlyViewedIds.filter((id) => id !== product.id).length > 0 && (
          <div className="mt-14">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground">Recently Viewed</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {recentlyViewedIds
                .filter((id) => id !== product.id)
                .slice(0, 6)
                .map((id) => products.find((p) => p.id === id))
                .filter(Boolean)
                .map((recentProduct) => (
                  <ProductCard key={recentProduct!.id} product={recentProduct!} />
                ))}
            </div>
          </div>
        )}
      </div>
    </StorefrontPage>
  );
}
