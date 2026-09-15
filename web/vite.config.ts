import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:8080' } },
  // Stated, not inherited: Vite 7 defaults to Baseline Widely Available (Chrome/Edge 107+,
  // Firefox 104+, Safari 16+). The server-rendered HTML carries all content for anything older.
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: false, target: 'baseline-widely-available' },
  test: { environment: 'jsdom', globals: true, setupFiles: ['src/test/setup.ts'] },
});
