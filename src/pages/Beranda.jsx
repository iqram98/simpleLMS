import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { Kosong, KotakGalat, LencanaStatus, Memuat, TombolKonfirmasi } from '../components/ui.jsx'
import { useAksi, useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'

const PESAN_GABUNG = {
  menunggu: 'Permintaan terkirim. Tunggu persetujuan guru, lalu kelasmu akan muncul di sini.',
  sudah_aktif: 'Kamu sudah bergabung di kelas ini.',
  kode_tidak_valid: 'Kode tidak ditemukan atau kelas sudah ditutup. Periksa kembali kode dari gurumu.',
}

export default function Beranda() {
  const { profil, adalahGuru, adalahAdmin } = useAuth()
  const guru = profil.role === 'guru' || profil.role === 'calon_guru'
  const identitasKosong = guru ? !profil.nip : !profil.nisn
  return (
    <main className="halaman">
      <h1>Halo, {profil.full_name}</h1>
      {identitasKosong && (
        <p className="info">
          Identitasmu belum lengkap. <Link to="/profil">Lengkapi profil</Link> (boleh nanti).
        </p>
      )}
      {profil.role === 'calon_guru' && <PengajuanGuruMenunggu />}
      {(adalahGuru || adalahAdmin) && <KursusSaya />}
      <KelasDiikuti />
      {profil.role === 'siswa' && !profil.is_admin && <AjukanGuru />}
    </main>
  )
}

/* ---------- kelas yang saya ikuti (siswa, dan guru sebagai siswa) ---------- */

function KelasDiikuti() {
  const { uid } = useAuth()
  const { data, error, memuat, muatUlang } = useMuat(async () => {
    const daftar = ambil(
      await supabase
        .from('enrollments')
        .select('id,status,class_id,requested_at')
        .eq('user_id', uid)
        .order('requested_at', { ascending: false }),
    )
    if (!daftar.length) return []
    // Kelas berstatus ditolak atau dikeluarkan tidak lagi terbaca siswa (RLS).
    const kelas = ambil(
      await supabase
        .from('classes')
        .select('id,name')
        .in(
          'id',
          daftar.map((d) => d.class_id),
        ),
    )
    const nama = Object.fromEntries(kelas.map((k) => [k.id, k.name]))
    return daftar.map((d) => ({ ...d, nama: nama[d.class_id] ?? null }))
  }, [uid])

  return (
    <section className="bagian" aria-labelledby="judul-kelas">
      <h2 id="judul-kelas">Kelas yang saya ikuti</h2>
      {memuat && !data && <Memuat />}
      <KotakGalat galat={error && pesanError(error)} />
      {data && data.length === 0 && <Kosong>Belum ada kelas. Masukkan kode kelas dari gurumu di bawah.</Kosong>}
      {data && data.length > 0 && (
        <div className="kartu-grid">
          {data.map((d) => (
            <div className="kartu" key={d.id}>
              <h3>{d.nama ?? 'Kelas tidak tersedia'}</h3>
              <div>
                <LencanaStatus status={d.status} />
              </div>
              {d.status === 'aktif' && (
                <div className="baris">
                  <Link className="btn utama" to={`/kelas/${d.class_id}`}>
                    Buka kelas
                  </Link>
                </div>
              )}
              {d.status === 'menunggu' && <p className="petunjuk">Menunggu guru menyetujui permintaanmu.</p>}
              {(d.status === 'ditolak' || d.status === 'dikeluarkan') && (
                <p className="petunjuk">Masukkan kode kelas lagi bila ingin mengajukan ulang.</p>
              )}
            </div>
          ))}
        </div>
      )}
      <GabungKelas onSelesai={muatUlang} />
    </section>
  )
}

function GabungKelas({ onSelesai }) {
  const [kode, setKode] = useState('')
  const [pesan, setPesan] = useState('')
  const { sibuk, galat, jalankan } = useAksi()

  const kirim = (e) => {
    e.preventDefault()
    if (!kode.trim()) return
    jalankan(async () => {
      const hasil = ambil(await supabase.rpc('ajukan_gabung', { kode }))
      setPesan(PESAN_GABUNG[hasil] ?? 'Selesai.')
      if (hasil !== 'kode_tidak_valid') setKode('')
      onSelesai()
    })
  }

  return (
    <form className="panel" onSubmit={kirim}>
      <h3>Gabung ke kelas</h3>
      <div className="form-baris">
        <div className="kolom">
          <label htmlFor="kode-kelas">Kode kelas</label>
          <input
            id="kode-kelas"
            value={kode}
            onChange={(e) => setKode(e.target.value.toUpperCase())}
            maxLength={12}
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="8 huruf dan angka"
          />
        </div>
        <button type="submit" className="btn utama" disabled={sibuk || !kode.trim()}>
          Gabung
        </button>
      </div>
      <KotakGalat galat={galat} />
      {pesan && (
        <p className="info" role="status">
          {pesan}
        </p>
      )}
    </form>
  )
}

/* ---------- kursus saya (guru) ---------- */

function KursusSaya() {
  const { uid } = useAuth()
  const navigate = useNavigate()
  const [judul, setJudul] = useState('')
  const { sibuk, galat, jalankan } = useAksi()

  const { data, error, memuat } = useMuat(
    async () =>
      ambil(
        await supabase
          .from('courses')
          .select('id,title,description,classes(id,name,is_archived)')
          .eq('owner_id', uid)
          .order('created_at'),
      ),
    [uid],
  )

  const buat = (e) => {
    e.preventDefault()
    const bersih = judul.trim()
    if (!bersih) return
    jalankan(async () => {
      const baru = ambil(
        await supabase.from('courses').insert({ owner_id: uid, title: bersih }).select('id').single(),
      )
      setJudul('')
      navigate(`/kursus/${baru.id}`)
    })
  }

  return (
    <section className="bagian" aria-labelledby="judul-kursus">
      <h2 id="judul-kursus">Kursus saya</h2>
      <p className="petunjuk">
        Satu kursus berisi modul dan pelajaran, dan bisa dipakai beberapa kelas paralel (misalnya 8A dan 8B).
      </p>
      {memuat && !data && <Memuat />}
      <KotakGalat galat={error && pesanError(error)} />
      {data && data.length === 0 && <Kosong>Belum ada kursus. Buat kursus pertamamu di bawah.</Kosong>}
      {data && data.length > 0 && (
        <div className="kartu-grid">
          {data.map((k) => (
            <div className="kartu" key={k.id}>
              <h3>{k.title}</h3>
              <p className="petunjuk">
                {k.classes.length === 0
                  ? 'Belum ada kelas'
                  : k.classes
                      .map((c) => c.name + (c.is_archived ? ' (arsip)' : ''))
                      .join(', ')}
              </p>
              <div className="baris">
                <Link className="btn utama" to={`/kursus/${k.id}`}>
                  Kelola isi
                </Link>
                {k.classes.map((c) => (
                  <Link key={c.id} className="btn kecil" to={`/kelola/${c.id}`}>
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <form className="panel" onSubmit={buat}>
        <h3>Buat kursus baru</h3>
        <div className="form-baris">
          <div className="kolom">
            <label htmlFor="judul-kursus-baru">Judul kursus</label>
            <input
              id="judul-kursus-baru"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: Informatika Kelas 8"
            />
          </div>
          <button type="submit" className="btn utama" disabled={sibuk || !judul.trim()}>
            Buat kursus
          </button>
        </div>
        <KotakGalat galat={galat} />
      </form>
    </section>
  )
}

/* ---------- pengajuan jadi guru ---------- */

function AjukanGuru() {
  const { muatProfil } = useAuth()
  const { sibuk, galat, jalankan } = useAksi()
  return (
    <details className="panel">
      <summary>Saya seorang guru</summary>
      <div className="bagian">
        <p>
          Ajukan akunmu sebagai guru. Admin akan memeriksa lalu menyetujui. Sebelum disetujui, akunmu tetap berperan
          siswa.
        </p>
        <KotakGalat galat={galat} />
        <div>
          <TombolKonfirmasi
            label="Ajukan sebagai guru"
            tanya="Kirim pengajuan?"
            disabled={sibuk}
            onYakin={() =>
              jalankan(async () => {
                ambil(await supabase.rpc('ajukan_jadi_guru'))
                await muatProfil()
              })
            }
          />
        </div>
      </div>
    </details>
  )
}

function PengajuanGuruMenunggu() {
  const { muatProfil } = useAuth()
  const { sibuk, galat, jalankan } = useAksi()
  return (
    <div className="info baris sebar">
      <span>Pengajuanmu sebagai guru menunggu persetujuan admin. Sementara itu kamu tetap bisa belajar sebagai siswa.</span>
      <button
        type="button"
        className="btn kecil"
        disabled={sibuk}
        onClick={() =>
          jalankan(async () => {
            ambil(await supabase.rpc('batalkan_pengajuan_guru'))
            await muatProfil()
          })
        }
      >
        Batalkan pengajuan
      </button>
      <KotakGalat galat={galat} />
    </div>
  )
}