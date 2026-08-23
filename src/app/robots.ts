import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.dukaanos.com';

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/docs', '/privacy', '/terms', '/support', '/login', '/register'],
      disallow: ['/dashboard/', '/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
