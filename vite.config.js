import { defineConfig } from 'vite';

export default defineConfig({
  // No resolve.alias for now, let's see if the external option is enough
  build: {
    rollupOptions: {
      external: [], // Ensure 'three' is not externalized
    }
  }
}); 