import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import Tooltip from './components/Tooltip.jsx'
import { Memuat } from './components/ui.jsx'
import Masuk from './pages/Masuk.jsx'
import Profil from './pages/Profil.jsx'
import Beranda from './pages/Beranda.jsx'
import Katalog from './katalog/Katalog.jsx'
import Forum from './forum/Forum.jsx'
import KelasSiswa from './pages/KelasSiswa.jsx'
import KursusEditor from './pages/KursusEditor.jsx'
import KelolaKelas from './pages/KelolaKelas.jsx'
import Admin from './pages/Admin.jsx'

// Halaman publik dimuat hanya saat dibutuhkan.
const Landing = lazy(() => import('./landing/Landing.jsx'))
const Privasi = lazy(() => import('./landing/Privasi.jsx'))
const Syarat = lazy(() => import('./landing/Syarat.jsx'))
const publik = (el) => <Suspense fallback={<Memuat bentuk="layar" />}>{el}</Suspense>

// Penjaga: harus login, profil harus ada, akun harus aktif, nama harus terisi.
function Terlindungi() {
  const { sesi, profil, galatProfil, memuat, keluar } = useAuth()
  const lokasi = useLocation()

  if (memuat) return <Memuat bentuk="layar" />
  // Pengunjung yang belum masuk melihat halaman awal di alamat utama, dan diarahkan ke halaman masuk di alamat lain.
  if (!sesi) return lokasi.pathname === '/' ? publik(<Landing />) : <Navigate to="/masuk" replace />

  if (!profil) {
    return (
      <main className="tengah">
        <h1>Profil akun tidak ditemukan</h1>
        <p>{galatProfil || 'Hubungi admin.'}</p>
        <button type="button" className="btn" onClick={keluar}>
          Keluar
        </button>
      </main>
    )
  }
  if (!profil.is_active) {
    return (
      <main className="tengah">
        <h1>Akun dinonaktifkan</h1>
        <p>Akun ini tidak dapat dipakai. Hubungi admin sekolah.</p>
        <button type="button" className="btn" onClick={keluar}>
          Keluar
        </button>
      </main>
    )
  }
  if (!profil.full_name && lokasi.pathname !== '/profil') {
    return <Navigate to="/profil" replace />
  }
  return <Outlet />
}

function HanyaGuru() {
  const { adalahGuru, adalahAdmin } = useAuth()
  return adalahGuru || adalahAdmin ? <Outlet /> : <Navigate to="/" replace />
}

function HanyaAdmin() {
  const { adalahAdmin } = useAuth()
  return adalahAdmin ? <Outlet /> : <Navigate to="/" replace />
}

export default function App() {
  return (
    <>
      <Tooltip />
      <Routes>
        <Route path="/masuk" element={<Masuk />} />
        <Route path="/privasi" element={publik(<Privasi />)} />
        <Route path="/syarat" element={publik(<Syarat />)} />
        <Route element={<Terlindungi />}>
          <Route path="/profil" element={<Profil />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Beranda />} />
            <Route path="/katalog" element={<Katalog />} />
            <Route path="/kelas/:kelasId/forum/:topikId?" element={<Forum />} />
            <Route path="/kelas/:kelasId/:pelajaranId?" element={<KelasSiswa />} />
            <Route element={<HanyaGuru />}>
              <Route path="/kursus/:kursusId/:pelajaranId?" element={<KursusEditor />} />
              <Route path="/kelola/:kelasId" element={<KelolaKelas />} />
            </Route>
            <Route element={<HanyaAdmin />}>
              <Route path="/admin" element={<Admin />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}