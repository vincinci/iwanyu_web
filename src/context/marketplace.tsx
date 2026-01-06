/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Vendor } from "@/types/vendor";
import type { Product } from "@/types/product";
import { createId } from "@/lib/ids";
import { getPublicSupabaseClient, getSupabaseClient } from "@/lib/supabaseClient";
import { normalizeCategoryName } from "@/lib/categories";

export type MarketplaceProduct = Product & {
  vendorId: string;
};

type MarketplaceContextValue = {
  vendors: Vendor[];
  products: MarketplaceProduct[];
  loading: boolean;
  error: string | null;
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
  status: string;
};

type DbProductRow = {
  id: string;
  vendor_id: string;
  title: string;
  description: string | null;
  category: string | null;
  price_rwf: number;
  image_url: string | null;
  in_stock: boolean | null;
  free_shipping: boolean | null;
  rating: number;
  review_count: number;
  discount_percentage?: number | null;
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: number | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  });
}

export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseClient();
  const publicSupabase = getPublicSupabaseClient();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const readClient = publicSupabase ?? supabase;
    if (!readClient) {
      console.warn('[MarketplaceContext] Supabase not configured - using empty marketplace state');
      setVendors([]);
      setProducts([]);
      setLoading(false);
      setError('Supabase not configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [{ data: vendorRows, error: vendorsErr }, { data: productRows, error: productsErr }] = await withTimeout(
        Promise.all([
          readClient
            .from("vendors")
            .select("id, name, location, verified, owner_user_id, status")
            .order("created_at", { ascending: false }),
          readClient
            .from("products")
            .select(
              "id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage"
            )
            .order("created_at", { ascending: false }),
        ]),
        15_000,
        'Marketplace refresh'
      );

      if (vendorsErr || productsErr) {
        const vendorMsg = vendorsErr
          ? (vendorsErr instanceof Error ? vendorsErr.message : String(vendorsErr))
          : null;
        const productMsg = productsErr
          ? (productsErr instanceof Error ? productsErr.message : String(productsErr))
          : null;
        console.warn('[MarketplaceContext] Marketplace refresh failed; using empty state', {
          vendors: vendorMsg,
          products: productMsg,
        });
        setError(vendorMsg || productMsg || 'Marketplace refresh failed');
        setVendors([]);
        setProducts([]);
        return;
      }

      const nextVendors = ((vendorRows ?? []) as DbVendorRow[]).map((v) => ({
        id: v.id,
        name: v.name,
        location: v.location ?? undefined,
        verified: v.verified,
        ownerUserId: v.owner_user_id ?? undefined,
        status: v.status,
      }));

      const nextProducts = ((productRows ?? []) as DbProductRow[]).map((p) => ({
        id: p.id,
        vendorId: p.vendor_id,
        title: p.title,
        description: p.description ?? "",
        category: normalizeCategoryName(p.category),
        price: Number(p.price_rwf ?? 0),
        image: p.image_url ?? "",
        inStock: Boolean(p.in_stock ?? true),
        freeShipping: Boolean(p.free_shipping ?? false),
        rating: Number(p.rating ?? 0),
        reviewCount: Number(p.review_count ?? 0),
        discountPercentage: Math.max(0, Math.min(100, Number(p.discount_percentage ?? 0))),
      }));

      setVendors(nextVendors);
      setProducts(nextProducts);
    } catch (error) {
      console.warn('[MarketplaceContext] Marketplace refresh error; using empty state', error);
      setError(error instanceof Error ? error.message : String(error));
      setVendors([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [publicSupabase, supabase]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value: MarketplaceContextValue = useMemo(
    () => ({
      vendors,
      products,
      loading,
      error,
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
          status: vendor.status ?? 'approved',
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
    [vendors, products, loading, error, refresh, supabase]
  );

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}

export function useMarketplace() {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) throw new Error("useMarketplace must be used within MarketplaceProvider");
  return ctx;
}
