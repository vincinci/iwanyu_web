import { Button } from '@/components/ui/button';

export const HeroSection = () => {
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-r from-iwanyu-muted via-iwanyu-muted/80 to-iwanyu-muted">
      <div className="container py-16 sm:py-20">
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-4xl font-bold text-iwanyu-foreground sm:text-5xl lg:text-6xl leading-tight">
              Shop from <span className="text-iwanyu-primary">trusted</span> sellers
            </h2>
            <p className="mt-4 max-w-lg text-lg text-gray-600 sm:text-xl leading-relaxed">
              Discover amazing products across categories and check out securely with our trusted marketplace platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button asChild className="rounded-full bg-iwanyu-primary text-white hover:bg-iwanyu-primary/90 px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                <a href="/category/all">Browse products</a>
              </Button>
              <Button asChild variant="outline" className="rounded-full px-8 py-3 text-lg font-semibold border-2 hover:bg-iwanyu-primary/10 transition-all duration-300">
                <a href="/sell">Become a seller</a>
              </Button>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="aspect-[4/3] w-full rounded-2xl border border-iwanyu-border bg-gradient-to-br from-white to-gray-50 shadow-2xl p-8">
              <div className="h-full w-full rounded-xl bg-gradient-to-br from-iwanyu-primary/10 to-iwanyu-primary/5 flex items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-iwanyu-primary/20 flex items-center justify-center">
                    <svg className="h-8 w-8 text-iwanyu-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-iwanyu-foreground">Fast & Secure</h3>
                  <p className="text-gray-600 mt-2">Quick delivery and secure payments</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
