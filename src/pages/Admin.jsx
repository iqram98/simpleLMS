import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { Kosong, KotakGalat, Memuat, TombolKonfirmasi } from '../components/ui.jsx'
import { useAksi, useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'
import TampilanSitus from './TampilanSitus.jsx'

const LABEL_PERAN = { siswa: 'Siswa', calon_guru: 'Calon guru', guru: 'Guru' }

// Halaman admin: menyetujui guru, mengatur pengguna, melihat semua kursus.
export default function Admin() {
  const { uid } = useAuth()
  const [cari, setCari] = useState('')
  const { sibuk, galat, setGalat, jalankan } = useAksi()

  const { data, error, memuat, muatUlang } = useMuat(async () => {
    const [pengguna, kursus] = await Promise.all([
      supabase.from('profiles').select('id,email,full_name,role,is_admin,is_active,nisn,nip,mata_pelajaran,no_hp').order('email'),
      supabase
        .from('courses')
        .select('id,title,owner:profiles!courses_owner_id_fkey(full_name,email),classes(id)')
        .order('created_at'),
    ])
    return { pengguna: ambil(pengguna), kursus: ambil(kursus) }
  }, [])

  const tampil = useMemo(() => {
    if (!data) return []
    const k = cari.trim().toLowerCase()
    if (!k) return data.pengguna
    return data.pengguna.filter((p) => `${p.full_name ?? ''} ${p.email} ${p.nisn ?? ''} ${p.nip ?? ''}`.toLowerCase().includes(k))
  }, [data, cari])

  if (memuat && !data) return <Memuat />
  if (error) {
    return (
      <main className="halaman">
        <KotakGalat galat={pesanError(error)} />
      </main>
    )
  }

  const calon = data.pengguna.filter((p) => p.role === 'calon_guru')
  const atur = (p, { peran = p.role, admin = p.is_admin, aktif = p.is_active }) =>
    jalankan(async () => {
      ambil(await supabase.rpc('atur_pengguna', { pengguna: p.id, peran_baru: peran, jadikan_admin: admin, aktif }))
      await muatUlang()
    })

  return (
    <main className="halaman">
      <div className="baris">
        <Link className="btn kecil" to="/">
          ← Beranda
        </Link>
      </div>
      <h1>Admin</h1>
      <KotakGalat galat={galat} onTutup={() => setGalat('')} />

      <TampilanSitus />

      <section className="bagian" aria-labelledby="judul-calon">
        <h2 id="judul-calon">Pengajuan guru ({calon.length})</h2>
        {calon.length === 0 ? (
          <Kosong>Tidak ada pengajuan.</Kosong>
        ) : (
          <div className="tabel-bungkus">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {calon.map((p) => (
                  <tr key={p.id}>
                    <td>{p.full_name || '(belum ada nama)'}</td>
                    <td>{p.email}</td>
                    <td>
                      <div className="baris rapat">
                        <button type="button" className="btn kecil utama" disabled={sibuk} onClick={() => atur(p, { peran: 'guru' })}>
                          Setujui
                        </button>
                        <button type="button" className="btn kecil" disabled={sibuk} onClick={() => atur(p, { peran: 'siswa' })}>
                          Tolak
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bagian" aria-labelledby="judul-pengguna">
        <h2 id="judul-pengguna">Semua pengguna ({data.pengguna.length})</h2>
        <div className="kolom">
          <label htmlFor="cari-pengguna">Cari nama atau email</label>
          <input id="cari-pengguna" value={cari} onChange={(e) => setCari(e.target.value)} />
        </div>
        <div className="tabel-bungkus">
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Identitas</th>
                <th>Peran</th>
                <th>Status</th>
                <th>
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tampil.map((p) => {
                const saya = p.id === uid
                return (
                  <tr key={p.id}>
                    <td>{p.full_name || '(belum ada nama)'}</td>
                    <td>{p.email}</td>
                    <td>
                      {[p.nisn && `NISN ${p.nisn}`, p.nip && `NIP ${p.nip}`, p.mata_pelajaran, p.no_hp]
                        .filter(Boolean)
                        .join(' · ') || '-'}
                    </td>
                    <td>
                      {LABEL_PERAN[p.role] ?? p.role}
                      {p.is_admin && <span className="lencana">Admin</span>}
                    </td>
                    <td>{p.is_active ? 'Aktif' : 'Dinonaktifkan'}</td>
                    <td>
                      {saya ? (
                        <span className="petunjuk">Akun Anda</span>
                      ) : (
                        <div className="baris rapat">
                          {p.role === 'guru' ? (
                            <TombolKonfirmasi
                              label="Jadikan siswa"
                              tanya="Guru ini tidak bisa lagi mengelola kursus. Lanjut?"
                              disabled={sibuk}
                              onYakin={() => atur(p, { peran: 'siswa', admin: false })}
                            />
                          ) : (
                            <button type="button" className="btn kecil" disabled={sibuk} onClick={() => atur(p, { peran: 'guru' })}>
                              Jadikan guru
                            </button>
                          )}
                          {p.role === 'guru' && (
                            <button type="button" className="btn kecil" disabled={sibuk} onClick={() => atur(p, { admin: !p.is_admin })}>
                              {p.is_admin ? 'Cabut admin' : 'Jadikan admin'}
                            </button>
                          )}
                          <button type="button" className="btn kecil" disabled={sibuk} onClick={() => atur(p, { aktif: !p.is_active })}>
                            {p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {tampil.length === 0 && <Kosong>Tidak ada pengguna yang cocok.</Kosong>}
      </section>

      <section className="bagian" aria-labelledby="judul-semua-kursus">
        <h2 id="judul-semua-kursus">Semua kursus ({data.kursus.length})</h2>
        {data.kursus.length === 0 ? (
          <Kosong>Belum ada kursus.</Kosong>
        ) : (
          <div className="tabel-bungkus">
            <table>
              <thead>
                <tr>
                  <th>Kursus</th>
                  <th>Pemilik</th>
                  <th>Kelas</th>
                  <th>
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.kursus.map((k) => (
                  <tr key={k.id}>
                    <td>{k.title}</td>
                    <td>{k.owner?.full_name || k.owner?.email}</td>
                    <td>{k.classes.length}</td>
                    <td>
                      <Link className="btn kecil" to={`/kursus/${k.id}`}>
                        Buka
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}