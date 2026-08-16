// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  devToolbar: {
      enabled: false
  },

  integrations: [react()],
  adapter: vercel(),
});