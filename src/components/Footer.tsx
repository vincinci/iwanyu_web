
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Youtube, ArrowUp } from 'lucide-react';

const footerLinks = [
  {
    title: 'Get to Know Us',
    links: [
      { name: 'About iwanyu', url: '/about' },
      { name: 'Careers', url: '/careers' },
      { name: 'Corporate Information', url: '/corporate' },
      { name: 'iwanyu Science', url: '/science' }
    ]
  },
  {
    title: 'Make Money with Us',
    links: [
      { name: 'Sell on iwanyu', url: '/sell' },
      { name: 'Become an Affiliate', url: '/affiliate' },
      { name: 'Advertise Your Products', url: '/advertise' },
      { name: 'Self-Publish', url: '/publish' }
    ]
  },
  {
    title: 'iwanyu Payment Products',
    links: [
      { name: 'iwanyu Business Card', url: '/business-card' },
      { name: 'Shop with Points', url: '/points' },
      { name: 'Reload Your Balance', url: '/reload' },
      { name: 'iwanyu Currency Converter', url: '/currency' }
    ]
  },
  {
    title: 'Let Us Help You',
    links: [
      { name: 'Your Account', url: '/account' },
      { name: 'Your Orders', url: '/orders' },
      { name: 'Shipping Rates & Policies', url: '/shipping' },
      { name: 'Returns & Replacements', url: '/returns' },
      { name: 'Help', url: '/help' }
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
    <footer className="bg-white">
      {/* Back to top button */}
      <button
        onClick={scrollToTop}
        className="flex w-full items-center justify-center bg-iwanyu-light py-2.5 text-sm text-white hover:bg-iwanyu-light/90"
      >
        <ArrowUp size={16} className="mr-2" />
        Back to top
      </button>
      
      {/* Main footer content */}
      <div className="border-t border-iwanyu-border bg-iwanyu-muted py-6">
        <div className="container">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
            {footerLinks.map((column) => (
              <div key={column.title}>
                <h3 className="mb-4 text-sm font-bold text-iwanyu-foreground">
                  {column.title}
                </h3>
                <ul className="space-y-2">
                  {column.links.map((link) => (
                    <li key={link.name}>
                      <Link
                        to={link.url}
                        className="text-xs text-gray-600 hover:text-iwanyu-primary hover:underline"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          {/* Social links & branding */}
          <div className="mt-12 flex flex-col items-center">
            <Link to="/" className="mb-6 flex items-center">
              <img
                src="/logo.png"
                alt="iwanyu"
                className="h-12 w-auto md:h-14"
                loading="lazy"
              />
            </Link>
            
            <div className="mb-6 flex space-x-4">
              <a
                href="#"
                className="rounded-full bg-iwanyu-dark p-2 text-white hover:bg-iwanyu-primary"
                aria-label="Facebook"
              >
                <Facebook size={18} />
              </a>
              <a
                href="#"
                className="rounded-full bg-iwanyu-dark p-2 text-white hover:bg-iwanyu-primary"
                aria-label="Twitter"
              >
                <Twitter size={18} />
              </a>
              <a
                href="#"
                className="rounded-full bg-iwanyu-dark p-2 text-white hover:bg-iwanyu-primary"
                aria-label="Instagram"
              >
                <Instagram size={18} />
              </a>
              <a
                href="#"
                className="rounded-full bg-iwanyu-dark p-2 text-white hover:bg-iwanyu-primary"
                aria-label="YouTube"
              >
                <Youtube size={18} />
              </a>
            </div>
          </div>
        </div>
      </div>
      
      {/* Copyright */}
      <div className="border-t border-iwanyu-border bg-white py-3 text-center">
        <div className="container">
          <p className="text-xs text-gray-500">
            &copy; {currentYear} iwanyu store. All rights reserved.
          </p>
          <div className="mt-2 flex justify-center space-x-4">
            <Link to="/privacy" className="text-xs text-gray-500 hover:text-iwanyu-primary hover:underline">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-xs text-gray-500 hover:text-iwanyu-primary hover:underline">
              Terms of Use
            </Link>
            <Link to="/cookies" className="text-xs text-gray-500 hover:text-iwanyu-primary hover:underline">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
