import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/languageContext';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t bg-white">
      <div className="border-b bg-amber-50/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t("footer.sellTitle")}</h3>
              <p className="mt-1 text-sm text-gray-600">
                {t("footer.sellDesc")}
              </p>
            </div>
            <Link
              to="/sell"
              className="inline-flex items-center rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-black hover:bg-amber-600 transition-colors"
            >
              {t("footer.startSelling")}
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
              {t("footer.tagline")}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-foreground">{t("footer.shop")}</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("footer.allProducts")}
                </Link>
              </li>
              <li>
                <Link
                  to="/deals"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("header.deals")}
                </Link>
              </li>
              <li>
                <Link
                  to="/category/new-arrivals"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("footer.newArrivals")}
                </Link>
              </li>
              <li>
                <Link
                  to="/category/all"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("footer.categories")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium text-foreground">{t("footer.company")}</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  to="/about"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("footer.about")}
                </Link>
              </li>
              <li>
                <Link
                  to="/sell"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("footer.sellTitle")}
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("footer.privacy")}
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("footer.terms")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium text-foreground">{t("footer.support")}</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  to="/help"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("footer.helpCenter")}
                </Link>
              </li>
              <li>
                <Link
                  to="/track-order"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("footer.trackOrder")}
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("footer.contact")}
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
            <span>{t("footer.securePayments")}</span>
            <span aria-hidden className="text-muted-foreground/40">
              •
            </span>
            <span>{t("footer.protectedCheckout")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
