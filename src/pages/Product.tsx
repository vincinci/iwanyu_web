import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { 
  ShoppingCart, Star, Clock, Share, Heart, ChevronRight, ChevronLeft, 
  Package, Truck, ShieldCheck, X, MapPin, Award, CheckCircle2
} from "lucide-react";
import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/context/cart";
import { useMarketplace } from "@/context/marketplace";
import { useRecentlyViewed } from "@/context/recentlyViewed";
import { useWishlist } from "@/context/wishlist";
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
  const { toggle: toggleWishlist, contains: isInWishlist } = useWishlist();
  const supabase = getSupabaseClient();

  const [media, setMedia] = useState<ProductMedia[]>([]);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const product = useMemo(() => products.find((p) => p.id === productId), [products, productId]);
  const vendor = product?.vendorId ? getVendorById(product.vendorId) : undefined;

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
    return source.filter((m) => {
      const key = `${m.kind}:${m.url}`;
      if (!m.url || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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
      setMedia(error ? [] : (data ?? []) as ProductMedia[]);
    }
    void load();
    return () => { cancelled = true; };
  }, [supabase, productId]);

  // Keyboard navigation for photo modal
  useEffect(() => {
    if (!showAllPhotos) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setCurrentImageIndex((prev) => (prev === 0 ? galleryMedia.length - 1 : prev - 1));
      if (e.key === "ArrowRight") setCurrentImageIndex((prev) => (prev === galleryMedia.length - 1 ? 0 : prev + 1));
      if (e.key === "Escape") setShowAllPhotos(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAllPhotos, galleryMedia.length]);

  if (!product) {
    return (
      <StorefrontPage>
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-semibold mb-2">Product not found</h1>
          <p className="text-muted-foreground mb-6">The product you're looking for doesn't exist.</p>
          <Link to="/">
            <Button variant="outline" className="rounded-full">Back to home</Button>
          </Link>
        </div>
      </StorefrontPage>
    );
  }

  const descriptionText = product.description?.trim() || "";
  const hasDescription = descriptionText.length > 0;
  const isLongDescription = descriptionText.length > 400;

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: product.title,
        text: product.description || `Check out ${product.title}`,
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied", description: "Product link copied to clipboard" });
    }
  };

  const handleSave = async () => {
    const inWishlist = isInWishlist(product.id);
    await toggleWishlist(product.id);
    toast({
      title: inWishlist ? "Removed" : "Saved",
      description: inWishlist ? `${product.title} removed from wishlist` : `${product.title} saved to wishlist`,
    });
  };

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({ productId: product.id, title: product.title, price: product.price, image: product.image });
    }
    toast({ title: "Added to cart", description: `${quantity}× ${product.title} added to your cart` });
  };

  return (
    <StorefrontPage>
      {/* Photo Modal */}
      {showAllPhotos && (
        <div className="fixed inset-0 z-50 bg-white">
          {/* Modal Header */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-white/95 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
            <button 
              onClick={() => setShowAllPhotos(false)} 
              className="flex items-center gap-2 text-sm font-medium hover:bg-gray-100 px-3 py-2 rounded-lg transition"
            >
              <X size={18} />
              Close
            </button>
            <span className="text-sm text-gray-500">{currentImageIndex + 1} / {galleryMedia.length}</span>
            <div className="flex items-center gap-2">
              <button onClick={handleShare} className="flex items-center gap-1.5 text-sm font-medium hover:bg-gray-100 px-3 py-2 rounded-lg transition">
                <Share size={16} /> Share
              </button>
              <button onClick={handleSave} className="flex items-center gap-1.5 text-sm font-medium hover:bg-gray-100 px-3 py-2 rounded-lg transition">
                <Heart size={16} fill={isInWishlist(product.id) ? "currentColor" : "none"} className={isInWishlist(product.id) ? "text-red-500" : ""} />
                Save
              </button>
            </div>
          </div>

          {/* Image Viewer */}
          <div className="h-full flex items-center justify-center pt-16 pb-24 px-4">
            <button
              onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? galleryMedia.length - 1 : prev - 1))}
              className="absolute left-4 md:left-8 h-12 w-12 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center shadow-lg border transition"
            >
              <ChevronLeft size={24} />
            </button>
            
            <img
              src={getOptimizedCloudinaryUrl(galleryMedia[currentImageIndex]?.url || "", { kind: "image", width: 1600 })}
              alt={`Photo ${currentImageIndex + 1}`}
              className="max-h-[calc(100vh-160px)] max-w-[calc(100vw-120px)] object-contain"
            />
            
            <button
              onClick={() => setCurrentImageIndex((prev) => (prev === galleryMedia.length - 1 ? 0 : prev + 1))}
              className="absolute right-4 md:right-8 h-12 w-12 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center shadow-lg border transition"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Thumbnail Strip */}
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t px-4 py-3">
            <div className="flex justify-center gap-2 overflow-x-auto">
              {galleryMedia.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setCurrentImageIndex(i)}
                  className={`shrink-0 h-14 w-14 rounded-lg overflow-hidden border-2 transition ${
                    i === currentImageIndex ? "border-black" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={getOptimizedCloudinaryUrl(m.url, { kind: "image", width: 100 })} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-6">
          <h1 className="text-2xl md:text-[26px] font-semibold leading-tight">{product.title}</h1>
          <div className="flex items-center gap-4 shrink-0">
            <button onClick={handleShare} className="flex items-center gap-1.5 text-sm font-medium underline underline-offset-2 hover:text-gray-600">
              <Share size={16} /> Share
            </button>
            <button onClick={handleSave} className="flex items-center gap-1.5 text-sm font-medium underline underline-offset-2 hover:text-gray-600">
              <Heart size={16} fill={isInWishlist(product.id) ? "currentColor" : "none"} className={isInWishlist(product.id) ? "text-red-500" : ""} />
              {isInWishlist(product.id) ? "Saved" : "Save"}
            </button>
          </div>
        </div>

        {/* Photo Grid */}
        <div className="relative rounded-2xl overflow-hidden mb-8">
          {galleryMedia.length >= 5 ? (
            <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[320px] sm:h-[400px] md:h-[500px]">
              <div className="col-span-2 row-span-2 cursor-pointer" onClick={() => { setCurrentImageIndex(0); setShowAllPhotos(true); }}>
                <img src={getOptimizedCloudinaryUrl(galleryMedia[0].url, { kind: "image", width: 1200 })} alt={product.title} className="w-full h-full object-cover rounded-l-2xl hover:brightness-95 transition" />
              </div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`cursor-pointer ${i === 2 ? "rounded-tr-2xl overflow-hidden" : ""} ${i === 4 ? "rounded-br-2xl overflow-hidden" : ""}`} onClick={() => { setCurrentImageIndex(i); setShowAllPhotos(true); }}>
                  <img src={getOptimizedCloudinaryUrl(galleryMedia[i]?.url || "", { kind: "image", width: 600 })} alt="" className="w-full h-full object-cover hover:brightness-95 transition" />
                </div>
              ))}
            </div>
          ) : galleryMedia.length > 0 ? (
            <div className="h-[320px] sm:h-[400px] md:h-[500px] cursor-pointer" onClick={() => { setCurrentImageIndex(0); setShowAllPhotos(true); }}>
              <img src={getOptimizedCloudinaryUrl(galleryMedia[0].url, { kind: "image", width: 1400 })} alt={product.title} className="w-full h-full object-cover rounded-2xl hover:brightness-95 transition" />
            </div>
          ) : (
            <div className="h-[300px] bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">No images available</div>
          )}

          {galleryMedia.length > 1 && (
            <button
              onClick={() => setShowAllPhotos(true)}
              className="absolute bottom-4 right-4 bg-white px-4 py-2 rounded-lg text-sm font-medium border border-black hover:bg-gray-50 flex items-center gap-2 shadow-sm"
            >
              <div className="grid grid-cols-2 gap-0.5">
                {[0,1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 bg-black rounded-[1px]" />)}
              </div>
              Show all photos
            </button>
          )}
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-3 gap-12 lg:gap-16">
          {/* Left Column */}
          <div className="lg:col-span-2">
            {/* Category & Stock */}
            <div className="flex items-start justify-between pb-6 border-b">
              <div>
                <h2 className="text-[22px] font-medium">{product.category}</h2>
                <p className="text-gray-500 mt-1">{product.inStock ? "In stock · Ready to ship" : "Out of stock"}</p>
              </div>
              {vendor && (
                <Link to={`/storefront/${vendor.id}`} className="shrink-0">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white font-bold text-xl shadow-md">
                    {vendor.name.charAt(0)}
                  </div>
                </Link>
              )}
            </div>

            {/* Rating Badge */}
            {product.reviewCount > 0 && (
              <div className="border rounded-xl p-5 my-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Award size={28} className="text-amber-500" />
                    <div className="ml-1">
                      <span className="text-sm font-semibold block leading-tight">Top</span>
                      <span className="text-sm font-semibold block leading-tight">rated</span>
                    </div>
                    <Award size={28} className="text-amber-500" />
                  </div>
                  <p className="text-sm text-gray-600 max-w-[180px]">Highly rated by our customers</p>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="text-xl font-semibold">{product.rating.toFixed(1)}</div>
                    <div className="flex gap-0.5 mt-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={12} fill={i < Math.round(product.rating) ? "currentColor" : "none"} className="text-black" />
                      ))}
                    </div>
                  </div>
                  <div className="h-10 w-px bg-gray-200" />
                  <div className="text-center">
                    <div className="text-xl font-semibold">{product.reviewCount}</div>
                    <div className="text-xs text-gray-500 underline cursor-pointer">Reviews</div>
                  </div>
                </div>
              </div>
            )}

            {/* Vendor Info */}
            {vendor && (
              <div className="flex items-center gap-4 py-6 border-b">
                <div className="h-12 w-12 rounded-full bg-gray-900 flex items-center justify-center text-white font-medium">
                  {vendor.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-[15px]">Sold by {vendor.name}</div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <CheckCircle2 size={14} className="text-green-500" /> Verified seller
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            <div className="py-6 space-y-5 border-b">
              <div className="flex gap-4">
                <Package size={26} className="text-gray-600 shrink-0" />
                <div>
                  <div className="font-medium">Quality guaranteed</div>
                  <div className="text-sm text-gray-500">Every product is verified for quality before shipping.</div>
                </div>
              </div>
              <div className="flex gap-4">
                <Truck size={26} className="text-gray-600 shrink-0" />
                <div>
                  <div className="font-medium">{product.freeShipping ? "Free shipping" : "Fast delivery"}</div>
                  <div className="text-sm text-gray-500">{product.freeShipping ? "Ships free anywhere in Rwanda." : "Delivered to your doorstep quickly."}</div>
                </div>
              </div>
              <div className="flex gap-4">
                <ShieldCheck size={26} className="text-gray-600 shrink-0" />
                <div>
                  <div className="font-medium">Secure checkout</div>
                  <div className="text-sm text-gray-500">Your payment information is protected.</div>
                </div>
              </div>
              {vendor?.location && (
                <div className="flex gap-4">
                  <MapPin size={26} className="text-gray-600 shrink-0" />
                  <div>
                    <div className="font-medium">Ships from {vendor.location}</div>
                    <div className="text-sm text-gray-500">Local seller, faster delivery times.</div>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {hasDescription && (
              <div className="py-6 border-b">
                <p className="text-[15px] leading-relaxed whitespace-pre-line">
                  {showFullDescription || !isLongDescription ? descriptionText : descriptionText.slice(0, 400) + "..."}
                </p>
                {isLongDescription && (
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="mt-4 font-medium text-sm underline underline-offset-2 flex items-center gap-1"
                  >
                    {showFullDescription ? "Show less" : "Show more"} <ChevronRight size={16} className={showFullDescription ? "rotate-90 transition" : "transition"} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Sticky Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 border rounded-xl p-6 shadow-xl bg-white">
              {/* Price */}
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[22px] font-semibold">{formatMoney(product.price)}</span>
                {typeof product.discountPercentage === "number" && product.discountPercentage > 0 && (
                  <span className="text-sm text-gray-400 line-through">{formatMoney(product.price * (1 + product.discountPercentage / 100))}</span>
                )}
              </div>

              {/* Rating */}
              {product.reviewCount > 0 ? (
                <div className="flex items-center gap-1 text-sm mb-4">
                  <Star size={14} fill="currentColor" className="text-black" />
                  <span className="font-medium">{product.rating.toFixed(2)}</span>
                  <span className="text-gray-500">· {product.reviewCount} reviews</span>
                </div>
              ) : (
                <div className="text-sm text-gray-500 mb-4">No reviews yet</div>
              )}

              {/* Quantity Selector */}
              <div className="border rounded-lg mb-4">
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Quantity</div>
                    <div className="text-sm font-medium">{quantity} {quantity === 1 ? "item" : "items"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-gray-50 transition">−</button>
                    <span className="w-6 text-center font-medium">{quantity}</span>
                    <button onClick={() => setQuantity(quantity + 1)} className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-gray-50 transition">+</button>
                  </div>
                </div>
              </div>

              {/* Add to Cart */}
              <Button
                className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-black rounded-lg h-12 text-base font-semibold shadow-md"
                disabled={!product.inStock}
                onClick={handleAddToCart}
              >
                <ShoppingCart size={18} className="mr-2" />
                {product.inStock ? "Add to cart" : "Out of stock"}
              </Button>

              <p className="text-center text-xs text-gray-400 mt-2">You won't be charged yet</p>

              {/* Price Breakdown */}
              <div className="mt-5 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="underline text-gray-600">{formatMoney(product.price)} × {quantity}</span>
                  <span>{formatMoney(product.price * quantity)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="underline text-gray-600">Shipping</span>
                  <span className={product.freeShipping ? "text-green-600" : ""}>{product.freeShipping ? "Free" : "TBD"}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span>{formatMoney(product.price * quantity)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        <div className="mt-16 pt-8 border-t">
          <h2 className="text-xl font-semibold mb-6">You might also like</h2>
          {products.filter((p) => p.category === product.category && p.id !== product.id).length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 12).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No similar products available.</p>
          )}
        </div>

        {/* Recently Viewed */}
        {recentlyViewedIds.filter((id) => id !== product.id).length > 0 && (
          <div className="mt-16 pt-8 border-t">
            <div className="flex items-center gap-2 mb-6">
              <Clock size={20} className="text-gray-500" />
              <h2 className="text-xl font-semibold">Recently viewed</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {recentlyViewedIds.filter((id) => id !== product.id).slice(0, 6).map((id) => {
                const p = products.find((pr) => pr.id === id);
                return p ? <ProductCard key={p.id} product={p} /> : null;
              })}
            </div>
          </div>
        )}
      </div>
    </StorefrontPage>
  );
}
