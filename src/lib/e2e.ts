import type { AuthRole } from "@/types/auth";
import type { Product } from "@/types/product";
import type { Vendor } from "@/types/vendor";

export const E2E_LOCAL_USER_KEY = "iwanyu:e2e-user";

export const E2E_SELLER_ID = "00000000-0000-4000-8000-000000000001";
export const E2E_BUYER_ID = "00000000-0000-4000-8000-000000000002";

export type E2ELocalUser = {
  id: string;
  email: string;
  name: string;
  role: AuthRole;
};

export function isE2EMode() {
  const raw = String(import.meta.env.VITE_E2E_DISABLE_SUPABASE ?? "").toLowerCase();
  return raw === "1" || raw === "true";
}

export function readE2ELocalUser(): E2ELocalUser | null {
  try {
    const raw = window.localStorage.getItem(E2E_LOCAL_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as E2ELocalUser;
    if (!parsed?.id || !parsed?.email || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeE2ELocalUser(user: E2ELocalUser) {
  try {
    window.localStorage.setItem(E2E_LOCAL_USER_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function clearE2ELocalUser() {
  try {
    window.localStorage.removeItem(E2E_LOCAL_USER_KEY);
  } catch {
    // ignore
  }
}

export function getE2ELocalUserByCredentials(email: string, password: string): E2ELocalUser | null {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (normalizedEmail === "seller@test.com" && normalizedPassword === "testpass123") {
    return {
      id: E2E_SELLER_ID,
      email: "seller@test.com",
      name: "E2E Seller",
      role: "seller",
    };
  }

  if (normalizedEmail === "buyer@test.com" && normalizedPassword === "testpass123") {
    return {
      id: E2E_BUYER_ID,
      email: "buyer@test.com",
      name: "E2E Buyer",
      role: "buyer",
    };
  }

  return null;
}

export function getE2EFallbackVendors(): Vendor[] {
  return [
    {
      id: "vendor-e2e-1",
      name: "E2E Seller Store",
      location: "Kigali, Rwanda",
      verified: true,
      ownerUserId: E2E_SELLER_ID,
      status: "approved",
    },
  ];
}

export function getE2EFallbackProducts(vendorId = "vendor-e2e-1"): Array<Product & { vendorId: string }> {
  return [
    {
      id: "prod-e2e-1",
      vendorId,
      title: "E2E Wireless Headphones",
      description: "Stable fixture product for smoke and checkout tests.",
      category: "Electronics",
      price: 26000,
      image: "https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?w=1200&q=80&auto=format&fit=crop",
      inStock: true,
      freeShipping: true,
      rating: 4.5,
      reviewCount: 18,
      discountPercentage: 10,
    },
    {
      id: "prod-e2e-2",
      vendorId,
      title: "E2E Running Shoes",
      description: "In-stock footwear product used by recommendation tests.",
      category: "Fashion",
      price: 42000,
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&q=80&auto=format&fit=crop",
      inStock: true,
      freeShipping: false,
      rating: 4.2,
      reviewCount: 11,
    },
    {
      id: "prod-e2e-3",
      vendorId,
      title: "E2E Ceramic Mug",
      description: "Secondary product to keep home/category grids populated.",
      category: "Home",
      price: 7000,
      image: "https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=1200&q=80&auto=format&fit=crop",
      inStock: true,
      freeShipping: true,
      rating: 4.0,
      reviewCount: 5,
    },
  ];
}
