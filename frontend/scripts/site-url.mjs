// Public site URL used for canonical links, Open Graph and the sitemap.
// Netlify sets URL automatically at build time; VITE_SITE_URL overrides it (e.g. custom domain).
export const siteUrl = (process.env.VITE_SITE_URL || process.env.URL || 'https://cliffcamps.netlify.app').replace(/\/$/, '');
