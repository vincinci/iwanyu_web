import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const location = useLocation();

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    "matchMedia" in window &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scrollBehavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth";

  useEffect(() => {
    // Prevent the browser from restoring scroll position on SPA navigations.
    // This is a common cause of "navigated to a new page but I'm still at the footer".
    if ("scrollRestoration" in window.history) {
      try {
        window.history.scrollRestoration = "manual";
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    // If the URL includes a hash, let the browser scroll to that anchor.
    if (location.hash) {
      const id = location.hash.replace(/^#/, "");
      if (!id) return;

      // Defer until after route content renders.
      const handle = window.setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ block: "start", behavior: scrollBehavior });
      }, 0);

      return () => window.clearTimeout(handle);
    }

    // Scroll to top on route change.
    // We do a second scroll on the next frame to beat late scroll-restoration/layout shifts.
    window.scrollTo({ top: 0, left: 0, behavior: scrollBehavior });
    const raf1 = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: scrollBehavior });
    });

    return () => window.cancelAnimationFrame(raf1);
  }, [location.pathname, location.search, location.hash, scrollBehavior]);

  return null;
}
