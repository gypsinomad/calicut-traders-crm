import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {VitePWA} from 'vite-plugin-pwa';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5MB
        },
        manifest: {
          name: 'Calicut Traders CRM',
          short_name: 'TradeCRM',
          description: 'Global CRM for Export Trading Operations',
          theme_color: '#059669',
          icons: [
            {
              src: 'https://picsum.photos/seed/trade/192/192',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'https://picsum.photos/seed/trade/512/512',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'https://picsum.photos/seed/trade/512/512',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(env.GOOGLE_MAPS_PLATFORM_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
