import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { Kosong, KotakGalat, LencanaStatus, Memuat } from '../components/ui.jsx'
import { Bintang } from '../ulasan/Bintang.jsx'
import { teksRating } from '../ulasan/aturan.js'
import UlasanKursus from '../ulasan/UlasanKursus.jsx'
import { useAksi, useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'
import { PESAN_KATALOG, labelHarga, saringKatalog, tombolKatalog } from './aturan.js'

// Katalog kursus publik. Hanya judul, deskripsi, guru, dan label yang terlihat
// sebelum siswa bergabung; isi materi tetap terkunci.
export default function Katalog() {
  const { adalahAdmin } = useAuth()
  const [kata, setKata] = useState('')
  const [harga, setHarga] = useState('semua')
  const [pesan, setPesan] = useState('')
  const [sedang, setSedang] = useState(null)
  const { sibuk, galat, jalankan } = useAksi()

  const { data, error, memuat, muatUlang } = useMuat(async () => ambil(await supabase.rpc('katalog_kursus')), [])
  const tampil = useMemo(() => saringKatalog(data, kata, harga), [data, kata, harga])

  const gabung = (kursus) => {
    setSedang(kursus.id)
    setPesan('')
    jalankan(async () => {
      const hasil = ambil(await supabase.rpc('gabung_katalog', { kursus: kursus.id }))
      setPesan(`${kursus.title}: ${PESAN_KATALOG[hasil] ?? 'Selesai.'}`)
      await muatUlang()
    }).finally(() => setSedang(null))
  }

  return (
    <main className="halaman">
      <div>
        <h1>Katalog kursus</h1>
        <p className="petunjuk">
          Jelajahi kursus yang dibuka untuk umum, lalu gabung atau ajukan. Punya kode kelas? Masukkan di Beranda.
        </p>
      </div>

      <div className="form-baris">
        <div className="kolom">
          <label htmlFor="cari-katalog">Cari kursus</label>
          <input
            id="cari-katalog"
            type="search"
            value={kata}
            onChange={(e) => setKata(e.target.value)}
            placeholder="Judul, deskripsi, atau nama guru"
            autoComplete="off"
          />
        </div>
        <div className="kolom">
          <label htmlFor="harga-katalog">Jenis</label>
          <select id="harga-katalog" value={harga} onChange={(e) => setHarga(e.target.value)}>
            <option value="semua">Semua</option>
            <option value="gratis">Gratis</option>
            <option value="premium">Premium</option>
          </select>
        </div>
      </div>

      <KotakGalat galat={galat || (error && pesanError(error))} />
      {pesan && (
        <p className="info" role="status">
          {pesan}
        </p>
      )}
      {memuat && !data && <Memuat bentuk="daftar" />}
      {data && data.length === 0 && <Kosong>Belum ada kursus di katalog.</Kosong>}
      {data && data.length > 0 && tampil.length === 0 && <Kosong>Tidak ada kursus yang cocok dengan pencarianmu.</Kosong>}

      {tampil.length > 0 && (
        <div className="kartu-grid">
          {tampil.map((k) => {
            const t = tombolKatalog(k)
            return (
              <article className="kartu kartu-katalog" key={k.id}>
                <div className="label-kursus">
                  <span className={`lencana harga-${k.harga_tipe}`}>{labelHarga(k.harga_tipe)}</span>
                  {t.status && <LencanaStatus status={t.status} />}
                </div>
                <h3>{k.title}</h3>
                <p className="petunjuk">Oleh {k.nama_guru}</p>
                <p className="ringkas-ulasan">
                  <Bintang nilai={k.rata_rata} />
                  <span>{teksRating(k.rata_rata, k.jumlah_ulasan)}</span>
                </p>
                {k.description && <p className="deskripsi-katalog">{k.description}</p>}
                {t.info && <p className="petunjuk">{t.info}</p>}
                <LihatUlasan kursusId={k.id} bisaSembunyikan={adalahAdmin} onBerubah={muatUlang} />
                <div className="kartu-aksi">
                  {t.aksi ? (
                    <button type="button" className="btn utama" disabled={sibuk} onClick={() => gabung(k)}>
                      {sedang === k.id ? 'Memproses…' : t.teks}
                    </button>
                  ) : k.milik_saya ? (
                    <Link className="btn" to={`/kursus/${k.id}`}>
                      Kelola kursus
                    </Link>
                  ) : (
                    <span className="petunjuk">{t.teks}</span>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </main>
  )
}

// Ulasan baru dimuat saat panel dibuka, supaya katalog tidak memanggil server untuk setiap kartu.
function LihatUlasan({ kursusId, bisaSembunyikan, onBerubah }) {
  const [buka, setBuka] = useState(false)
  return (
    <details className="lihat-ulasan" onToggle={(e) => setBuka(e.currentTarget.open)}>
      <summary>Lihat ulasan</summary>
      {buka && <UlasanKursus kursusId={kursusId} bisaSembunyikan={bisaSembunyikan} onBerubah={onBerubah} />}
    </details>
  )
}