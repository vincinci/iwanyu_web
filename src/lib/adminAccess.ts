import type { AuthUser } from "@/context/auth";

const SEEDED_ADMIN_EMAIL = "bebisdavy@gmail.com";

export function canAccessAdmin(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return (user.email ?? "").toLowerCase() === SEEDED_ADMIN_EMAIL;
}
