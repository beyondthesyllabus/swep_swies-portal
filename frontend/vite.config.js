import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [],
      manifest: {
        name: 'SWEP/SWIES Scanner',
        short_name: 'SWEP Scanner',
        description: 'Attendance scanning for SWEP/SWIES technologists',
        theme_color: '#14213D',
        background_color: '#14213D',
        display: 'standalone',
        start_url: '/scanner',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Scanner assets are cached so the app shell loads with no network;
        // actual scan data goes through the IndexedDB queue in src/offline/*,
        // not through this cache.
        globPatterns: ['**/*.{js,css,html}'],
      },
    }),
  ],
  server: { port: 5173 },
})
