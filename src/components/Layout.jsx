import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { useTema } from '../tema/TemaProvider.jsx'

// Di layar kecil tabel menjadi kartu. Label tiap kolom diambil dari judul
// kolomnya, supaya setiap halaman tidak perlu menuliskannya sendiri.
function labeliTabel() {
  document.querySelectorAll('table').forEach((t) => {
    const judul = [...t.querySelectorAll('thead th')].map((th) => th.textContent.trim())
    if (!judul.length) return
    t.querySelectorAll('tbody tr').forEach((tr) => {
      ;[...tr.children].forEach((td, i) => {
        const label = judul[i] ?? ''
        if (td.dataset.label !== label) td.dataset.label = label
      })
    })
  })
}

function Ikon({ gelap }) {
  // Matahari untuk mode terang, bulan untuk mode gelap. Hanya hiasan: artinya ada di label tombol.
  return gelap ? (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor">
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function inisial(nama) {
  const kata = String(nama ?? '').trim().split(/\s+/).filter(Boolean)
  if (!kata.length) return '?'
  return (kata[0][0] + (kata.length > 1 ? kata[kata.length - 1][0] : '')).toUpperCase()
}

export default function Layout() {
  const { profil, adalahAdmin, keluar } = useAuth()
  const { situs, gelap, ganti } = useTema()
  const [menu, setMenu] = useState(false)
  const [akunBuka, setAkunBuka] = useState(false)
  const akunRef = useRef(null)
  const lokasi = useLocation()
  const nama = profil?.full_name || profil?.email || ''

  useEffect(() => {
    setMenu(false)
    setAkunBuka(false)
  }, [lokasi.pathname])
  useEffect(() => {
    labeliTabel()
    const pengamat = new MutationObserver(labeliTabel)
    pengamat.observe(document.body, { childList: true, subtree: true })
    return () => pengamat.disconnect()
  }, [])
  // Menu akun menutup saat klik di luar atau menekan Escape.
  useEffect(() => {
    if (!akunBuka) return
    const luar = (e) => {
      if (akunRef.current && !akunRef.current.contains(e.target)) setAkunBuka(false)
    }
    const esc = (e) => {
      if (e.key === 'Escape') {
        setAkunBuka(false)
        akunRef.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('mousedown', luar)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', luar)
      document.removeEventListener('keydown', esc)
    }
  }, [akunBuka])

  return (
    <>
      <header className="atas">
        <NavLink to="/" className="merek">
          {situs.logo_url && <img src={situs.logo_url} alt="" onError={(e) => (e.currentTarget.hidden = true)} />}
          <span>{situs.nama_situs}</span>
        </NavLink>
        <button
          type="button"
          className="btn kecil tombol-menu"
          aria-expanded={menu}
          aria-controls="menu-utama"
          onClick={() => setMenu((b) => !b)}
        >
          {menu ? 'Tutup' : 'Menu'}
        </button>
        <nav id="menu-utama" className={`nav ${menu ? 'terbuka' : ''}`} aria-label="Menu utama">
          <div className="nav-tautan">
            <NavLink to="/" end>
              Beranda
            </NavLink>
            {adalahAdmin && <NavLink to="/admin">Admin</NavLink>}
          </div>
          <div className="nav-alat">
            <button
              type="button"
              role="switch"
              aria-checked={gelap}
              className="saklar"
              onClick={ganti}
            >
              <span className="saklar-teks">Mode gelap</span>
              <span className="saklar-jalur" aria-hidden="true">
                <span className="saklar-bulat">
                  <Ikon gelap={gelap} />
                </span>
              </span>
            </button>
            <div className="akun" ref={akunRef}>
              <button
                type="button"
                className="avatar"
                aria-expanded={akunBuka}
                aria-controls="menu-akun"
                aria-label={`Akun ${nama}`}
                onClick={() => setAkunBuka((b) => !b)}
              >
                {inisial(profil?.full_name || profil?.email)}
              </button>
              <div id="menu-akun" className={`menu-akun ${akunBuka ? 'terbuka' : ''}`}>
                <div className="akun-info">
                  <strong>{profil?.full_name || 'Tanpa nama'}</strong>
                  <span className="petunjuk">{profil?.email}</span>
                </div>
                <NavLink to="/profil" className="akun-aksi">
                  Profil saya
                </NavLink>
                <button type="button" className="akun-aksi" onClick={keluar}>
                  Keluar
                </button>
              </div>
            </div>
          </div>
        </nav>
      </header>
      <Outlet />
    </>
  )
}