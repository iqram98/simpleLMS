import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { KotakGalat } from '../components/ui.jsx'
import { useAksi } from '../lib/hooks.js'
import { supabase, ambil } from '../lib/supabase.js'

const LABEL_PERAN = { siswa: 'Siswa', calon_guru: 'Calon guru', guru: 'Guru' }

// Muncul otomatis saat nama masih kosong (FR-02), dan bisa dibuka kapan saja
// dari menu "Profil saya" untuk mengubah nama dan identitas dasar.
export default function Profil() {
  const { uid, profil, muatProfil, keluar } = useAuth()
  const guru = profil?.role === 'guru' || profil?.role === 'calon_guru'
  const pertama = !profil?.full_name
  const [f, setF] = useState({
    full_name: profil?.full_name ?? '',
    jenis_kelamin: profil?.jenis_kelamin ?? '',
    no_hp: profil?.no_hp ?? '',
    nisn: profil?.nisn ?? '',
    nip: profil?.nip ?? '',
    mata_pelajaran: profil?.mata_pelajaran ?? '',
  })
  const [tersimpan, setTersimpan] = useState(false)
  const [galatForm, setGalatForm] = useState('')
  const { sibuk, galat, jalankan } = useAksi()
  const navigate = useNavigate()
  const isi = (k) => (e) => {
    setTersimpan(false)
    setF((lama) => ({ ...lama, [k]: e.target.value }))
  }

  const simpan = (e) => {
    e.preventDefault()
    const nama = f.full_name.trim()
    if (!nama) return
    const hp = f.no_hp.trim()
    if (hp && !/^[0-9+][0-9 -]{6,18}$/.test(hp)) {
      return setGalatForm('Nomor HP hanya berisi angka, spasi, atau tanda hubung (boleh diawali +), 7 sampai 19 karakter.')
    }
    const patch = {
      full_name: nama,
      jenis_kelamin: f.jenis_kelamin || null,
      no_hp: hp || null,
    }
    if (guru) {
      const nip = f.nip.trim()
      if (nip && !/^[0-9]{8,20}$/.test(nip)) return setGalatForm('NIP/NUPTK harus 8 sampai 20 digit angka.')
      patch.nip = nip || null
      patch.mata_pelajaran = f.mata_pelajaran.trim() || null
    } else {
      const nisn = f.nisn.trim()
      if (nisn && !/^[0-9]{10}$/.test(nisn)) return setGalatForm('NISN harus 10 digit angka.')
      patch.nisn = nisn || null
    }
    setGalatForm('')
    jalankan(async () => {
      ambil(await supabase.from('profiles').update(patch).eq('id', uid).select('id'))
      await muatProfil()
      if (pertama) navigate('/', { replace: true })
      else setTersimpan(true)
    })
  }

  return (
    <main className="tengah">
      {!pertama && (
        <div>
          <Link className="btn kecil" to="/">
            ← Beranda
          </Link>
        </div>
      )}
      <h1>{pertama ? 'Lengkapi profilmu' : 'Profil saya'}</h1>
      <p>Nama dan identitas ini dilihat guru di daftar siswa, dan oleh admin. Siswa lain tidak bisa melihatnya.</p>
      <p className="petunjuk">
        Email: {profil?.email} · Peran: {LABEL_PERAN[profil?.role] ?? profil?.role}
        {profil?.is_admin ? ' + Admin' : ''}
      </p>
      <form className="form-tumpuk" onSubmit={simpan}>
        <div className="kolom">
          <label htmlFor="nama">Nama lengkap</label>
          <input id="nama" value={f.full_name} onChange={isi('full_name')} autoComplete="name" required />
        </div>
        {guru ? (
          <>
            <div className="kolom">
              <label htmlFor="nip">NIP / NUPTK (boleh kosong)</label>
              <input id="nip" inputMode="numeric" value={f.nip} onChange={isi('nip')} autoComplete="off" />
            </div>
            <div className="kolom">
              <label htmlFor="mapel">Mata pelajaran (boleh kosong)</label>
              <input id="mapel" value={f.mata_pelajaran} onChange={isi('mata_pelajaran')} maxLength={100} />
            </div>
          </>
        ) : (
          <div className="kolom">
            <label htmlFor="nisn">NISN, 10 digit (boleh kosong)</label>
            <input id="nisn" inputMode="numeric" maxLength={10} value={f.nisn} onChange={isi('nisn')} autoComplete="off" />
          </div>
        )}
        <div className="kolom">
          <label htmlFor="jk">Jenis kelamin (boleh kosong)</label>
          <select id="jk" value={f.jenis_kelamin} onChange={isi('jenis_kelamin')}>
            <option value="">Tidak diisi</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </div>
        <div className="kolom">
          <label htmlFor="hp">Nomor HP (boleh kosong)</label>
          <input id="hp" type="tel" value={f.no_hp} onChange={isi('no_hp')} autoComplete="tel" />
        </div>
        <KotakGalat galat={galatForm || galat} />
        {tersimpan && (
          <p className="info" role="status">
            Profil tersimpan.
          </p>
        )}
        <div className="baris">
          <button type="submit" className="btn utama" disabled={sibuk || !f.full_name.trim()}>
            Simpan
          </button>
          {!pertama && (
            <Link className="btn" to="/">
              Kembali
            </Link>
          )}
        </div>
      </form>
      {pertama && (
        <p className="petunjuk">
          Bukan akunmu? <button type="button" className="btn kecil" onClick={keluar}>Keluar dari akun ini</button>
        </p>
      )}
    </main>
  )
}