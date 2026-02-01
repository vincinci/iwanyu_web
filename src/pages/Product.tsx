import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ShoppingCart, Star, Clock, Share, Heart, ChevronRight, Package, Truck, ShieldCheck } from "lucide-react";
import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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

  const [media, setMedia] = useState<ProductMedia[]>([]);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const product = useMemo(() => products.find((p) => p.id === productId), [products, productId]);
  const vendor = product?.vendorId ? getVendorById(product.vendorId) : undefined;

  // Track recently viewed
  useEffect(() => {
    if (productId) addToRecentlyViewed(productId);
  }, [productId, addToRecentlyViewed]);

  const galleryMedia = useMemo<ProductMedia[]>(() => {
    if (!product) return [];
    const fallback: ProductMedia[] = product.image
      ? [{ id: `primary-${product.id}`, kind: "image", url: product.image }]
      : [];
    const source = media.length > 0 ? media : fallback;
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
    return () => { cancelled = true; };
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

  const descriptionText = product.description?.trim() || "No description provided for this product.";
  const isLongDescription = descriptionText.length > 300;
  const displayDescription = showFullDescription ? descriptionText : descriptionText.slice(0, 300);

  return (
    <StorefrontPage>
      <div className="container min-h-screen py-6 lg:py-8">
        {/* Header: Title + Share/Save */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">{product.title}</h1>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-black underline underline-offset-2">
              <Share size={16} />
              Share
            </button>
            <button className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-black underline underline-offset-2">
              <Heart size={16} />
              Save
            </button>
          </div>
        </div>

        {/* Airbnb-style Photo Grid */}
        <div className="relative rounded-xl overflow-hidden mb-6">
          {galleryMedia.length >= 5 ? (
            <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[400px] md:h-[480px]">
              {/* Main large image */}
              <div className="col-span-2 row-span-2">
                <img
                  src={getOptimizedCloudinaryUrl(galleryMedia[0].url, { kind: "image", width: 1000 })}
                  alt={product.title}
                  className="w-full h-full object-cover rounded-l-xl cursor-pointer hover:brightness-90 transition"
                  onClick={() => setShowAllPhotos(true)}
                />
              </div>
              {/* Top right 2 images */}
              <div className="col-span-1 row-span-1">
                <img
                  src={getOptimizedCloudinaryUrl(galleryMedia[1].url, { kind: "image", width: 600 })}
                  alt=""
                  className="w-full h-full object-cover cursor-pointer hover:brightness-90 transition"
                  onClick={() => setShowAllPhotos(true)}
                />
              </div>
              <div className="col-span-1 row-span-1">
                <img
                  src={getOptimizedCloudinaryUrl(galleryMedia[2].url, { kind: "image", width: 600 })}
                  alt=""
                  className="w-full h-full object-cover rounded-tr-xl cursor-pointer hover:brightness-90 transition"
                  onClick={() => setShowAllPhotos(true)}
                />
              </div>
              {/* Bottom right 2 images */}
              <div className="col-span-1 row-span-1">
                <img
                  src={getOptimizedCloudinaryUrl(galleryMedia[3].url, { kind: "image", width: 600 })}
                  alt=""
                  className="w-full h-full object-cover cursor-pointer hover:brightness-90 transition"
                  onClick={() => setShowAllPhotos(true)}
                />
              </div>
              <div className="col-span-1 row-span-1 relative">
                <img
                  src={getOptimizedCloudinaryUrl(galleryMedia[4].url, { kind: "image", width: 600 })}
                  alt=""
                  className="w-full h-full object-cover rounded-br-xl cursor-pointer hover:brightness-90 transition"
                  onClick={() => setShowAllPhotos(true)}
                />
              </div>
            </div>
          ) : galleryMedia.length > 0 ? (
            <div className="h-[400px] md:h-[480px]">
              <img
                src={getOptimizedCloudinaryUrl(galleryMedia[0].url, { kind: "image", width: 1200 })}
                alt={product.title}
                className="w-full h-full object-cover rounded-xl cursor-pointer hover:brightness-90 transition"
                onClick={() => setShowAllPhotos(true)}
              />
            </div>
          ) : (
            <div className="h-[300px] bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
              No images available
            </div>
          )}

          {/* Show all photos button */}
          {galleryMedia.length > 1 && (
            <button
              onClick={() => setShowAllPhotos(true)}
              className="absolute bottom-4 right-4 bg-white px-4 py-2 rounded-lg text-sm font-medium border border-gray-900 hover:bg-gray-50 flex items-center gap-2 shadow-sm"
            >
              <div className="grid grid-cols-2 gap-0.5">
                <div className="w-1.5 h-1.5 bg-gray-900 rounded-sm" />
                <div className="w-1.5 h-1.5 bg-gray-900 rounded-sm" />
                <div className="w-1.5 h-1.5 bg-gray-900 rounded-sm" />
                <div className="w-1.5 h-1.5 bg-gray-900 rounded-sm" />
              </div>
              Show all photos
            </button>
          )}
        </div>

        {/* Photo Modal */}
        {showAllPhotos && (
          <div className="fixed inset-0 z-50 bg-white overflow-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <button onClick={() => setShowAllPhotos(false)} className="text-sm font-medium hover:underline">
                ← Close
              </button>
              <span className="text-sm text-gray-500">{galleryMedia.length} photos</span>
            </div>
            <div className="max-w-4xl mx-auto py-8 px-4 space-y-4">
              {galleryMedia.map((m, i) => (
                <img
                  key={m.id}
                  src={getOptimizedCloudinaryUrl(m.url, { kind: "image", width: 1200 })}
                  alt={`Photo ${i + 1}`}
                  className="w-full rounded-lg"
                />
              ))}
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Category & Vendor */}
            <div className="flex items-center justify-between pb-6 border-b">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {product.category}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {product.inStock ? "In stock" : "Out of stock"} · {product.reviewCount} reviews
                </p>
              </div>
              {vendor && (
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                    {vendor.name.charAt(0)}
                  </div>
                </div>
              )}
            </div>

            {/* Guest Favorite-style Badge */}
            <div className="border rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <span className="text-2xl">🏆</span>
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">Customer</span>
                    <span className="font-semibold text-sm">favorite</span>
                  </div>
                  <span className="text-2xl">🏆</span>
                </div>
                <span className="text-sm text-gray-600 max-w-[200px]">
                  One of the most loved products on iwanyu
                </span>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-lg font-semibold">{product.rating.toFixed(1)}</div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} fill={i < Math.floor(product.rating) ? "currentColor" : "none"} className="text-black" />
                    ))}
                  </div>
                </div>
                <div className="h-8 w-px bg-gray-200" />
                <div className="text-center">
                  <div className="text-lg font-semibold">{product.reviewCount}</div>
                  <div className="text-xs text-gray-500 underline">Reviews</div>
                </div>
              </div>
            </div>

            {/* Vendor Info */}
            {vendor && (
              <div className="flex items-center gap-4 py-6 border-b">
                <div className="h-10 w-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-medium text-sm">
                  {vendor.name.charAt(0)}
                </div>
                <div>
                  <div className="font-medium">Sold by {vendor.name}</div>
                  <div className="text-sm text-muted-foreground">Verified seller</div>
                </div>
              </div>
            )}

            {/* Features */}
            <div className="space-y-4 py-2">
              <div className="flex items-start gap-4">
                <Package size={24} className="text-gray-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Quality guaranteed</div>
                  <div className="text-sm text-muted-foreground">All products are verified for quality before shipping.</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Truck size={24} className="text-gray-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">{product.freeShipping ? "Free shipping" : "Fast delivery"}</div>
                  <div className="text-sm text-muted-foreground">
                    {product.freeShipping ? "This product ships for free across Rwanda." : "Delivery available to your location."}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <ShieldCheck size={24} className="text-gray-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Secure checkout</div>
                  <div className="text-sm text-muted-foreground">Your payment information is always protected.</div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div className="py-4">
              <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-line">
                {displayDescription}
                {isLongDescription && !showFullDescription && "..."}
              </p>
              {isLongDescription && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="mt-4 font-medium text-sm underline underline-offset-2 flex items-center gap-1 hover:text-gray-600"
                >
                  {showFullDescription ? "Show less" : "Show more"}
                  <ChevronRight size={16} className={showFullDescription ? "rotate-90" : ""} />
                </button>
              )}
            </div>
          </div>

          {/* Right Column - Sticky Purchase Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 border rounded-xl p-6 shadow-lg bg-white space-y-4">
              {/* Price */}
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold">{formatMoney(product.price)}</span>
                {typeof product.discountPercentage === "number" && product.discountPercentage > 0 && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatMoney(product.price * (1 + product.discountPercentage / 100))}
                  </span>
                )}
              </div>

              {/* Rating summary */}
              <div className="flex items-center gap-1 text-sm">
                <Star size={14} fill="currentColor" className="text-black" />
                <span className="font-medium">{product.rating.toFixed(2)}</span>
                <span className="text-muted-foreground">· {product.reviewCount} reviews</span>
              </div>

              <Separator />

              {/* Quantity selector placeholder */}
              <div className="border rounded-lg divide-y">
                <div className="p-3">
                  <div className="text-[10px] font-semibold text-gray-500 uppercase">QUANTITY</div>
                  <div className="text-sm">1 item</div>
                </div>
              </div>

              {/* Add to Cart button */}
              <Button
                className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-lg h-12 text-base font-medium"
                disabled={!product.inStock}
                onClick={() => {
                  addItem({ productId: product.id, title: product.title, price: product.price, image: product.image });
                  toast({ title: "Added to cart", description: `${product.title} has been added to your cart.` });
                }}
              >
                <ShoppingCart size={18} className="mr-2" />
                {product.inStock ? "Add to cart" : "Out of stock"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">You won't be charged yet</p>

              {/* Summary */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-sm">
                  <span className="underline">{formatMoney(product.price)} × 1</span>
                  <span>{formatMoney(product.price)}</span>
                </div>
                {product.freeShipping && (
                  <div className="flex justify-between text-sm">
                    <span className="underline">Shipping</span>
                    <span className="text-green-600">Free</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatMoney(product.price)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommended Products */}
        <div className="mt-16">
          <h2 className="mb-6 text-xl font-semibold text-foreground">You might also like</h2>
          {products.filter((p) => p.category === product.category && p.id !== product.id).length === 0 ? (
            <div className="rounded-lg border bg-gray-50 p-6 text-sm text-muted-foreground">
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

        {/* Recently Viewed */}
        {recentlyViewedIds.filter((id) => id !== product.id).length > 0 && (
          <div className="mt-16">
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
