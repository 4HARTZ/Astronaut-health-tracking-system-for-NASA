import { defineConfig } from 'vite';
import { offlineApp } from './build/offline-plugin.js';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// When running inside Tauri (`npm run tauri dev`), Tauri sets TAURI_ENV_PLATFORM.
const isTauri = !!process.env.TAURI_ENV_PLATFORM;

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(isTauri ? [] : [offlineApp()])],
  base: './',
  // Tauri expects a clear server host/port for its dev webview.
  server: { host: 'localhost', port: 8080, strictPort: true },
  preview: { host: 'localhost', port: 8080, strictPort: true },
  // Tauri uses Cargo env vars for version detection at build time.
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  build: {
    target: 'es2021',
  },
});

