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
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden rounded-xl bg-white transition-all duration-300 hover:shadow-lg">
        
        {/* Image Container - Airbnb style */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100">
          {image ? (
            <img
              src={getOptimizedCloudinaryUrl(image, { kind: "image", width: 600 })}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100">
              <span className="text-xs text-gray-400">No Image</span>
            </div>
          )}
          
          {/* Discount badge */}
          {typeof discountPercentage === "number" && discountPercentage > 0 ? (
            <div className="absolute left-3 top-3 rounded-md bg-white px-2 py-1 text-xs font-semibold text-black shadow-sm">
              -{discountPercentage}%
            </div>
          ) : null}

          {/* Favorite button */}
          <button
            type="button"
            onClick={handleToggleFavorite}
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm transition-all duration-200 hover:scale-110 hover:bg-white"
            aria-label={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart size={16} className={isFavorite ? "fill-current text-red-500" : ""} />
          </button>
          
          {/* Add to cart button - appears on hover */}
          <button
            onClick={handleAddToCart}
            disabled={!inStock}
            className={`absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-400/50 transition-all duration-200 hover:scale-110 hover:shadow-orange-400/70 disabled:opacity-50 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
            title="Add to cart"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>
        
        {/* Product Info */}
        <div className="pt-3 pb-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-[15px] font-medium text-gray-900">
              {title}
            </h3>
            <div className="flex items-center gap-1 text-sm shrink-0">
              <Star size={12} className="fill-current text-black" />
              <span className="font-medium">{rating.toFixed(1)}</span>
            </div>
          </div>

          <p className="mt-0.5 text-sm text-gray-500">
            {soldCount} sold · by iwanyu
          </p>
          
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-[15px] font-semibold text-gray-900">{formatMoney(price)}</span>
            {!inStock && (
              <span className="text-xs text-red-500">Out of stock</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};
