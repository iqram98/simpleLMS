import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import { konfigurasiLengkap } from './lib/supabase.js'
import { TemaProvider } from './tema/TemaProvider.jsx'
import './styles.css'

function BelumDiatur() {
  return (
    <main className="tengah">
      <h1>Aplikasi belum tersambung ke Supabase</h1>
      <p>
        Salin <span className="kode">.env.example</span> menjadi <span className="kode">.env.local</span>, isi{' '}
        <span className="kode">VITE_SUPABASE_URL</span> dan <span className="kode">VITE_SUPABASE_PUBLISHABLE_KEY</span>{' '}
        dari tombol Connect di proyek Supabase, lalu jalankan ulang <span className="kode">npm run dev</span>.
      </p>
    </main>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {konfigurasiLengkap ? (
      <TemaProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </TemaProvider>
    ) : (
      <BelumDiatur />
    )}
  </StrictMode>,
)