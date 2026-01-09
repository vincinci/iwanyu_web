/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type RecentlyViewedContextValue = {
  productIds: string[];
  add: (productId: string) => void;
  clear: () => void;
};

const RecentlyViewedContext = createContext<RecentlyViewedContextValue | undefined>(undefined);

const STORAGE_KEY = "iwanyu:recently-viewed";
const MAX_ITEMS = 20;

function readLocalStorage(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => typeof x === "string").map(String);
  } catch {
    return [];
  }
}

function writeLocalStorage(productIds: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(productIds));
  } catch {
    // ignore
  }
}

export function RecentlyViewedProvider({ children }: { children: React.ReactNode }) {
  const [productIds, setProductIds] = useState<string[]>([]);

  // Initialize from localStorage
  useEffect(() => {
    setProductIds(readLocalStorage());
  }, []);

  // Persist to localStorage
  useEffect(() => {
    writeLocalStorage(productIds);
  }, [productIds]);

  const add = useCallback((productId: string) => {
    setProductIds((prev) => {
      // Remove if exists (to move to front)
      const filtered = prev.filter((id) => id !== productId);
      // Add to front and limit size
      return [productId, ...filtered].slice(0, MAX_ITEMS);
    });
  }, []);

  const clear = useCallback(() => {
    setProductIds([]);
  }, []);

  const value: RecentlyViewedContextValue = useMemo(
    () => ({
      productIds,
      add,
      clear,
    }),
    [productIds, add, clear]
  );

  return <RecentlyViewedContext.Provider value={value}>{children}</RecentlyViewedContext.Provider>;
}

export function useRecentlyViewed() {
  const ctx = useContext(RecentlyViewedContext);
  if (!ctx) throw new Error("useRecentlyViewed must be used within RecentlyViewedProvider");
  return ctx;
}
