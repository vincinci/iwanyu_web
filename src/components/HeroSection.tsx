import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Truck } from 'lucide-react';
import { useLanguage } from '@/context/languageContext';
import { useEffect, useState } from 'react';
import { getPublicSupabaseClient } from '@/lib/supabaseClient';

const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1600&auto=format&fit=crop';

export const HeroSection = () => {
    const { t } = useLanguage();
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
        <section className="w-full border-b border-gray-100 bg-white">
            <div className="container mx-auto px-4 py-10 md:py-14">
                <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
                    <div className="lg:col-span-6">
                        <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                            <ShieldCheck size={14} className="text-emerald-600" />
                            {t("hero.trusted")}
                        </span>
                        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-gray-900 md:text-5xl">
                            {t("hero.title")}
                        </h1>
                        <p className="mt-4 text-lg text-gray-600">
                            {t("hero.subtitle")}
                        </p>
                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            <Button asChild className="rounded-full bg-gray-900 px-7 text-white hover:bg-gray-800">
                                <Link to="/category/all" className="flex items-center gap-2">
                                    {t("hero.shopCategories")}
                                    <ArrowRight size={16} />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="rounded-full px-7">
                                <Link to="/deals">{t("hero.viewDeals")}</Link>
                            </Button>
                            <Button asChild className="rounded-full bg-amber-500 text-black hover:bg-amber-600 px-7">
                                <Link to="/sell">{t("header.sellOn")}</Link>
                            </Button>
                        </div>
                        <div className="mt-6 flex items-center gap-4 text-sm text-gray-500">
                            <span className="inline-flex items-center gap-2">
                                <Truck size={16} className="text-gray-600" /> {t("hero.sameWeek")}
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <ShieldCheck size={16} className="text-gray-600" /> {t("hero.secure")}
                            </span>
                        </div>
                    </div>
                    <div className="lg:col-span-6">
                        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
                            <img
                                src={heroImageUrl}
                                alt="Featured collection"
                                className="h-[300px] w-full object-cover md:h-[400px]"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
