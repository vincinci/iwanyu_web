import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star, ShoppingCart, Check, Plus } from 'lucide-react';
import { Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/context/cart';
import { useMarketplace } from '@/context/marketplace';
import { useWishlist } from '@/context/wishlist';
import { formatMoney } from '@/lib/money';
import { Badge } from '@/components/ui/badge';
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
      variant: "success" as any,
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
        variant: result.added ? "success" as any : "default",
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
      className="group block relative bg-white transition-all hover:bg-white"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative border border-gray-100 hover:border-black transition-colors duration-200 rounded-xl overflow-hidden">
        
        {/* Discount Badge - Sharp, Rectangular */}
        {typeof discountPercentage === "number" && discountPercentage > 0 ? (
            <div className="absolute left-0 top-0 z-10 bg-iwanyu-primary text-black font-bold text-xs px-2 py-1 uppercase tracking-wider rounded-br-lg">
              -{discountPercentage}%
            </div>
          ) : null}

        {/* Product Image - Square Aspect Ratio */}
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          {image ? (
            <img
              src={getOptimizedCloudinaryUrl(image, { kind: "image", width: 600, quality: 85 })}
              alt={title}
              className="absolute inset-0 h-full w-full object-cover mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100">
               <span className="text-xs text-gray-400">No Image</span>
            </div>
          )}
          
          {/* Quick Add Button - Floating Circle on Hover */}
           <button 
              onClick={handleAddToCart}
              disabled={!inStock}
              className={`absolute bottom-3 right-3 h-10 w-10 bg-black text-white flex items-center justify-center transition-all duration-300 rounded-full ${
                isHovered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              } hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed`}
              title="Add to Cart"
            >
              <Plus size={20} strokeWidth={3} />
            </button>
        </div>
        
        {/* Product Details - Dense Layout */}
        <div className="p-3">
          
          {/* Price - Huge & Bold */}
          <div className="flex items-baseline gap-2 mb-1">
             <span className="text-lg font-black text-iwanyu-primary tracking-tight">
              {formatMoney(price)}
            </span>
             {discountPercentage && discountPercentage > 0 && (
                 <span className="text-xs text-gray-400 line-through">
                     {formatMoney(price * (1 + discountPercentage / 100))}
                 </span>
             )}
          </div>

          <h3 className="mb-1 text-xs font-normal text-black line-clamp-2 min-h-[2.5em] leading-tight">
            {title}
          </h3>

           <div className="flex items-center gap-2 mb-1">
                {/* Rating - Compact */}
                <div className="flex items-center">
                    <Star size={10} className="fill-black text-black" />
                    <span className="ml-0.5 text-xs font-bold text-black">{rating.toFixed(1)}</span>
                </div>
                 <div className="h-2 w-px bg-gray-300"></div>
                 {/* Sold Count - AliExpress Style */}
                <span className="text-xs text-gray-500">{soldCount} sold</span>
           </div>
           
           <div className="flex flex-wrap gap-1 mt-2">
                {freeShipping && (
                    <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1 py-0.5 uppercase">Free Shipping</span>
                )}
                {vendorName && (
                     <span className="text-[10px] text-gray-400 truncate max-w-[100px]">{vendorName}</span>
                )}
           </div>
        </div>
      </div>
    </Link>
  );
};
