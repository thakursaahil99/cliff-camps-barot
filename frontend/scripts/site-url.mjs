// Public site URL used for canonical links, Open Graph and the sitemap.
// Netlify sets URL and Vercel sets VERCEL_PROJECT_PRODUCTION_URL at build time; VITE_SITE_URL overrides both (e.g. custom domain).
export const siteUrl = (process.env.VITE_SITE_URL || process.env.URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) || 'https://cliffcamps.netlify.app').replace(/\/$/, '');
