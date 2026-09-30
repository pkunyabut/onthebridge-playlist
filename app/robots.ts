import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * robots.txt — public pages (home, /terms) may be indexed; personal pages that need a login
 * and the API are kept out of Google. Login-only pages redirect to /login anyway (middleware.ts),
 * so crawling them only wastes Google's time on this site.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/auth/', '/dashboard', '/watchlist', '/collections', '/search', '/login'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
