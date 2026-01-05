/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Vendor } from "@/types/vendor";
import type { Product } from "@/types/product";
import { createId } from "@/lib/ids";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { normalizeCategoryName } from "@/lib/categories";

export type MarketplaceProduct = Product & {
  vendorId: string;
};

type MarketplaceContextValue = {
  vendors: Vendor[];
  products: MarketplaceProduct[];
  loading: boolean;
  refresh: () => Promise<void>;
  createVendor: (input: Omit<Vendor, "id">) => Promise<Vendor>;
  upsertProduct: (input: Omit<MarketplaceProduct, "id"> & { id?: string }) => Promise<MarketplaceProduct>;
  deleteProduct: (productId: string) => Promise<void>;
  getVendorById: (vendorId: string) => Vendor | undefined;
  getVendorsForOwner: (ownerUserId: string) => Vendor[];
};

const MarketplaceContext = createContext<MarketplaceContextValue | undefined>(undefined);

type DbVendorRow = {
  id: string;
  name: string;
  location: string | null;
  verified: boolean;
  owner_user_id: string | null;
};

type DbProductRow = {
  id: string;
  vendor_id: string;
  title: string;
  description: string | null;
  category: string | null;
  price_rwf: number;
  image_url: string | null;
  in_stock: boolean;
  free_shipping: boolean;
  rating: number;
  review_count: number;
  discount_percentage?: number | null;
};

export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseClient();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setVendors([]);
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [{ data: vendorRows, error: vendorsErr }, { data: productRows, error: productsErr }] = await Promise.all([
        supabase
          .from("vendors")
          .select("id, name, location, verified, owner_user_id")
          .order("created_at", { ascending: false }),
        supabase
          .from("products")
          .select(
            "id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage"
          )
          .order("created_at", { ascending: false }),
      ]);

      if (vendorsErr) throw vendorsErr;
      if (productsErr) throw productsErr;

      const nextVendors = ((vendorRows ?? []) as DbVendorRow[]).map((v) => ({
        id: v.id,
        name: v.name,
        location: v.location ?? undefined,
        verified: v.verified,
        ownerUserId: v.owner_user_id ?? undefined,
      }));

      const nextProducts = ((productRows ?? []) as DbProductRow[]).map((p) => ({
        id: p.id,
        vendorId: p.vendor_id,
        title: p.title,
        description: p.description ?? "",
        category: normalizeCategoryName(p.category),
        price: Number(p.price_rwf ?? 0),
        image: p.image_url ?? "",
        inStock: Boolean(p.in_stock),
        freeShipping: Boolean(p.free_shipping),
        rating: Number(p.rating ?? 0),
        reviewCount: Number(p.review_count ?? 0),
        discountPercentage: Math.max(0, Math.min(100, Number(p.discount_percentage ?? 0))),
      }));

      setVendors(nextVendors);
      setProducts(nextProducts);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value: MarketplaceContextValue = useMemo(
    () => ({
      vendors,
      products,
      loading,
      refresh,
      createVendor: async (input) => {
        if (!supabase) throw new Error("Supabase is not configured");

        const vendor: Vendor = { id: createId("v"), ...input };
        const { error } = await supabase.from("vendors").insert({
          id: vendor.id,
          name: vendor.name,
          location: vendor.location ?? null,
          verified: Boolean(vendor.verified),
          owner_user_id: vendor.ownerUserId ?? null,
        });
        if (error) throw new Error(error.message);

        setVendors((prev) => [vendor, ...prev]);
        return vendor;
      },
      upsertProduct: async (input) => {
        if (!supabase) throw new Error("Supabase is not configured");

        const id = input.id ?? createId("p");
        const product: MarketplaceProduct = { ...input, id } as MarketplaceProduct;

        const { error } = await supabase.from("products").upsert({
          id,
          vendor_id: product.vendorId,
          title: product.title,
          description: product.description ?? null,
          category: product.category ?? null,
          price_rwf: Math.round(Number(product.price ?? 0)),
          image_url: product.image || null,
          in_stock: Boolean(product.inStock),
          free_shipping: Boolean(product.freeShipping),
          rating: Number(product.rating ?? 0),
          review_count: Number(product.reviewCount ?? 0),
          discount_percentage: Math.max(0, Math.min(100, Number(product.discountPercentage ?? 0))),
        });
        if (error) throw new Error(error.message);

        setProducts((prev) => {
          const exists = prev.some((p) => p.id === id);
          if (!exists) return [product, ...prev];
          return prev.map((p) => (p.id === id ? product : p));
        });

        return product;
      },
      deleteProduct: async (productId) => {
        if (!supabase) throw new Error("Supabase is not configured");
        const { error } = await supabase.from("products").delete().eq("id", productId);
        if (error) throw new Error(error.message);
        setProducts((prev) => prev.filter((p) => p.id !== productId));
      },
      getVendorById: (vendorId) => vendors.find((v) => v.id === vendorId),
      getVendorsForOwner: (ownerUserId) => vendors.filter((v) => v.ownerUserId === ownerUserId),
    }),
    [vendors, products, loading, refresh, supabase]
  );

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}

export function useMarketplace() {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) throw new Error("useMarketplace must be used within MarketplaceProvider");
  return ctx;
}
