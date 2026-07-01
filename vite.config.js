import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['gamtrakr-icon.png', 'gamtrakr-logo.png'],
      manifest: {
        name: 'GamTrackr',
        short_name: 'GamTrackr',
        description: 'Registo de eventos de jogo em tempo real',
        theme_color: '#0f2744',
        background_color: '#0f2744',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'gamtrakr-icon.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'gamtrakr-icon.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
})