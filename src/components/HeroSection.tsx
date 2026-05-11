import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/languageContext';
import { useAuth } from '@/context/auth';
import { useEffect, useState } from 'react';
import { getPublicSupabaseClient } from '@/lib/supabaseClient';

const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1600&auto=format&fit=crop';

export const HeroSection = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const isSeller = user?.role === 'seller' || user?.role === 'admin';
    const [heroImageUrl, setHeroImageUrl] = useState(DEFAULT_HERO_IMAGE);

    useEffect(() => {
        const supabase = getPublicSupabaseClient();
        if (!supabase) return;

        let cancelled = false;
        async function loadHeroImage() {
            const { data, error } = await supabase
                .from('site_settings')
                .select('value_text')
                .eq('key', 'hero_image_url')
                .maybeSingle();

            if (cancelled || error) return;
            const next = data?.value_text?.trim();
            if (next) setHeroImageUrl(next);
        }

        void loadHeroImage();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <section className="relative w-full overflow-hidden bg-gradient-to-br from-gray-50 via-white to-amber-50/30">
            {/* Decorative gradient blobs */}
            <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-amber-200/20 blur-3xl" />
            <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-200/20 blur-3xl" />
            
            <div className="container relative mx-auto px-4 py-16 md:py-24">
                <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
                    <div className="lg:col-span-6 space-y-8">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 shadow-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
                            </span>
                            Rwanda's #1 Marketplace
                        </div>

                        {/* Main Heading with gradient */}
                        <h1 className="text-5xl font-bold tracking-tight text-gray-900 md:text-6xl lg:text-7xl">
                            <span className="block">{t("hero.title").split(" ").slice(0, 3).join(" ")}</span>
                            <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                                {t("hero.title").split(" ").slice(3).join(" ")}
                            </span>
                        </h1>

                        {/* Subtitle with better styling */}
                        <p className="text-xl text-gray-600 leading-relaxed max-w-xl">
                            {t("hero.subtitle")}
                        </p>

                        {/* Feature pills */}
                        <div className="flex flex-wrap gap-3">
                            <span className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200">
                                ✓ Verified Vendors
                            </span>
                            <span className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200">
                                ⚡ Fast Delivery
                            </span>
                            <span className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200">
                                🔒 Secure Checkout
                            </span>
                        </div>

                        {/* CTA Buttons with improved styling */}
                        <div className="flex flex-wrap items-center gap-4">
                            <Button 
                                asChild 
                                size="lg"
                                className="group rounded-full bg-gradient-to-r from-gray-900 to-gray-800 px-8 py-6 text-base font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                            >
                                <Link to="/category/all" className="flex items-center gap-2">
                                    {t("hero.shopCategories")}
                                    <ArrowRight className="transition-transform group-hover:translate-x-1" size={18} />
                                </Link>
                            </Button>
                            <Button 
                                asChild 
                                variant="outline" 
                                size="lg"
                                className="rounded-full border-2 border-gray-300 px-8 py-6 text-base font-semibold hover:border-gray-900 hover:bg-gray-50"
                            >
                                <Link to="/deals">{t("hero.viewDeals")}</Link>
                            </Button>
                            {!isSeller && (
                                <Button 
                                    asChild 
                                    size="lg"
                                    className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-6 text-base font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                                >
                                    <Link to="/sell">{t("header.sellOn")}</Link>
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Hero Image with improved design */}
                    <div className="lg:col-span-6">
                        <div className="group relative">
                            {/* Decorative elements */}
                            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 blur-2xl transition-all group-hover:blur-3xl" />
                            
                            {/* Main image container */}
                            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-100 to-gray-50 shadow-2xl ring-1 ring-gray-900/5 transition-transform group-hover:scale-[1.02]">
                                <img
                                    src={heroImageUrl}
                                    alt="Featured collection"
                                    className="h-[350px] w-full object-cover transition-transform duration-700 group-hover:scale-105 md:h-[500px]"
                                />
                                
                                {/* Gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                
                                {/* Floating stats badge */}
                                <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur-sm">
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <div className="text-2xl font-bold text-gray-900">1000+</div>
                                            <div className="text-xs text-gray-600">Products</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-gray-900">50+</div>
                                            <div className="text-xs text-gray-600">Vendors</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-amber-600">4.8★</div>
                                            <div className="text-xs text-gray-600">Rating</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
