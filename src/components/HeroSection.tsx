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
        <section className="relative w-full overflow-hidden bg-white border-b border-gray-100">
            <div className="container relative mx-auto px-4 py-12 md:py-20">
                <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-16">
                    <div className="lg:col-span-6 space-y-8">
                        {/* Clean Badge */}
                        <div className="inline-flex items-center gap-2 rounded-md bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-800 border border-gray-200">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                            Rwanda's Premier Marketplace
                        </div>

                        {/* Solid, elegant heading */}
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl lg:text-6xl text-balance">
                            {t("hero.title")}
                        </h1>

                        {/* Professional Subtitle */}
                        <p className="text-lg text-gray-600 leading-relaxed max-w-lg">
                            {t("hero.subtitle")}
                        </p>

                        {/* Subtle Features */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Verified Vendors
                            </div>
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Fast Delivery
                            </div>
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Secure Checkout
                            </div>
                        </div>

                        {/* Clean CTA Buttons */}
                        <div className="flex flex-wrap items-center gap-4 pt-4">
                            <Button 
                                asChild 
                                size="lg"
                                className="rounded-full bg-gray-900 px-8 text-base text-white hover:bg-gray-800 transition-colors"
                            >
                                <Link to="/category/all" className="flex items-center gap-2">
                                    {t("hero.shopCategories")}
                                    <ArrowRight size={18} className="text-gray-300" />
                                </Link>
                            </Button>
                            <Button 
                                asChild 
                                variant="outline" 
                                size="lg"
                                className="rounded-full border-gray-200 px-8 text-base font-medium hover:bg-gray-50 transition-colors"
                            >
                                <Link to="/deals">{t("hero.viewDeals")}</Link>
                            </Button>
                            {!isSeller && (
                                <Button 
                                    asChild 
                                    size="lg"
                                    className="rounded-full bg-amber-400 text-amber-950 hover:bg-amber-500 px-8 text-base font-medium transition-colors"
                                >
                                    <Link to="/sell">{t("header.sellOn")}</Link>
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Classic, clean Hero Image */}
                    <div className="lg:col-span-6 mt-8 lg:mt-0">
                        <div className="relative overflow-hidden rounded-2xl bg-gray-100 shadow-sm border border-gray-100">
                            <img
                                src={heroImageUrl}
                                alt="Featured collection"
                                className="h-[400px] w-full object-cover md:h-[500px]"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
