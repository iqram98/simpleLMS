import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { Memuat, KotakGalat } from '../components/ui.jsx'
import { pesanError } from '../lib/supabase.js'
import { useTema } from '../tema/TemaProvider.jsx'

export default function Masuk() {
  const { sesi, memuat, masukGoogle } = useAuth()
  const { situs } = useTema()
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)

  if (memuat) return <Memuat />
  if (sesi) return <Navigate to="/" replace />

  const masuk = async () => {
    setSibuk(true)
    setGalat('')
    const { error } = await masukGoogle()
    if (error) {
      setGalat(pesanError(error))
      setSibuk(false)
    }
    // Bila berhasil, browser berpindah ke Google, jadi tidak ada langkah lanjutan di sini.
  }

  return (
    <main className="tengah">
      <div className="kartu-masuk">
        {situs.logo_url && <img className="logo-besar" src={situs.logo_url} alt="" onError={(e) => (e.currentTarget.hidden = true)} />}
        <h1>{situs.nama_situs}</h1>
        <p>Masuk dengan akun Google untuk membuka kelasmu.</p>
        <KotakGalat galat={galat} />
        <button type="button" className="btn utama" onClick={masuk} disabled={sibuk}>
          {sibuk ? 'Membuka Google…' : 'Masuk dengan Google'}
        </button>
        <p className="petunjuk">
          Pertama kali masuk, akunmu dibuat otomatis. Setelah itu masukkan kode kelas dari gurumu.
        </p>
      </div>
    </main>
  )
}