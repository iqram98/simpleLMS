import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Ikon from './Ikon.jsx'

// Sidebar yang bisa dilipat di desktop (pilihan diingat per perangkat)
// dan dibuka lewat tombol melayang (FAB) di HP.
export function useSampingLipat(kunci) {
  const [lipat, setLipat] = useState(() => {
    try {
      return localStorage.getItem(kunci) === '1'
    } catch {
      return false
    }
  })
  const ubah = (nilai) => {
    setLipat(nilai)
    try {
      localStorage.setItem(kunci, nilai ? '1' : '0')
    } catch {
      /* penyimpanan tidak tersedia: pilihan tidak diingat */
    }
  }
  return [lipat, ubah]
}

// Tombol ikon untuk melipat sidebar menjadi jalur ikon (rail). Hanya tampil di desktop.
export function TombolLipat({ lipat, onUbah, id, nama }) {
  const label = lipat ? `Tampilkan ${nama}` : `Sembunyikan ${nama}`
  return (
    <button
      type="button"
      className="btn kecil ikon tombol-lipat"
      aria-expanded={!lipat}
      aria-controls={id}
      aria-label={label}
      title={label}
      onClick={() => onUbah(!lipat)}
    >
      <Ikon nama={lipat ? 'bukaPanel' : 'lipatPanel'} />
    </button>
  )
}

// Jalur ikon sempit saat sidebar dilipat (desktop). `item`: { kunci, label, ikon | teks, to | onKlik, aktif, selesai }.
export function Rail({ lipat, onUbah, id, nama, item }) {
  return (
    <nav className="rail" aria-label={`${nama} (ringkas)`}>
      <TombolLipat lipat={lipat} onUbah={onUbah} id={id} nama={nama} />
      {item.map((it) => {
        const isi = it.ikon ? <Ikon nama={it.ikon} /> : <span aria-hidden="true">{it.teks}</span>
        const kelas = `rail-item ${it.aktif ? 'aktif' : ''} ${it.selesai ? 'selesai' : ''}`
        return it.to ? (
          <Link
            key={it.kunci}
            to={it.to}
            className={kelas}
            aria-label={it.label}
            title={it.label}
            aria-current={it.aktif ? 'page' : undefined}
          >
            {isi}
          </Link>
        ) : (
          <button key={it.kunci} type="button" className={kelas} aria-label={it.label} title={it.label} onClick={it.onKlik}>
            {isi}
          </button>
        )
      })}
    </nav>
  )
}

// Tombol melayang di pojok kanan bawah, hanya tampil di HP.
export function Fab({ buka, onUbah, id, label, atasPager = false }) {
  useEffect(() => {
    if (!buka) return undefined
    const tutup = (e) => e.key === 'Escape' && onUbah(false)
    document.addEventListener('keydown', tutup)
    return () => document.removeEventListener('keydown', tutup)
  }, [buka, onUbah])
  return (
    <button
      type="button"
      className={`fab ${atasPager ? 'di-atas-pager' : ''}`}
      aria-expanded={buka}
      aria-controls={id}
      onClick={() => onUbah(!buka)}
    >
      <Ikon nama={buka ? 'tutup' : 'menu'} ukuran={20} /> {buka ? 'Tutup' : label}
    </button>
  )
}