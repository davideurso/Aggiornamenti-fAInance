import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
export default defineConfig({
  plugins: [react()],
  build: { outDir: '.verification-ui', rollupOptions: { input: resolve('tests/browser/index.html') } },
  server: { open: false },
});
