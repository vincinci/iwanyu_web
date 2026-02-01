import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star, Plus } from 'lucide-react';
import { Product } from '@/types/product';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/context/cart';
import { useMarketplace } from '@/context/marketplace';
import { useWishlist } from '@/context/wishlist';
import { formatMoney } from '@/lib/money';
import { getOptimizedCloudinaryUrl } from '@/lib/cloudinary';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const { toast } = useToast();
  const { addItem } = useCart();
  const { getVendorById } = useMarketplace();
  const { contains, toggle } = useWishlist();

  const {
    id,
    vendorId,
    title,
    price,
    rating,
    reviewCount,
    image,
    discountPercentage,
    inStock
  } = product;

  const vendorName = vendorId ? getVendorById(vendorId)?.name : undefined;
  const isFavorite = contains(id);
  const soldCount = Math.max(reviewCount * 7 + 12, 5); // Mock sold count based on reviews

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({ productId: id, title, price, image });
    toast({
      title: "✓ Added to cart",
      description: `${title} has been added to your cart.`,
      variant: "default",
    });
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const result = await toggle(id);
      toast({
        title: result.added ? "♥ Added to wishlist" : "Removed from wishlist",
        description: `${title} has been ${result.added ? "added to" : "removed from"} your wishlist.`,
        variant: "default",
      });
    } catch {
      toast({
        title: "⚠ Wishlist update failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Link
      to={`/product/${id}`}
      className="group block animate-in fade-in slide-in-from-bottom-4 duration-500"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:border-gray-300 hover:-translate-y-1">
        
        {typeof discountPercentage === "number" && discountPercentage > 0 ? (
          <div className="absolute left-2 top-2 z-10 rounded-full bg-gradient-to-r from-red-600 to-pink-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg animate-pulse">
            -{discountPercentage}%
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleToggleFavorite}
          className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 backdrop-blur-sm text-gray-600 shadow-lg transition-all duration-300 hover:text-red-600 hover:scale-110 hover:rotate-12 active:scale-95"
          aria-label={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart size={17} className={isFavorite ? "fill-current text-red-600 animate-pulse" : ""} />
        </button>

        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
          {image ? (
            <>
              <img
                src={getOptimizedCloudinaryUrl(image, { kind: "image", width: 600 })}
                alt={title}
                className="absolute inset-0 h-full w-full object-contain p-4 transition-all duration-500 group-hover:scale-110 group-hover:rotate-1"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/0 to-transparent group-hover:via-white/20 transition-all duration-700 opacity-0 group-hover:opacity-100" />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100">
               <span className="text-xs text-gray-400">No Image</span>
            </div>
          )}
          
          <button
            onClick={handleAddToCart}
            disabled={!inStock}
            className={`absolute bottom-3 right-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-black to-gray-800 text-white shadow-xl transition-all duration-300 hover:scale-110 hover:rotate-90 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${
              isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            title="Add to cart"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>
        
        <div className="p-3">
          
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-lg font-bold bg-gradient-to-r from-black to-gray-600 bg-clip-text text-transparent group-hover:from-purple-600 group-hover:to-pink-600 transition-all duration-300">{formatMoney(price)}</span>
            {!inStock ? (
              <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Out of stock</span>
            ) : null}
          </div>

          <h3 className="mt-2 line-clamp-2 min-h-[2.5em] text-sm font-medium text-foreground leading-snug group-hover:text-black transition-colors">
            {title}
          </h3>

          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1 text-yellow-500 group-hover:scale-110 transition-transform">
              <Star size={13} className="fill-current drop-shadow-sm" />
              <span className="font-bold text-foreground">{rating.toFixed(1)}</span>
            </div>
            <span className="text-muted-foreground">·</span>
            <span>{soldCount} sold</span>
          </div>
           
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="truncate text-[11px] font-medium text-muted-foreground">
              by <span className="text-foreground">iwanyu</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};
