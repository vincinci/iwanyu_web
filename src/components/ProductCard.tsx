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
    category,
    image,
    discountPercentage,
    inStock,
    freeShipping
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
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden rounded-lg border border-border bg-card transition-shadow duration-200 hover:shadow-sm">
        
        {typeof discountPercentage === "number" && discountPercentage > 0 ? (
          <div className="absolute left-2 top-2 z-10 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground">
            -{discountPercentage}%
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleToggleFavorite}
          className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm transition-colors hover:text-foreground"
          aria-label={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart size={16} className={isFavorite ? "fill-current text-foreground" : ""} />
        </button>

        <div className="relative aspect-square overflow-hidden bg-muted">
          {image ? (
            <img
              src={getOptimizedCloudinaryUrl(image, { kind: "image", width: 600, quality: 85 })}
              alt={title}
              className="absolute inset-0 h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100">
               <span className="text-xs text-gray-400">No Image</span>
            </div>
          )}
          
          <button
            onClick={handleAddToCart}
            disabled={!inStock}
            className={`absolute bottom-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-background text-foreground shadow-sm transition-all duration-200 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
            title="Add to cart"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>
        
        <div className="p-3">
          
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-base font-semibold text-foreground">{formatMoney(price)}</span>
            {!inStock ? (
              <span className="text-[11px] text-muted-foreground">Out of stock</span>
            ) : null}
          </div>

          <h3 className="mt-1 line-clamp-2 min-h-[2.5em] text-sm text-foreground leading-snug">
            {title}
          </h3>

          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1 text-foreground">
              <Star size={12} className="fill-current" />
              <span className="font-medium">{rating.toFixed(1)}</span>
            </div>
            <span className="text-muted-foreground">·</span>
            <span>{soldCount} sold</span>
          </div>
           
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {freeShipping ? (
              <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Free shipping</span>
            ) : null}
            {vendorName ? (
              <span className="truncate text-[11px] text-muted-foreground max-w-[140px]">{vendorName}</span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
};
