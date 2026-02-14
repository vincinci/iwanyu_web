import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star } from 'lucide-react';
import { Product } from '@/types/product';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/context/cart';
import { useMarketplace } from '@/context/marketplace';
import { useWishlist } from '@/context/wishlist';
import { useLanguage } from '@/context/languageContext';
import { formatMoney } from '@/lib/money';
import { getOptimizedCloudinaryUrl } from '@/lib/cloudinary';
import { Button } from '@/components/ui/button';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const { toast } = useToast();
  const { addItem } = useCart();
  const { getVendorById } = useMarketplace();
  const { contains, toggle } = useWishlist();
  const { t } = useLanguage();

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
  const ratingLabel = reviewCount > 0 ? `${rating.toFixed(1)} (${reviewCount})` : t("product.new");

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({ productId: id, title, price, image });
    toast({
      title: t("product.toastAddedTitle"),
      description: `${title} ${t("product.toastAddedDesc")}`,
      variant: "default",
    });
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const result = await toggle(id);
      toast({
        title: result.added ? t("product.toastWishAdded") : t("product.toastWishRemoved"),
        description: `${title} ${result.added ? t("product.toastWishDescAdd") : t("product.toastWishDescRemove")}`,
        variant: "default",
      });
    } catch {
      toast({
        title: t("product.toastWishFail"),
        description: t("product.toastTryAgain"),
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
      <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:shadow-md">
        
        {/* Image Container */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
          {image ? (
            <img
              src={getOptimizedCloudinaryUrl(image, { kind: "image", width: 600 })}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100">
              <span className="text-xs text-gray-400">{t("product.noImage")}</span>
            </div>
          )}
          
          {/* Discount badge */}
          {typeof discountPercentage === "number" && discountPercentage > 0 ? (
            <div className="absolute left-3 top-3 rounded-md bg-amber-400 px-2 py-1 text-xs font-semibold text-black shadow-sm">
              -{discountPercentage}%
            </div>
          ) : null}

          {/* Favorite button */}
          <button
            type="button"
            onClick={handleToggleFavorite}
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-sm transition-all duration-200 hover:scale-105"
            aria-label={isFavorite ? t("product.removeWishlist") : t("product.addWishlist")}
          >
            <Heart size={16} className={isFavorite ? "fill-current text-red-500" : ""} />
          </button>
        </div>
        
        {/* Product Info */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-[15px] font-medium text-gray-900">
              {title}
            </h3>
            <div className="flex items-center gap-1 text-xs text-gray-700 shrink-0">
              <Star size={12} className="fill-current text-gray-900" />
              <span className="font-medium">{ratingLabel}</span>
            </div>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            {t("product.soldBy")} {vendorName ?? "iwanyu"}
          </p>
          
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[15px] font-semibold text-gray-900">{formatMoney(price)}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddToCart}
              disabled={!inStock}
              className="h-8 px-3"
            >
              {t("product.add")}
            </Button>
          </div>
          {!inStock && (
            <span className="mt-2 block text-xs text-red-500">{t("product.outOfStock")}</span>
          )}
        </div>
      </div>
    </Link>
  );
};
