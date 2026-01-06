
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star, ShoppingCart, Check } from 'lucide-react';
import { Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/context/cart';
import { useMarketplace } from '@/context/marketplace';
import { formatMoney } from '@/lib/money';
import { Badge } from '@/components/ui/badge';
import { getOptimizedCloudinaryUrl } from '@/lib/cloudinary';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const { toast } = useToast();
  const { addItem } = useCart();
  const { getVendorById } = useMarketplace();

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

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({ productId: id, title, price, image });
    toast({
      title: "Added to cart",
      description: `${title} has been added to your cart.`,
    });
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    toast({
      title: isFavorite ? "Removed from wishlist" : "Added to wishlist",
      description: `${title} has been ${isFavorite ? "removed from" : "added to"} your wishlist.`,
    });
  };

  return (
    <Link
      to={`/product/${id}`}
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden rounded-2xl border border-iwanyu-border/60 bg-white shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:border-iwanyu-primary/20">
        {/* Product Image */}
        <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
          {image ? (
            <img
              src={getOptimizedCloudinaryUrl(image, { kind: "image", width: 800, quality: 85 })}
              alt={title}
              className="absolute inset-0 h-full w-full object-contain transition-all duration-700 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <div className="text-center">
                <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                  <svg className="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                </div>
                <span className="text-xs text-gray-500 font-medium">No image available</span>
              </div>
            </div>
          )}

          {/* Discount Badge */}
          {typeof discountPercentage === "number" && discountPercentage > 0 ? (
            <div className="absolute left-3 top-3 z-10">
              <Badge className="bg-red-500 text-white font-bold text-xs px-2 py-1 rounded-full shadow-lg">
                -{discountPercentage}%
              </Badge>
            </div>
          ) : null}
          
          {/* Favorite Button */}
          <button
            className={`absolute right-3 top-3 z-10 rounded-full p-2 backdrop-blur-sm transition-all duration-200 ${
              isFavorite 
                ? 'bg-red-500/90 text-white shadow-lg transform scale-110' 
                : 'bg-white/90 text-gray-600 hover:bg-red-50 hover:text-red-500 shadow-md hover:shadow-lg hover:scale-110'
            }`}
            onClick={handleToggleFavorite}
            aria-label={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart size={16} fill={isFavorite ? "currentColor" : "none"} strokeWidth={2} />
          </button>
          
          {/* Quick Add to Cart - Shows on Hover */}
          <div 
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent p-4 pt-12 transition-all duration-300 ${
              isHovered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
            }`}
          >
            <Button 
              onClick={handleAddToCart}
              disabled={!inStock}
              className={`w-full rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                inStock 
                  ? 'bg-iwanyu-primary text-white hover:bg-iwanyu-primary/90 shadow-lg' 
                  : 'bg-gray-500 text-gray-300 cursor-not-allowed'
              }`}
            >
              <ShoppingCart size={16} className="mr-2" />
              {inStock ? 'Add to Cart' : 'Out of Stock'}
            </Button>
          </div>
        </div>
        
        {/* Product Details */}
        <div className="p-5">
          <h3 className="mb-3 text-base font-semibold text-iwanyu-foreground line-clamp-2 leading-tight group-hover:text-iwanyu-primary transition-colors duration-200">
            {title}
          </h3>

          {vendorName ? (
            <div className="mb-3 text-sm text-gray-600 font-medium">by {vendorName}</div>
          ) : null}
          
          {/* Category and Rating Row */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {category ? (
                <Badge variant="secondary" className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  {category}
                </Badge>
              ) : null}
            </div>
            
            {/* Rating */}
            <div className="flex items-center">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={i < Math.floor(rating) ? "fill-amber-400 text-amber-400" : "text-gray-300"}
                    fill={i < Math.floor(rating) ? "currentColor" : "none"}
                  />
                ))}
              </div>
              <span className="ml-1.5 text-xs text-gray-500 font-medium">({reviewCount})</span>
            </div>
          </div>
          
          {/* Price */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xl font-bold text-iwanyu-foreground">
              {formatMoney(price)}
            </span>
            
            {/* Free Shipping Badge */}
            {freeShipping && (
              <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <Check size={12} className="mr-1" />
                Free shipping
              </div>
            )}
          </div>
          
          {/* Stock Status */}
          <div className={`text-xs font-medium ${
            inStock ? 'text-green-600' : 'text-red-500'
          }`}>
            {inStock ? '✓ In Stock' : '✗ Out of Stock'}
          </div>
        </div>
      </div>
    </Link>
  );
};
