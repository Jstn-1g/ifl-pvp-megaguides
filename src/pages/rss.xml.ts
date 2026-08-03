import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { SITE } from '../utils/site';

export const GET: APIRoute = (context) => rss({
  title: SITE.name,
  description: SITE.description,
  site: context.site ?? SITE.url,
  items: [],
});
