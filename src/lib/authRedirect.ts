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

export function getOAuthRedirectUrl(next?: string) {
  const configuredOrigin = getConfiguredWebOrigin();
  const runtimeOrigin = trimTrailingSlash(window.location.origin);
  const runtimeHost = window.location.hostname;

  // In production/webviews, localhost origins can leak into OAuth redirects.
  // Prefer explicit public origin when runtime host is local.
  const baseOrigin = !import.meta.env.DEV && isLocalHost(runtimeHost) && configuredOrigin
    ? configuredOrigin
    : runtimeOrigin;

  if (!next) return `${baseOrigin}/auth/callback`;
  return `${baseOrigin}/auth/callback?next=${encodeURIComponent(next)}`;
}
