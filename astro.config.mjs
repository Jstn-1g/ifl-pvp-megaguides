import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://iflpvp.com',
  output: 'static',
  build: {
    inlineStylesheets: 'auto',
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark-default',
    },
  },
});
