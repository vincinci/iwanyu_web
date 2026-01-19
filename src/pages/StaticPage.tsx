import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { Search, Package, HelpCircle, FileText, ShoppingBag, ArrowRight } from "lucide-react";

export default function StaticPage({ title }: { title: string }) {
  const lowerTitle = title.toLowerCase();

  // 1. Tracker Page Interception
  if (lowerTitle.includes("track")) {
    return (
      <StorefrontPage>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">{title}</h1>
            <p className="text-gray-600 mb-8">Enter your order ID to check its current status and estimated delivery.</p>
            
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
              <div className="flex flex-col sm:flex-row gap-4">
                <Input placeholder="Enter Order ID (e.g., ORD-7782)" className="h-12 text-lg" />
                <Button size="lg" className="h-12 px-8 bg-black text-white hover:bg-gray-800 rounded-lg font-bold">
                  Track
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-4 text-left">
                * Orders are usually updated within 2 hours of shipment. If you just placed an order, please wait for the confirmation email.
              </p>
            </div>
            
            <div className="mt-12 text-left">
                <h3 className="font-bold text-lg mb-4">Common Questions</h3>
                <div className="space-y-4">
                    <details className="group border-b border-gray-100 pb-4">
                        <summary className="flex cursor-pointer items-center justify-between font-medium list-none">
                            Where is my order ID?
                            <span className="transition group-open:rotate-180">
                                <ArrowRight size={16} className="rotate-90" />
                            </span>
                        </summary>
                        <p className="group-open:animate-fadeIn mt-2 text-gray-600 text-sm">
                            Your order ID was sent to your email address immediately after purchase. It typically starts with "ORD-".
                        </p>
                    </details>
                    <details className="group border-b border-gray-100 pb-4">
                        <summary className="flex cursor-pointer items-center justify-between font-medium list-none">
                            My package is delayed
                            <span className="transition group-open:rotate-180">
                                <ArrowRight size={16} className="rotate-90" />
                            </span>
                        </summary>
                        <p className="group-open:animate-fadeIn mt-2 text-gray-600 text-sm">
                            Shipping times may vary due to high demand. If your package hasn't moved in 48 hours, please contact support.
                        </p>
                    </details>
                </div>
            </div>
          </div>
        </div>
      </StorefrontPage>
    );
  }

  // 2. Help/Support Page Interception
  if (lowerTitle.includes("help") || lowerTitle.includes("support")) {
    return (
      <StorefrontPage>
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-col md:flex-row gap-12">
             <div className="w-full md:w-1/3">
                 <h1 className="text-4xl font-bold mb-6">{title}</h1>
                 <p className="text-gray-600 mb-8">How can we assist you today? Search our knowledge base or browse common topics.</p>
                 <div className="relative mb-8">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                     <Input placeholder="Search for help..." className="pl-10 h-12" />
                 </div>
                 <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                     <h3 className="font-bold mb-4">Contact Us</h3>
                     <p className="text-sm text-gray-600 mb-4">Can't find what you're looking for?</p>
                     <Button className="w-full bg-black text-white rounded-full">Chat with Support</Button>
                 </div>
             </div>
             
             <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
                 {[
                     "Shipping & Delivery", "Returns & Refunds", "Account Settings", 
                     "Payment Methods", "Selling on Iwanyu", "Privacy & Security"
                 ].map((topic) => (
                     <div key={topic} className="p-6 border border-gray-200 rounded-xl hover:border-black transition-colors cursor-pointer group">
                         <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-iwanyu-primary transition-colors">
                             <HelpCircle size={20} />
                         </div>
                         <h3 className="font-bold mb-2">{topic}</h3>
                         <Link to="#" className="text-sm text-gray-500 hover:text-black hover:underline">View Articles</Link>
                     </div>
                 ))}
             </div>
          </div>
        </div>
      </StorefrontPage>
    );
  }

  // 3. Legal/Corporate Interception
  if (lowerTitle.includes("privacy") || lowerTitle.includes("terms") || lowerTitle.includes("corporate") || lowerTitle.includes("about")) {
      return (
        <StorefrontPage>
            <div className="container mx-auto px-4 py-16">
                <div className="max-w-3xl mx-auto">
                    <h1 className="text-4xl font-bold mb-8">{title}</h1>
                    <div className="prose prose-gray max-w-none">
                        <p className="text-lg text-gray-600 leading-relaxed mb-6">
                            Welcome to Iwanyu Marketplace. We are dedicated to providing the best experience for our buyers and sellers. 
                            This document outlines our commitment to transparency, quality, and community standards.
                        </p>
                        
                        <h3 className="text-xl font-bold mt-8 mb-4">1. Introduction</h3>
                        <p className="mb-4 text-gray-600">
                            Iwanyu is a leading platform connecting unique vendors with customers worldwide. Our mission is to democratize commerce 
                            through technology and design.
                        </p>

                        <h3 className="text-xl font-bold mt-8 mb-4">2. Our Commitment</h3>
                        <p className="mb-4 text-gray-600">
                            We ensure that every transaction is secure and every product meets our quality standards. 
                            Whether you are buying your first pair of sneakers or scaling your business, we are here to support you.
                        </p>

                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mt-8">
                            <h4 className="font-bold mb-2">Need more details?</h4>
                            <p className="text-sm text-gray-600 mb-4">Download the full documentation PDF for offline reading.</p>
                            <Button variant="outline" className="text-xs">Download PDF</Button>
                        </div>
                    </div>
                </div>
            </div>
        </StorefrontPage>
      );
  }

  return (
    <StorefrontPage>
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-2xl text-center rounded-3xl border border-gray-100 bg-gray-50 p-12 shadow-sm">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-iwanyu-primary text-3xl font-bold">
            !
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-iwanyu-foreground">{title}</h1>
          <p className="mb-8 text-lg text-gray-600">
            This feature is currently being upgraded! We are rolling out improvements to {title} this week.
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/">
                <Button className="rounded-full bg-black px-8 py-6 text-base text-white hover:bg-gray-800">
                    Return Home
                </Button>
            </Link>
          </div>
        </div>
      </div>
    </StorefrontPage>
  );
}
