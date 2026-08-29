import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://frekuence.club',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    inlineStylesheets: 'never',
  },
  compressHTML: true,
  integrations: [
    sitemap({
      filter: (page) => !page.endsWith('/404.html'),
      i18n: {
        defaultLocale: 'sq-AL',
        locales: {
          'sq-AL': 'sq-AL',
          en: 'en',
        },
      },
    }),
  ],
  vite: {
    build: {
      assetsInlineLimit: 0,
      sourcemap: false,
    },
  },
});
