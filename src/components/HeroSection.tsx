import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Clock } from 'lucide-react';

export const HeroSection = () => {
    return (
        <section className="w-full bg-white border-b border-gray-100">
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-auto lg:h-[500px]">
                    
                    {/* Main Hero Banner - Adidas Style */}
                    <div className="lg:col-span-8 h-full relative group overflow-hidden bg-gray-100 rounded-2xl">
                        <img 
                            src="https://images.unsplash.com/photo-1556906781-9a412961d289?q=80&w=2000&auto=format&fit=crop" 
                            alt="Hero" 
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/20" /> {/* Overlay */}
                        <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-end items-start text-white">
                            <span className="bg-iwanyu-primary text-black text-xs font-bold uppercase px-2 py-1 mb-4 tracking-wider rounded-md">Limited Time</span>
                            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4 leading-none">
                                Street<br/>Ready
                            </h2>
                            <p className="text-lg font-medium mb-6 max-w-md opacity-90">
                                Discover the latest urban collection. Bold styles for the modern creator.
                            </p>
                            <Button asChild className="rounded-full bg-white text-black hover:bg-white/90 font-bold px-8 h-12 text-sm uppercase tracking-widest border-0">
                                <Link to="/category/fashion">Shop Now <ArrowRight size={16} className="ml-2" /></Link>
                            </Button>
                        </div>
                    </div>

                    {/* Right Side Grid - AliExpress Style Dense Info */}
                    <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 h-full">
                        
                        {/* Top Side Banner - Flash Deal */}
                        <div className="relative h-full min-h-[240px] bg-iwanyu-primary text-black p-6 flex flex-col justify-between overflow-hidden group rounded-2xl">
                           <div className="absolute top-0 right-0 p-4 opacity-10">
                               <Zap size={100} />
                           </div>
                           <div>
                               <div className="flex items-center gap-2 text-black font-bold uppercase text-xs tracking-wider mb-2">
                                   <Zap size={14} className="fill-current" /> Flash Deals
                               </div>
                               <h3 className="text-3xl font-black uppercase italic leading-none mb-2">Super<br/>Sale</h3>
                               <p className="text-black/80 text-sm">Up to 70% off selected electronics.</p>
                           </div>
                           <div className="mt-4">
                               <div className="flex items-center gap-2 mb-4 bg-black/10 p-2 rounded-sm w-fit">
                                   <Clock size={14} className="text-black" />
                                   <span className="text-xs font-mono font-bold">Ended in 02:45:12</span>
                               </div>
                               <Button asChild variant="link" className="text-black p-0 h-auto font-bold uppercase text-xs hover:text-white">
                                   <Link to="/deals">View All Deals &rarr;</Link>
                               </Button>
                           </div>
                        </div>

                        {/* Bottom Side Banner - Category/Recommendation */}
                        <div className="relative h-full min-h-[240px] bg-gray-100 p-6 flex flex-col justify-center items-start group overflow-hidden rounded-2xl">
                           <img 
                                src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000&auto=format&fit=crop" 
                                alt="Shoes" 
                                className="absolute inset-0 w-full h-full object-cover opacity-100 transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-white/90 group-hover:bg-white/95 transition-colors duration-300" />
                            <div className="relative z-10 w-full text-center">
                                <h3 className="text-2xl font-black uppercase tracking-tight text-black mb-1">New Kicks</h3>
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-4">Just Landed</p>
                                <Button asChild className="rounded-full border-2 border-black bg-transparent text-black hover:bg-black hover:text-white font-bold h-10 px-6 text-xs uppercase tracking-widest w-full">
                                    <Link to="/category/shoes">Check it out</Link>
                                </Button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </section>
    );
};
