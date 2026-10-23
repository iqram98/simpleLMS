import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import { Memuat } from './components/ui.jsx'
import Masuk from './pages/Masuk.jsx'
import Profil from './pages/Profil.jsx'
import Beranda from './pages/Beranda.jsx'
import KelasSiswa from './pages/KelasSiswa.jsx'
import KursusEditor from './pages/KursusEditor.jsx'
import KelolaKelas from './pages/KelolaKelas.jsx'
import Admin from './pages/Admin.jsx'

// Penjaga: harus login, profil harus ada, akun harus aktif, nama harus terisi.
function Terlindungi() {
  const { sesi, profil, galatProfil, memuat, keluar } = useAuth()
  const lokasi = useLocation()

  if (memuat) return <Memuat />
  if (!sesi) return <Navigate to="/masuk" replace />

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
    <Routes>
      <Route path="/masuk" element={<Masuk />} />
      <Route element={<Terlindungi />}>
        <Route path="/profil" element={<Profil />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Beranda />} />
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
  )
}
