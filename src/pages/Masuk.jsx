import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { LogoSitus } from '../components/Logo.jsx'
import { KotakGalat, Memuat } from '../components/ui.jsx'
import Ik from '../landing/ikon.jsx'
import IlustrasiSiswa from '../landing/IlustrasiSiswa.jsx'
import { pesanError } from '../lib/supabase.js'
import { useTema } from '../tema/TemaProvider.jsx'
import '../landing/landing.css'
import './masuk.css'

const POIN = [
  {
    ikon: 'siswa',
    judul: 'Tanpa akun dan kata sandi baru',
    isi: 'Cukup akun Google yang sudah kamu punya. Akunmu dibuat otomatis saat pertama masuk.',
  },
  {
    ikon: 'kunci',
    judul: 'Data yang kami terima seperlunya',
    isi: 'Dari Google hanya nama, email, dan foto profil. Kami tidak membaca Gmail, kontak, atau isi Drive-mu, dan kata sandimu tidak pernah sampai ke kami.',
  },
  {
    ikon: 'perisai',
    judul: 'Tidak dijual, tanpa iklan',
    isi: 'Datamu hanya untuk menjalankan kelas. Guru yang memakai fitur unggah memberi izin terbatas, hanya untuk berkas yang dipilih sendiri.',
  },
]

export default function Masuk() {
  const { sesi, memuat, masukGoogle } = useAuth()
  const { situs } = useTema()
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)

  if (memuat) return <Memuat bentuk="layar" />
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
    <main className="ms lp">
      <div className="ms-isi">
        <div className="ms-kartu">
          <div className="ms-merek">
            <LogoSitus url={situs.logo_url} ukuran={44} kelas="logo-besar" />
            <span>{situs.nama_situs}</span>
          </div>
          <h1>Masuk untuk mulai belajar</h1>
          <p className="petunjuk">Pakai akun Google-mu, lalu masukkan kode kelas dari gurumu atau pilih kursus di katalog.</p>
          <KotakGalat galat={galat} />
          <button type="button" className="btn utama" onClick={masuk} disabled={sibuk}>
            {sibuk ? 'Membuka Google…' : 'Masuk dengan Google'}
          </button>
          <p className="petunjuk">Pertama kali masuk? Tidak perlu mendaftar. Akunmu dibuat otomatis.</p>
          <nav className="ms-tautan" aria-label="Tautan lain">
            <Link to="/privasi">Kebijakan Privasi</Link>
            <Link to="/syarat">Syarat Penggunaan</Link>
            <Link to="/">← Halaman awal</Link>
          </nav>
        </div>

        <div className="ms-kanan">
          <IlustrasiSiswa />
          <h2 className="ms-judul">
            Masuk tanpa ribet, <span>data tetap aman.</span>
          </h2>
          <ul className="ms-poin">
            {POIN.map((p) => (
              <li key={p.judul}>
                <span className="ms-ikon" aria-hidden="true">
                  <Ik nama={p.ikon} ukuran={20} />
                </span>
                <div>
                  <b>{p.judul}</b>
                  <span>{p.isi}</span>
                </div>
              </li>
            ))}
          </ul>
          <p>
            <Link to="/privasi">Baca kebijakan privasi lengkap →</Link>
          </p>
        </div>
      </div>
    </main>
  )
}