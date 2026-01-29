import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Clock } from 'lucide-react';

export const HeroSection = () => {
    return (
        <section className="w-full bg-white border-b border-gray-100">
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-auto lg:h-[500px]">
                    
                    {/* Main Hero Banner - Adidas Style */}
                    <div className="lg:col-span-8 h-full relative group overflow-hidden bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-[1.01] animate-in fade-in slide-in-from-bottom duration-700">
                        <img 
                            src="https://images.unsplash.com/photo-1556906781-9a412961d289?q=80&w=2000&auto=format&fit=crop" 
                            alt="Hero" 
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-end items-start text-white">
                            <span className="bg-gradient-to-r from-iwanyu-primary to-yellow-400 text-black text-xs font-bold uppercase px-3 py-1.5 mb-4 tracking-wider rounded-full shadow-lg animate-pulse">Limited Time</span>
                            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4 leading-none drop-shadow-2xl animate-in slide-in-from-left duration-700 delay-150">
                                Street<br/>Ready
                            </h2>
                            <p className="text-lg font-medium mb-6 max-w-md opacity-90 animate-in slide-in-from-left duration-700 delay-300">
                                Discover the latest urban collection. Bold styles for the modern creator.
                            </p>
                            <Button asChild className="group/btn rounded-full bg-white text-black hover:bg-white hover:shadow-2xl font-bold px-8 h-12 text-sm uppercase tracking-widest border-0 transition-all duration-300 hover:scale-105 hover:gap-3 active:scale-95 animate-in slide-in-from-left duration-700 delay-500">
                                <Link to="/category/fashion" className="flex items-center gap-2">
                                    Shop Now 
                                    <ArrowRight size={16} className="transition-transform duration-300 group-hover/btn:translate-x-1" />
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Right Side Grid - AliExpress Style Dense Info */}
                    <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 h-full">
                        
                        {/* Top Side Banner - Flash Deal */}
                        <div className="relative h-full min-h-[240px] bg-gradient-to-br from-iwanyu-primary via-yellow-400 to-orange-400 text-black p-6 flex flex-col justify-between overflow-hidden group rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.01] animate-in slide-in-from-right duration-700 delay-150">
                           <div className="absolute top-0 right-0 p-4 opacity-10 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
                               <Zap size={100} />
                           </div>
                           <div className="relative z-10">
                               <div className="flex items-center gap-2 text-black font-bold uppercase text-xs tracking-wider mb-2 animate-pulse">
                                   <Zap size={14} className="fill-current" /> Flash Deals
                               </div>
                               <h3 className="text-3xl font-black uppercase italic leading-none mb-2 drop-shadow-lg group-hover:scale-105 transition-transform inline-block">Super<br/>Sale</h3>
                               <p className="text-black/80 text-sm font-semibold">Up to 70% off selected electronics.</p>
                           </div>
                           <div className="mt-4 relative z-10">
                               <div className="flex items-center gap-2 mb-4 bg-black/20 backdrop-blur-sm p-2 rounded-lg w-fit shadow-lg transition-all duration-300 group-hover:scale-105">
                                   <Clock size={14} className="text-black" />
                                   <span className="text-xs font-mono font-bold">Ended in 02:45:12</span>
                               </div>
                               <Button asChild variant="link" className="text-black p-0 h-auto font-bold uppercase text-xs hover:text-white hover:gap-2 transition-all flex items-center gap-1">
                                   <Link to="/deals" className="flex items-center gap-1">
                                       View All Deals 
                                       <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                                   </Link>
                               </Button>
                           </div>
                        </div>

                        {/* Bottom Side Banner - Category/Recommendation */}
                        <div className="relative h-full min-h-[240px] bg-gradient-to-br from-gray-100 to-gray-200 p-6 flex flex-col justify-center items-start group overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.01] animate-in slide-in-from-right duration-700 delay-300">
                           <img 
                                src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000&auto=format&fit=crop" 
                                alt="Shoes" 
                                className="absolute inset-0 w-full h-full object-cover opacity-100 transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/90 to-white/85 group-hover:from-white/98 group-hover:via-white/95 group-hover:to-white/90 transition-all duration-500" />
                            <div className="relative z-10 w-full text-center">
                                <h3 className="text-2xl font-black uppercase tracking-tight text-black mb-1 drop-shadow-sm group-hover:scale-110 transition-transform inline-block">New Kicks</h3>
                                <p className="text-gray-600 text-xs font-bold uppercase tracking-wider mb-4">Just Landed</p>
                                <Button asChild className="group/btn rounded-full border-2 border-black bg-transparent text-black hover:bg-black hover:text-white font-bold h-10 px-6 text-xs uppercase tracking-widest w-full transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95">
                                    <Link to="/category/shoes" className="flex items-center justify-center gap-2">
                                        Check it out
                                        <ArrowRight size={14} className="transition-transform duration-300 group-hover/btn:translate-x-1" />
                                    </Link>
                                </Button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </section>
    );
};
