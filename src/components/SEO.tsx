import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  keywords?: string[];
}

export default function SEO({
  title = 'IwanYu - Rwanda\'s Premier Online Marketplace',
  description = 'Discover amazing products from verified sellers across Rwanda. Shop electronics, fashion, home goods, and more on IwanYu marketplace.',
  image = 'https://www.iwanyu.store/og-image.jpg',
  url,
  type = 'website',
  keywords = ['rwanda marketplace', 'online shopping rwanda', 'buy sell rwanda', 'rwandan ecommerce'],
}: SEOProps) {
  const siteUrl = 'https://www.iwanyu.store';
  const fullUrl = url ? `${siteUrl}${url}` : siteUrl;
  const fullTitle = title.includes('IwanYu') ? title : `${title} | IwanYu`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      {keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="IwanYu" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={fullUrl} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />

      {/* Additional SEO */}
      <link rel="canonical" href={fullUrl} />
      <meta name="robots" content="index, follow" />
      <meta name="language" content="English" />
      <meta name="author" content="IwanYu" />
    </Helmet>
  );
}

// Pre-configured SEO for common pages
export const HomeSEO = () => (
  <SEO
    title="IwanYu - Rwanda's Premier Online Marketplace"
    description="Discover amazing products from verified sellers across Rwanda. Shop electronics, fashion, home goods, and more with secure payments and fast delivery."
    keywords={['rwanda marketplace', 'online shopping rwanda', 'buy products rwanda', 'rwandan ecommerce', 'verified sellers rwanda']}
  />
);

export const ProductSEO = ({ title, description, image, id }: { title: string; description?: string; image?: string; id: string }) => (
  <SEO
    title={title}
    description={description || `Buy ${title} on IwanYu marketplace. Secure checkout, verified sellers, and fast delivery across Rwanda.`}
    image={image}
    url={`/product/${id}`}
    type="product"
    keywords={[title, 'buy online rwanda', 'rwanda shopping']}
  />
);

export const CategorySEO = ({ category }: { category: string }) => (
  <SEO
    title={`${category} - Shop Online in Rwanda`}
    description={`Browse the best ${category.toLowerCase()} products from verified sellers in Rwanda. Secure shopping with IwanYu marketplace.`}
    url={`/category/${category.toLowerCase()}`}
    keywords={[`${category} rwanda`, `buy ${category} online`, 'rwanda shopping']}
  />
);
