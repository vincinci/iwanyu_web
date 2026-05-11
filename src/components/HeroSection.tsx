import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/context/languageContext';
import { useAuth } from '@/context/auth';
import { useEffect, useState } from 'react';
import { getPublicSupabaseClient } from '@/lib/supabaseClient';

const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1600&auto=format&fit=crop';

type HeroMedia = {
    url: string;
    type: 'image' | 'video';
};

export const HeroSection = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const isSeller = user?.role === 'seller' || user?.role === 'admin';
    const [heroMedia, setHeroMedia] = useState<HeroMedia[]>([{ url: DEFAULT_HERO_IMAGE, type: 'image' }]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const supabase = getPublicSupabaseClient();
        if (!supabase) return;

        let cancelled = false;
        async function loadHeroMedia() {
            const { data, error } = await supabase
                .from('site_settings')
                .select('value_json, value_text')
                .eq('key', 'hero_media')
                .maybeSingle();

            if (cancelled || error) return;
            
            // Try new format (value_json) first
            if (data?.value_json && Array.isArray(data.value_json) && data.value_json.length > 0) {
                setHeroMedia(data.value_json);
            } 
            // Fallback to old format (single URL in value_text)
            else {
                const fallbackData = await supabase
                    .from('site_settings')
                    .select('value_text')
                    .eq('key', 'hero_image_url')
                    .maybeSingle();
                
                const url = fallbackData.data?.value_text?.trim();
                if (url) {
                    setHeroMedia([{ url, type: 'image' }]);
                }
            }
        }

        void loadHeroMedia();
        return () => {
            cancelled = true;
        };
    }, []);

    // Auto-rotate media every 5 seconds
    useEffect(() => {
        if (heroMedia.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % heroMedia.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [heroMedia.length]);

    const goToSlide = (index: number) => {
        setCurrentIndex(index);
    };

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + heroMedia.length) % heroMedia.length);
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev + 1) % heroMedia.length);
    };

    return (
        <section className="relative w-full overflow-hidden bg-white border-b border-gray-100">
            <div className="container relative mx-auto px-4 py-12 md:py-20">
                <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-16">
                    <div className="lg:col-span-6 space-y-8">
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

                    {/* Carousel Hero Media */}
                    <div className="lg:col-span-6 mt-8 lg:mt-0">
                        <div className="relative overflow-hidden rounded-2xl bg-gray-100 shadow-sm border border-gray-100 group">
                            {/* Media Display */}
                            <div className="relative h-[400px] md:h-[500px]">
                                {heroMedia.map((media, index) => (
                                    <div
                                        key={index}
                                        className={`absolute inset-0 transition-opacity duration-500 ${
                                            index === currentIndex ? 'opacity-100' : 'opacity-0'
                                        }`}
                                    >
                                        {media.type === 'video' ? (
                                            <video
                                                src={media.url}
                                                className="h-full w-full object-cover"
                                                autoPlay
                                                muted
                                                loop
                                                playsInline
                                            />
                                        ) : (
                                            <img
                                                src={media.url}
                                                alt={`Hero ${index + 1}`}
                                                className="h-full w-full object-cover"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Navigation Arrows - Show only if multiple items */}
                            {heroMedia.length > 1 && (
                                <>
                                    <button
                                        onClick={goToPrevious}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="Previous"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button
                                        onClick={goToNext}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="Next"
                                    >
                                        <ChevronRight size={20} />
                                    </button>

                                    {/* Dots Navigation */}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                        {heroMedia.map((_, index) => (
                                            <button
                                                key={index}
                                                onClick={() => goToSlide(index)}
                                                className={`h-2 rounded-full transition-all ${
                                                    index === currentIndex
                                                        ? 'w-8 bg-white'
                                                        : 'w-2 bg-white/50 hover:bg-white/75'
                                                }`}
                                                aria-label={`Go to slide ${index + 1}`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
