import { defineConfig } from 'vite';
import { offlineApp } from './build/offline-plugin.js';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react(), offlineApp()],
  base: './',
  server: { host: 'localhost', port: 8080, strictPort: true },
  preview: { host: 'localhost', port: 8080, strictPort: true },
});
