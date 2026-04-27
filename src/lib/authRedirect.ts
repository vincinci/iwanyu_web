function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local");
}

function getConfiguredWebOrigin() {
  const configured =
    import.meta.env.VITE_WEB_APP_URL ??
    import.meta.env.VITE_PUBLIC_WEB_URL ??
    import.meta.env.VITE_SITE_URL;

  if (!configured) return null;

  try {
    return trimTrailingSlash(new URL(configured).origin);
  } catch {
    return null;
  }
}

function getPreferredOrigin() {
  const configuredOrigin = getConfiguredWebOrigin();
  const runtimeOrigin = trimTrailingSlash(window.location.origin);

  // In production, always prefer an explicitly configured canonical origin.
  if (!import.meta.env.DEV && configuredOrigin) return configuredOrigin;
  return runtimeOrigin;
}

export function sanitizeNextPath(next: string | null | undefined, fallback = "/account") {
  if (!next) return fallback;

  const candidate = next.trim();
  if (!candidate) return fallback;

  // Allow only app-relative paths.
  if (candidate.startsWith("/") && !candidate.startsWith("//")) {
    return candidate;
  }

  // If an absolute URL is provided, only keep its path when same-origin.
  try {
    const preferredOrigin = getPreferredOrigin();
    const preferred = new URL(preferredOrigin);
    const parsed = new URL(candidate);
    if (parsed.origin === preferred.origin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback;
    }
  } catch {
    // ignore invalid URL
  }

  return fallback;
}

export function getOAuthRedirectUrl(next?: string) {
  const baseOrigin = getPreferredOrigin();
  const safeNext = sanitizeNextPath(next, "");

  if (!safeNext) return `${baseOrigin}/auth/callback`;
  return `${baseOrigin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}
