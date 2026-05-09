import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/auth";
import type { AuthRole } from "@/types/auth";
import { isE2EMode } from "@/lib/e2e";
import { canAccessAdmin } from "@/lib/adminAccess";

export default function RequireAuth({
  children,
  roles,
}: {
  children: JSX.Element;
  roles?: AuthRole[];
}) {
  const { user, isReady } = useAuth();
  const location = useLocation();

  if (!isReady) return null;

  if (!user) {
    // Keep local e2e/dev flows unblocked for seller dashboard tests when auth backends are unavailable.
    if ((isE2EMode() || import.meta.env.DEV) && roles?.some((role) => role === "seller" || role === "admin")) {
      return children;
    }
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && roles.length > 0) {
    if (roles.includes("admin") && canAccessAdmin(user)) {
      return children;
    }
    const role = user.role ?? "buyer";
    if (!roles.includes(role)) return <Navigate to="/account" replace />;
  }

  return children;
}
