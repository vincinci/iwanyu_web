/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  variants?: unknown | null;
};

const CACHE_KEY = "iwanyu:marketplace:v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

type MarketplaceCache = {
  fetchedAt: number;
  vendors: DbVendorRow[];
  products: DbProductRow[];
};

function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  let timeoutId: number | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });

  return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
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
  const hasDataRef = useRef(false);

  useEffect(() => {
    hasDataRef.current = vendors.length > 0 || products.length > 0;
  }, [vendors.length, products.length]);

  // Load cached marketplace data immediately for fast first paint.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as MarketplaceCache;
      if (!parsed || !Array.isArray(parsed.vendors) || !Array.isArray(parsed.products)) return;

      const vendorRows: DbVendorRow[] = parsed.vendors;
      const productRows: DbProductRow[] = parsed.products;

      const nextVendors = vendorRows.map((v) => ({
        id: v.id,
        name: v.name,
        location: v.location ?? undefined,
        verified: v.verified,
        ownerUserId: v.owner_user_id ?? undefined,
        status: v.status as "pending" | "approved" | "rejected",
      }));

      const nextProducts = productRows.map((p) => ({
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
        variants: (p.variants ?? undefined) as Product["variants"],
      }));

      setVendors(nextVendors);
      setProducts(nextProducts);
    } catch {
      // ignore
    }
  }, []);

  const refresh = useCallback(async () => {
    const hadData = hasDataRef.current;
    if (!hadData) setLoading(true);
    setError(null);

    try {
      // Prefer the Vercel API (can do joins/shape changes), but fall back to direct Supabase reads
      // to avoid cold-start slowness.
      let vendorRows: DbVendorRow[] = [];
      let productRows: DbProductRow[] = [];

      try {
        const res = await withTimeout(fetch("/api/marketplace"), 4000, "marketplace api");
        if (!res.ok) throw new Error(`Failed to fetch marketplace data: ${res.statusText}`);
        const data = (await res.json()) as { vendors?: DbVendorRow[]; products?: DbProductRow[] };
        vendorRows = data.vendors || [];
        productRows = data.products || [];
      } catch {
        if (!publicSupabase) throw new Error("Supabase is not configured");

        const vendorsRes = await withTimeout(
          publicSupabase
            .from("vendors")
            .select("id, name, location, verified, owner_user_id, status")
            .limit(500),
          4000,
          "vendors fetch"
        );
        if (vendorsRes.error) throw new Error(vendorsRes.error.message);
        vendorRows = (vendorsRes.data ?? []) as DbVendorRow[];

        let productsRes = await withTimeout(
          publicSupabase
            .from("products")
            .select(
              "id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage, variants"
            )
            .limit(2000),
          5000,
          "products fetch"
        );

        if (productsRes.error && /column\s+\"variants\"\s+does\s+not\s+exist/i.test(productsRes.error.message)) {
          productsRes = await withTimeout(
            publicSupabase
              .from("products")
              .select(
                "id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage"
              )
              .limit(2000),
            5000,
            "products fetch"
          );
        }

        if (productsRes.error) throw new Error(productsRes.error.message);
        productRows = (productsRes.data ?? []) as DbProductRow[];
      }


      const nextVendors = vendorRows.map((v) => ({
        id: v.id,
        name: v.name,
        location: v.location ?? undefined,
        verified: v.verified,
        ownerUserId: v.owner_user_id ?? undefined,
        status: v.status as "pending" | "approved" | "rejected",
      }));

      const nextProducts = productRows.map((p) => ({
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
        variants: (p.variants ?? undefined) as Product["variants"],
      }));

      setVendors(nextVendors);
      setProducts(nextProducts);

      // Cache for fast reloads
      try {
        const cache: MarketplaceCache = {
          fetchedAt: Date.now(),
          vendors: vendorRows,
          products: productRows,
        };
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      } catch {
        // ignore
      }
    } catch (error) {
      console.error('[MarketplaceContext] Refresh error:', error);
      setError(error instanceof Error ? error.message : String(error));
      // Keep last-known state on error to avoid a blank UI.
    } finally {
      setLoading(false);
    }
  }, [publicSupabase]);

  useEffect(() => {
    // Avoid hitting the network on every reload if cache is fresh.
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MarketplaceCache;
        if (parsed?.fetchedAt && Date.now() - Number(parsed.fetchedAt) < CACHE_TTL_MS) {
          return;
        }
      }
    } catch {
      // ignore
    }
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
          variants: product.variants ?? null,
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
