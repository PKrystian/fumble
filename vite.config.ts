import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import istanbul from 'vite-plugin-istanbul';

export default defineConfig(({ command, isPreview }) => ({
  base: process.env.BASE_PATH ?? (command === 'build' || isPreview ? '/fumble/' : '/'),
  plugins: [
    react(),
    tailwindcss(),
    ...(process.env.E2E_COVERAGE
      ? [
          istanbul({
            include: 'src/**/*',
            exclude: ['node_modules', 'src/**/*.{test,spec}.{ts,tsx}'],
            extension: ['.ts', '.tsx'],
            requireEnv: false,
          }),
        ]
      : []),
  ],
  build: {
    chunkSizeWarningLimit: 7000,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}));
