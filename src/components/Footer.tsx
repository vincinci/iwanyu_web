import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="border-b bg-amber-50/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Sell on iwanyu</h3>
              <p className="mt-1 text-sm text-gray-600">
                Reach more customers across Rwanda with verified, trusted storefronts.
              </p>
            </div>
            <Link
              to="/sell"
              className="inline-flex items-center rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-black hover:bg-amber-600 transition-colors"
            >
              Start selling
            </Link>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="iwanyu" className="h-20 w-auto object-contain" loading="lazy" />
              <span className="sr-only">iwanyu</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Rwanda&apos;s marketplace connecting buyers with trusted vendors.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-foreground">Shop</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  All products
                </Link>
              </li>
              <li>
                <Link
                  to="/deals"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Deals
                </Link>
              </li>
              <li>
                <Link
                  to="/category/new-arrivals"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  New arrivals
                </Link>
              </li>
              <li>
                <Link
                  to="/category/all"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Categories
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium text-foreground">Company</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  to="/about"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  to="/sell"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sell on iwanyu
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium text-foreground">Support</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  to="/help"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Help center
                </Link>
              </li>
              <li>
                <Link
                  to="/track-order"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Track order
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-border pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} IwAnYu Marketplace.
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Secure payments</span>
            <span aria-hidden className="text-muted-foreground/40">
              •
            </span>
            <span>Protected checkout</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
