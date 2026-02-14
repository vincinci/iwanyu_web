import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Truck } from 'lucide-react';
import { useLanguage } from '@/context/languageContext';

export const HeroSection = () => {
    const { t } = useLanguage();

    return (
        <section className="w-full border-b border-gray-200/70 bg-white">
            <div className="container mx-auto px-4 py-12 md:py-16">
                <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
                    <div className="lg:col-span-6">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm">
                            <ShieldCheck size={14} className="text-emerald-600" /> {t("hero.trusted")}
                        </span>
                        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-gray-900 md:text-5xl">
                            {t("hero.title")}
                        </h1>
                        <p className="mt-4 text-base text-gray-600 md:text-lg">
                            {t("hero.subtitle")}
                        </p>
                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            <Button asChild className="rounded-full bg-gray-900 text-white hover:bg-gray-800 px-7">
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
                        <div className="mt-6 flex items-center gap-4 text-sm text-gray-600">
                            <span className="inline-flex items-center gap-2">
                                <Truck size={16} className="text-gray-700" /> {t("hero.sameWeek")}
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <ShieldCheck size={16} className="text-gray-700" /> {t("hero.secure")}
                            </span>
                        </div>
                    </div>
                    <div className="lg:col-span-6">
                        <div className="relative overflow-hidden rounded-3xl bg-white shadow-lg border border-gray-100">
                            <img
                                src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1600&auto=format&fit=crop"
                                alt="Featured collection"
                                className="relative h-[320px] w-full object-cover md:h-[420px]"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
