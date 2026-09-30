import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/** sitemap.xml — only the public pages. Per-title pages get added here when they exist. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
