import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteUrl } from './site-url.mjs';

const pub = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
const today = new Date().toISOString().slice(0, 10);
const pages = [
  ['/', '1.0', 'weekly'],
  ['/stay', '0.9', 'weekly'],
  ['/experiences', '0.8', 'monthly'],
  ['/gallery', '0.7', 'monthly'],
  ['/book', '0.9', 'weekly']
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(([p, prio, freq]) => `  <url><loc>${siteUrl}${p}</loc><lastmod>${today}</lastmod><changefreq>${freq}</changefreq><priority>${prio}</priority></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(pub, 'sitemap.xml'), xml);
fs.writeFileSync(path.join(pub, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /booking/\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
console.log(`sitemap.xml + robots.txt written for ${siteUrl}`);
