import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Alamat situs untuk gambar pratinjau tautan (og:image harus berupa alamat lengkap).
// Dipakai VITE_SITE_URL bila diisi, jika tidak alamat utama dari Netlify (variabel URL), jika tidak kosong (alamat relatif).
const alamatSitus = () => (process.env.VITE_SITE_URL || process.env.URL || '').replace(/\/+$/, '')

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'alamat-situs-di-html',
      transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', alamatSitus()),
    },
  ],
  server: { port: 5173, strictPort: true },
})