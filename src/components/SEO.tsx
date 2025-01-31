import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

export default function SEO({ 
  title = "Benin Chorale & Philharmonic - Musical Excellence in Nigeria",
  description = "Experience musical excellence with Benin Chorale & Philharmonic, Nigeria's premier ensemble inspiring young musicians through choral and orchestral performance since 2012.",
  image = "/bcslogo.jpeg",
  url = "https://yourwebsite.com"
}: SEOProps) {
  return (
    <Helmet>
      {/* Basic meta tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />

      {/* Additional SEO tags */}
      <meta name="keywords" content="benin chorale & philharmonic, choir, philharmonic, choral, band, nigeria choir, choir in nigeria, choir in africa, choir in edo state, choir in benin city, choir in lagos, benin city, classical music, orchestra, musical training, youth development" />
      <link rel="canonical" href={url} />
    </Helmet>
  );
}