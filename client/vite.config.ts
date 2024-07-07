import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      base: '/',
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src/service-worker',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,jpg,webp,svg,ico,woff2}']
      },
      devOptions: {
        type: 'module',
        enabled: true,
        navigateFallback: 'index.html'
      }
    })
  ],
  server: {
    port: 8080,
    proxy: {
      '/api': 'http://api.dev.wsl:3000',
      '/socket.io': {
        target: 'ws://api.dev.wsl:3000',
        ws: true
      }
    }
  }
});
