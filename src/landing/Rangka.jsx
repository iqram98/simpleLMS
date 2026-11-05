import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { LogoSitus } from '../components/Logo.jsx'
import { useTema } from '../tema/TemaProvider.jsx'
import { KONTAK } from './isi.js'
import { daftarKontak } from './kontak.js'

export function Atas() {
  const { sesi } = useAuth()
  const { situs } = useTema()
  return (
    <header className="lp-atas">
      <div className="lp-lebar lp-atas-isi">
        <Link to="/" className="lp-merek">
          <LogoSitus url={situs.logo_url} ukuran={40} kelas="lp-logo" />
          <span>{situs.nama_situs}</span>
        </Link>
        <Link to={sesi ? '/' : '/masuk'} className="lp-btn lp-btn-putih lp-btn-kecil">
          {sesi ? 'Buka beranda' : 'Masuk'}
        </Link>
      </div>
    </header>
  )
}

export function Kaki() {
  const { situs } = useTema()
  const kontak = daftarKontak(KONTAK)
  return (
    <footer className="lp-kaki">
      <div className="lp-lebar lp-kaki-isi">
        <div className="lp-kaki-kolom">
          <div className="lp-kaki-merek">
            <LogoSitus url={situs.logo_url} ukuran={40} kelas="lp-logo" />
            <span>{situs.nama_situs}</span>
          </div>
          <p>Kelas online sederhana untuk guru dan siswa.</p>
        </div>
        {kontak.length > 0 && (
          <div className="lp-kaki-kolom">
            <h3>Hubungi kami</h3>
            {kontak.map((k) => (
              <p key={k.kunci}>
                {k.label}:{' '}
                {k.href ? (
                  <a href={k.href} target={k.kunci === 'email' ? undefined : '_blank'} rel="noopener noreferrer">
                    {k.teks}
                  </a>
                ) : (
                  k.teks
                )}
              </p>
            ))}
          </div>
        )}
        <div className="lp-kaki-kolom">
          <h3>Informasi</h3>
          <Link to="/privasi">Kebijakan Privasi</Link>
          <Link to="/syarat">Syarat Penggunaan</Link>
        </div>
      </div>
      <div className="lp-lebar">
        <p className="lp-hakcipta">
          © {new Date().getFullYear()} {KONTAK.pengelola.trim() || situs.nama_situs}. Semua hak dilindungi.
        </p>
      </div>
    </footer>
  )
}