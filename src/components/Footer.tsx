import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Youtube, ArrowUp, Mail, MapPin, Phone } from 'lucide-react';

const footerLinks = [
  {
    title: 'Products',
    links: [
      { name: 'Shoes', url: '/category/shoes' },
      { name: 'Clothing', url: '/category/clothing' },
      { name: 'Accessories', url: '/category/accessories' },
      { name: 'New Arrivals', url: '/category/new-arrivals' },
      { name: 'Release Dates', url: '/releases' },
      { name: 'Top Sellers', url: '/top-sellers' }
    ]
  },
  {
    title: 'Sports',
    links: [
      { name: 'Soccer', url: '/sport/soccer' },
      { name: 'Running', url: '/sport/running' },
      { name: 'Basketball', url: '/sport/basketball' },
      { name: 'Training', url: '/sport/training' },
      { name: 'Outdoor', url: '/sport/outdoor' }
    ]
  },
  {
    title: 'Support',
    links: [
      { name: 'Help', url: '/help' },
      { name: 'Returns & Exchanges', url: '/returns' },
      { name: 'Shipping', url: '/shipping' },
      { name: 'Order Tracker', url: '/track' },
      { name: 'Store Locator', url: '/stores' }
    ]
  },
  {
    title: 'Company Info',
    links: [
      { name: 'About Us', url: '/about' },
      { name: 'Careers', url: '/careers' },
      { name: 'Press', url: '/press' },
      { name: 'Mobile Apps', url: '/apps' },
      { name: 'Sustainability', url: '/sustainability' }
    ]
  }
];

export const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white text-black border-t border-gray-200">
      {/* Back to top button */}
      <button
        onClick={scrollToTop}
        className="flex w-full items-center justify-center bg-gray-100 py-4 text-xs font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors rounded-t-2xl text-gray-900"
      >
        <ArrowUp size={16} className="mr-2" />
        Back to top
      </button>
      
      {/* Main footer content */}
      <div className="py-12 border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
            {footerLinks.map((column) => (
              <div key={column.title}>
                <h3 className="mb-6 text-sm font-bold uppercase tracking-widest text-black">
                  {column.title}
                </h3>
                <ul className="space-y-3">
                  {column.links.map((link) => (
                    <li key={link.name}>
                      <Link
                        to={link.url}
                        className="text-xs text-gray-500 hover:text-black transition-colors"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-gray-50 py-8">
        <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                
                {/* Socials */}
                <div className="flex items-center gap-6">
                    <a href="#" className="text-gray-500 hover:text-black transition-colors"><Facebook size={20} /></a>
                    <a href="#" className="text-gray-500 hover:text-black transition-colors"><Instagram size={20} /></a>
                    <a href="#" className="text-gray-500 hover:text-black transition-colors"><Twitter size={20} /></a>
                    <a href="#" className="text-gray-500 hover:text-black transition-colors"><Youtube size={20} /></a>
                </div>

                <div className="flex flex-wrap gap-4 justify-center md:justify-end text-xs text-gray-500">
                    <Link to="/privacy" className="hover:text-black">Privacy Policy</Link>
                    <span>|</span>
                    <Link to="/terms" className="hover:text-black">Terms and Conditions</Link>
                    <span>|</span>
                    <Link to="/cookies" className="hover:text-black">Cookie Settings</Link>
                    <span>|</span>
                    <span>© {currentYear} Iwanyu Marketplace</span>
                </div>
            </div>
        </div>
      </div>
    </footer>
  );
};
