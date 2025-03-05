import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Benin Chorale & Philharmonic',
        short_name: 'BCS',
        description: 'Musical Excellence: Where Passion Meets Performance',
        theme_color: '#98916D',
        icons: [
          {
            src: 'bcslogo.jpeg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: 'bcslogo.jpeg',
            sizes: '512x512',
            type: 'image/jpeg'
          }
        ]
      }
    })
  ],
  build: {
    sourcemap: true
  },
});
