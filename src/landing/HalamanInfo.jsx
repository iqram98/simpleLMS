import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import './landing.css'
import { Atas, Kaki } from './rangka.jsx'

// Kerangka halaman teks publik (kebijakan privasi, syarat penggunaan).
export default function HalamanInfo({ judul, diperbarui, children }) {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  return (
    <div className="lp">
      <Atas />
      <main className="lp-info">
        <Link to="/" className="lp-kembali">
          ← Kembali ke halaman awal
        </Link>
        <h1>{judul}</h1>
        {diperbarui && <p className="lp-tanggal">Terakhir diperbarui: {diperbarui}</p>}
        {children}
      </main>
      <Kaki />
    </div>
  )
}