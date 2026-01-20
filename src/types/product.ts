
export type ProductVariantColor = {
  name: string;
  hex: string;
};

export type ProductVariants = {
  colors?: ProductVariantColor[];
  sizes?: string[];
};

export interface Product {
  id: string;
  vendorId?: string;
  title: string;
  description: string;
  price: number;
  rating: number;
  reviewCount: number;
  category: string;
  image: string;
  badges?: string[];
  inStock: boolean;
  freeShipping?: boolean;
  discountPercentage?: number;
  variants?: ProductVariants;
}
