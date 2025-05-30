import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // base: '/lemonland/', // Not needed for Vercel deployment
  build: {
    rollupOptions: {
      // Ensure three.js is treated as an external dependency if it's linked via CDN or already available globally
      // However, for typical npm module usage, it should NOT be external.
      // If 'three' is in your package.json dependencies, it should be bundled.
      // external: ['three'], // Uncomment if 'three' is explicitly provided globally and not via npm bundling
    },
  },
}); 