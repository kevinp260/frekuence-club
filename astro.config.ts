import node from '@astrojs/node';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://frekuence.club',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  trailingSlash: 'always',
  build: {
    format: 'directory',
    inlineStylesheets: 'never',
  },
  compressHTML: true,
  vite: {
    build: {
      assetsInlineLimit: 0,
      sourcemap: false,
    },
  },
});
