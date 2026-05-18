import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Personal SNS',
        short_name: 'SNS',
        description: '自分専用の壁打ちSNSアプリ',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          {
            src: 'https://ui-avatars.com/api/?name=SNS&background=1d9bf0&color=fff&size=192',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://ui-avatars.com/api/?name=SNS&background=1d9bf0&color=fff&size=512',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'https://ui-avatars.com/api/?name=SNS&background=1d9bf0&color=fff&size=512',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
