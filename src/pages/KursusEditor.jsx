import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import BlokForm from '../components/BlokForm.jsx'
import DaftarSoal from '../ujian/DaftarSoal.jsx'
import PanelUjian from '../ujian/PanelUjian.jsx'
import PengaturanUjian from '../ujian/PengaturanUjian.jsx'
import HasilUjianGuru from '../ujian/HasilUjianGuru.jsx'
import PanelTugas from '../tugas/PanelTugas.jsx'
import PengaturanTugas from '../tugas/PengaturanTugas.jsx'
import PengumpulanTugas from '../tugas/PengumpulanTugas.jsx'
import { BlokView, DaftarBlok } from '../components/Isi.jsx'
import PengaturanKatalog from '../katalog/PengaturanKatalog.jsx'
import KelompokKursus from '../kelompok/KelompokKursus.jsx'
import UlasanKursus from '../ulasan/UlasanKursus.jsx'
import Ikon, { TautanIkon, TombolIkon } from '../components/Ikon.jsx'
import { Fab, Rail, TombolLipat, useSampingLipat } from '../components/Samping.jsx'
import { Kosong, KotakGalat, MenuTitik, Memuat, TombolKonfirmasi, TombolSalin, UbahDiTempat } from '../components/ui.jsx'
import { posisiBerikut, susunUlang, useAksi, useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'

// Editor kursus untuk guru: modul, pelajaran, dan blok konten.
export default function KursusEditor() {
  const { kursusId, pelajaranId } = useParams()
  const { uid, adalahAdmin } = useAuth()
  const navigate = useNavigate()
  const { sibuk, galat, setGalat, jalankan } = useAksi()
  const [terbuka, setTerbuka] = useState(() => new Set())
  const [tambahDi, setTambahDi] = useState(null) // 'modul' | { modulId, jenis }
  const [sampingBuka, setSampingBuka] = useState(false)
  const [lipat, setLipat] = useSampingLipat('lms.samping.guru')
  const [ubahNama, setUbahNama] = useState(null)

  const { data, error, memuat, muatUlang } = useMuat(async () => {
    const [kursus, modul, kelas] = await Promise.all([
      supabase
        .from('courses')
        .select('id,title,description,owner_id,visibilitas,harga_tipe,kelas_publik_id')
        .eq('id', kursusId)
        .maybeSingle(),
      supabase
        .from('modules')
        .select('id,title,position,lessons(id,title,position,is_published,kind)')
        .eq('course_id', kursusId)
        .order('position')
        .order('position', { referencedTable: 'lessons' }),
      supabase.from('classes').select('id,name,join_code,is_archived').eq('course_id', kursusId).order('created_at'),
    ])
    return { kursus: ambil(kursus), modul: ambil(modul), kelas: ambil(kelas) }
  }, [kursusId])

  const semuaPelajaran = data ? data.modul.flatMap((m) => m.lessons.map((l) => ({ ...l, modul: m }))) : []
  const sekarang = pelajaranId ? (semuaPelajaran.find((l) => l.id === pelajaranId) ?? null) : null

  useEffect(() => {
    setSampingBuka(false)
  }, [pelajaranId])

  const modulSekarangId = sekarang?.modul.id ?? null
  useEffect(() => {
    if (modulSekarangId) setTerbuka((t) => new Set(t).add(modulSekarangId))
  }, [modulSekarangId])

  if (memuat && !data) return <Memuat bentuk="halaman" />
  if (error) {
    return (
      <main className="halaman">
        <KotakGalat galat={pesanError(error)} />
      </main>
    )
  }
  if (!data.kursus || (data.kursus.owner_id !== uid && !adalahAdmin)) {
    return (
      <main className="halaman">
        <h1>Kursus tidak tersedia</h1>
        <p>Kursus tidak ditemukan atau bukan milik Anda.</p>
        <div>
          <Link className="btn" to="/">
            Kembali ke beranda
          </Link>
        </div>
      </main>
    )
  }

  const { kursus, modul, kelas } = data
  const semuaTerbuka = modul.length > 0 && modul.every((m) => terbuka.has(m.id))

  // Menjalankan perubahan lalu memuat ulang daftar.
  const ubah = (fungsi) =>
    jalankan(async () => {
      const hasil = await fungsi()
      await muatUlang()
      return hasil
    })

  /* ----- modul ----- */
  const tambahModul = (judul) =>
    ubah(async () => {
      ambil(
        await supabase
          .from('modules')
          .insert({
            course_id: kursusId,
            title: judul,
            position: posisiBerikut(modul),
          })
          .select('id'),
      )
    })
  const ubahModul = (id, judul) =>
    ubah(async () => ambil(await supabase.from('modules').update({ title: judul }).eq('id', id).select('id')))
  const hapusModul = (id) =>
    ubah(async () => {
      ambil(await supabase.from('modules').delete().eq('id', id).select('id'))
      if (sekarang?.modul.id === id) navigate(`/kursus/${kursusId}`)
    })
  const geserDaftar = (tabel, daftar, indeks, arah) =>
    ubah(async () => {
      const perubahan = susunUlang(daftar, indeks, arah)
      const hasil = await Promise.all(perubahan.map((p) => supabase.from(tabel).update({ position: p.position }).eq('id', p.id)))
      hasil.forEach((h) => {
        if (h.error) throw h.error
      })
    })

  /* ----- pelajaran ----- */
  const tambahPelajaran = (modulItem, judul, kind = 'pelajaran') =>
    jalankan(async () => {
      const baru = ambil(
        await supabase
          .from('lessons')
          .insert({
            module_id: modulItem.id,
            title: judul,
            kind,
            position: posisiBerikut(modulItem.lessons),
          })
          .select('id')
          .single(),
      )
      await muatUlang()
      navigate(`/kursus/${kursusId}/${baru.id}`)
    })

  /* ----- kursus ----- */
  const ubahKursus = (patch) =>
    ubah(async () => ambil(await supabase.from('courses').update(patch).eq('id', kursusId).select('id')))
  const hapusKursus = () =>
    jalankan(async () => {
      ambil(await supabase.from('courses').delete().eq('id', kursusId).select('id'))
      navigate('/')
    })
  const simpanKatalog = ({ mode, harga, kelas }) =>
    ubah(async () => ambil(await supabase.rpc('atur_katalog', { kursus: kursusId, mode, harga, kelas })))
  const buatKelas = (nama) =>
    ubah(async () => ambil(await supabase.from('classes').insert({ course_id: kursusId, name: nama }).select('id')))

  return (
    <div className={`kursus ${lipat ? 'lipat' : ''}`}>
      <aside className={`samping ${sampingBuka ? 'terbuka' : ''}`} id="samping-kursus" aria-label="Susunan kursus">
        <div className="samping-kepala">
          <div className="samping-alat">
            <TautanIkon komponen={Link} to="/" ikon="rumah" label="Beranda" />
            <span className="rapat-kanan" />
            <TombolIkon
              ikon={semuaTerbuka ? 'tutupSemua' : 'bukaSemua'}
              label={semuaTerbuka ? 'Tutup semua modul' : 'Buka semua modul'}
              onClick={() => setTerbuka(semuaTerbuka ? new Set() : new Set(modul.map((m) => m.id)))}
            />
            <TombolIkon ikon="tambah" label="Tambah modul" disabled={sibuk} onClick={() => setTambahDi('modul')} />
            <TombolLipat lipat={lipat} onUbah={setLipat} id="samping-kursus" nama="susunan kursus" />
          </div>
          <h2>{kursus.title}</h2>
          <Link to={`/kursus/${kursusId}`} className={`pelajaran ${!sekarang ? 'sekarang' : ''}`}>
            Ringkasan kursus dan kelas
          </Link>
          {tambahDi === 'modul' && (
            <FormNama
              awal=""
              label="Judul modul"
              onSimpan={async (v) => {
                await tambahModul(v)
                setTambahDi(null)
              }}
              onBatal={() => setTambahDi(null)}
            />
          )}
        </div>

        {modul.map((m, mi) => {
          const buka = terbuka.has(m.id)
          const jenisTambah = tambahDi?.modulId === m.id ? tambahDi.jenis : null
          const pilihJenis = (jenis) => {
            setTerbuka((t) => new Set(t).add(m.id))
            setTambahDi({ modulId: m.id, jenis })
          }
          return (
            <div className="modul" key={m.id}>
              <BarisModul judul={m.title}>
                <button
                  type="button"
                  className={`modul-kepala ${buka ? 'buka' : ''}`}
                  aria-expanded={buka}
                  onClick={() =>
                    setTerbuka((t) => {
                      const baru = new Set(t)
                      if (baru.has(m.id)) baru.delete(m.id)
                      else baru.add(m.id)
                      return baru
                    })
                  }
                >
                  <span className="modul-nama">{m.title}</span>
                  <span className="petunjuk">{m.lessons.length}</span>
                  <span aria-hidden="true">{buka ? '▾' : '▸'}</span>
                </button>
                <span className="modul-alat">
                  <MenuTitik
                    ikon={<Ikon nama="tambah" />}
                    label={`Tambah ke modul ${m.title}`}
                    disabled={sibuk}
                    item={[
                      { label: 'Pelajaran', onPilih: () => pilihJenis('pelajaran') },
                      { label: 'Ujian', onPilih: () => pilihJenis('ujian') },
                      { label: 'Tugas', onPilih: () => pilihJenis('tugas') },
                    ]}
                  />
                  <MenuTitik
                    ikon="⚙"
                    label={`Aksi untuk modul ${m.title}`}
                    disabled={sibuk}
                    item={[
                      { label: 'Ubah nama modul', onPilih: () => setUbahNama(m.id) },
                      { label: 'Naikkan modul', nonaktif: mi === 0, onPilih: () => geserDaftar('modules', modul, mi, -1) },
                      {
                        label: 'Turunkan modul',
                        nonaktif: mi === modul.length - 1,
                        onPilih: () => geserDaftar('modules', modul, mi, 1),
                      },
                      {
                        label: 'Hapus modul',
                        bahaya: true,
                        konfirmasi: 'Modul dan semua pelajarannya ikut terhapus. Lanjut?',
                        onPilih: () => hapusModul(m.id),
                      },
                    ]}
                  />
                </span>
              </BarisModul>
              {ubahNama === m.id && (
                <FormNama
                  awal={m.title}
                  label="Nama modul"
                  onSimpan={async (v) => {
                    await ubahModul(m.id, v)
                    setUbahNama(null)
                  }}
                  onBatal={() => setUbahNama(null)}
                />
              )}
              {buka && (
                <>
                  <ul>
                    {m.lessons.map((l) => (
                      <li key={l.id}>
                        <Link
                          to={`/kursus/${kursusId}/${l.id}`}
                          className={`pelajaran ${sekarang?.id === l.id ? 'sekarang' : ''}`}
                        >
                          <span>{l.title}</span>
                          {l.kind === 'ujian' && <span className="lencana">Ujian</span>}
                          {l.kind === 'tugas' && <span className="lencana">Tugas</span>}
                          {!l.is_published && <span className="lencana">Draft</span>}
                        </Link>
                      </li>
                    ))}
                    {m.lessons.length === 0 && !jenisTambah && <li className="petunjuk">Modul ini masih kosong.</li>}
                  </ul>
                  {jenisTambah && (
                    <FormNama
                      awal=""
                      label={
                        jenisTambah === 'ujian' ? 'Judul ujian' : jenisTambah === 'tugas' ? 'Judul tugas' : 'Judul pelajaran'
                      }
                      onSimpan={async (v) => {
                        await tambahPelajaran(m, v, jenisTambah)
                        setTambahDi(null)
                      }}
                      onBatal={() => setTambahDi(null)}
                    />
                  )}
                </>
              )}
            </div>
          )
        })}
      </aside>
      <Rail
        lipat={lipat}
        onUbah={setLipat}
        id="samping-kursus"
        nama="susunan kursus"
        item={[
          { kunci: 'rumah', label: 'Beranda', ikon: 'rumah', to: '/' },
          { kunci: 'ringkasan', label: 'Ringkasan kursus dan kelas', ikon: 'buku', to: `/kursus/${kursusId}`, aktif: !sekarang },
          ...modul.map((m, i) => ({
            kunci: m.id,
            label: `Modul: ${m.title}`,
            teks: String(i + 1),
            aktif: sekarang?.modul.id === m.id,
            onKlik: () => {
              setTerbuka((t) => new Set(t).add(m.id))
              setLipat(false)
            },
          })),
        ]}
      />

      <div className="utama-isi">
        <KotakGalat galat={galat} onTutup={() => setGalat('')} />
        {sekarang ? (
          <EditorPelajaran
            key={sekarang.id}
            kursusId={kursusId}
            pelajaran={sekarang}
            modulItem={sekarang.modul}
            onUbahDaftar={muatUlang}
            onSelesaiHapus={() => navigate(`/kursus/${kursusId}`)}
            geserPelajaran={(i, arah) => geserDaftar('lessons', sekarang.modul.lessons, i, arah)}
          />
        ) : (
          <Ringkasan
            kursus={kursus}
            kelas={kelas}
            sibuk={sibuk}
            onUbahKursus={ubahKursus}
            onHapusKursus={hapusKursus}
            onBuatKelas={buatKelas}
            onSimpanKatalog={simpanKatalog}
            adalahAdmin={adalahAdmin}
          />
        )}
      </div>
      <Fab buka={sampingBuka} onUbah={setSampingBuka} id="samping-kursus" label="Susunan" />
    </div>
  )
}

/* ---------- formulir nama ---------- */

// Baris kepala modul. Tombol + dan pengaturan berdampingan bila judul pendek, dan ditumpuk atas-bawah bila judul panjang
// (tinggi baris saat berdampingan cukup untuk dua tombol). Keputusan hanya diambil ulang saat lebar atau judul berubah.
const AMBANG_TUMPUK = 90
function BarisModul({ judul, children }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const ukur = () => {
      el.dataset.tumpuk = '0'
      el.dataset.tumpuk = el.offsetHeight >= AMBANG_TUMPUK ? '1' : '0'
    }
    ukur()
    let lebar = el.clientWidth
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== lebar) {
        lebar = el.clientWidth
        ukur()
      }
    })
    ro.observe(el)
    document.fonts?.ready.then(ukur)
    return () => ro.disconnect()
  }, [judul])
  return (
    <div className="modul-baris" ref={ref} data-tumpuk="0">
      {children}
    </div>
  )
}

function FormNama({ awal, label, onSimpan, onBatal }) {
  const [isi, setIsi] = useState(awal)
  const idIsian = useId()
  return (
    <form
      className="form-baris"
      onSubmit={(e) => {
        e.preventDefault()
        if (isi.trim()) onSimpan(isi.trim())
      }}
    >
      <div className="kolom">
        <label htmlFor={idIsian}>{label}</label>
        <input id={idIsian} value={isi} onChange={(e) => setIsi(e.target.value)} autoFocus />
      </div>
      <button type="submit" className="btn kecil utama">
        Simpan
      </button>
      <button type="button" className="btn kecil" onClick={onBatal}>
        Batal
      </button>
    </form>
  )
}

/* ---------- tombol tambah dengan satu kolom isian ---------- */

function TambahTeks({ label, nama, onSimpan, disabled }) {
  const [buka, setBuka] = useState(false)
  const [isi, setIsi] = useState('')
  if (!buka) {
    return (
      <div>
        <button type="button" className="btn kecil" disabled={disabled} onClick={() => setBuka(true)}>
          {label}
        </button>
      </div>
    )
  }
  const kirim = async (e) => {
    e.preventDefault()
    const bersih = isi.trim()
    if (!bersih) return
    await onSimpan(bersih)
    setIsi('')
    setBuka(false)
  }
  return (
    <form className="form-baris" onSubmit={kirim}>
      <div className="kolom">
        <label htmlFor={`tambah-${label}`}>{nama}</label>
        <input id={`tambah-${label}`} value={isi} onChange={(e) => setIsi(e.target.value)} autoFocus />
      </div>
      <button type="submit" className="btn kecil utama">
        Simpan
      </button>
      <button type="button" className="btn kecil" onClick={() => setBuka(false)}>
        Batal
      </button>
    </form>
  )
}

/* ---------- satu tombol tambah: pelajaran atau ujian ---------- */

/* ---------- ringkasan kursus dan kelas ---------- */

function Ringkasan({ kursus, kelas, sibuk, onUbahKursus, onHapusKursus, onBuatKelas, onSimpanKatalog, adalahAdmin }) {
  return (
    <>
      <div className="kepala-pelajaran">
        <p className="sub">Kursus</p>
        <UbahDiTempat tag="h1" nilai={kursus.title} label="judul kursus" onSimpan={(v) => onUbahKursus({ title: v })} />
        <UbahDiTempat
          nilai={kursus.description}
          label="deskripsi"
          multibaris
          onSimpan={(v) => onUbahKursus({ description: v || null })}
        />
      </div>

      <section className="bagian" aria-labelledby="judul-kelas-kursus">
        <h2 id="judul-kelas-kursus">Kelas yang memakai kursus ini</h2>
        <p className="petunjuk">
          Satu kursus bisa dipakai beberapa kelas paralel. Isi dibuat sekali di sini dan terlihat oleh semua kelas.
        </p>
        {kelas.length === 0 && <Kosong>Belum ada kelas. Buat kelas agar siswa bisa bergabung dengan kode kelas.</Kosong>}
        {kelas.length > 0 && (
          <div className="tabel-bungkus">
            <table>
              <thead>
                <tr>
                  <th>Kelas</th>
                  <th>Kode kelas</th>
                  <th>
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {kelas.map((k) => (
                  <tr key={k.id}>
                    <td>
                      {k.name} {k.is_archived && <span className="lencana">Arsip</span>}
                    </td>
                    <td>
                      <span className="kode">{k.join_code}</span>{' '}
                      <TombolSalin teks={k.join_code} ikon label={`Salin kode kelas ${k.name}`} />
                    </td>
                    <td>
                      <Link className="btn kecil" to={`/kelola/${k.id}`}>
                        Kelola siswa
                      </Link>{' '}
                      <Link className="btn kecil" to={`/kelas/${k.id}`}>
                        Lihat sebagai siswa
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <TambahTeks label="+ Kelas" nama="Nama kelas (misalnya 8A)" disabled={sibuk} onSimpan={onBuatKelas} />
      </section>

      <PengaturanKatalog kursus={kursus} kelas={kelas} sibuk={sibuk} onSimpan={onSimpanKatalog} />

      <KelompokKursus kursusId={kursus.id} />

      <UlasanKursus kursusId={kursus.id} bisaBalas bisaSembunyikan={adalahAdmin} />

      <section className="panel zona-bahaya" aria-labelledby="judul-hapus-kursus">
        <h3 id="judul-hapus-kursus">Hapus kursus</h3>
        <p className="petunjuk">
          Kursus hanya bisa dihapus setelah semua kelasnya dihapus. Semua modul, pelajaran, dan blok ikut terhapus.
        </p>
        <div>
          <TombolKonfirmasi
            label="Hapus kursus ini"
            tanya="Hapus kursus beserta seluruh isinya?"
            disabled={sibuk}
            onYakin={onHapusKursus}
          />
        </div>
      </section>
    </>
  )
}

/* ---------- editor satu pelajaran ---------- */

function EditorPelajaran({ kursusId, pelajaran, modulItem, onUbahDaftar, onSelesaiHapus, geserPelajaran }) {
  const { sibuk, galat, setGalat, jalankan } = useAksi()
  const [pratinjau, setPratinjau] = useState(false)
  const [formBaru, setFormBaru] = useState(false)
  const [diubah, setDiubah] = useState(null)
  const [params] = useSearchParams()
  const tabAwal = params.get('tab') === 'hasil' ? 'hasil' : 'petunjuk'
  const [tab, setTab] = useState(tabAwal)
  const ujian = pelajaran.kind === 'ujian'
  const tugas = pelajaran.kind === 'tugas'
  const bertab = ujian || tugas

  const blok = useMuat(
    async () => ambil(await supabase.from('blocks').select('*').eq('lesson_id', pelajaran.id).order('position')),
    [pelajaran.id],
  )
  const daftar = blok.data ?? []

  useEffect(() => {
    window.scrollTo(0, 0)
    setTab(tabAwal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pelajaran.id])

  const ubahPelajaran = (patch) =>
    jalankan(async () => {
      ambil(await supabase.from('lessons').update(patch).eq('id', pelajaran.id).select('id'))
      await onUbahDaftar()
    })
  const hapusPelajaran = () =>
    jalankan(async () => {
      ambil(await supabase.from('lessons').delete().eq('id', pelajaran.id).select('id'))
      await onUbahDaftar()
      onSelesaiHapus()
    })

  const simpanBlok = (nilai) =>
    jalankan(async () => {
      if (diubah) {
        ambil(await supabase.from('blocks').update(nilai).eq('id', diubah.id).select('id'))
        setDiubah(null)
      } else {
        ambil(
          await supabase
            .from('blocks')
            .insert({
              ...nilai,
              lesson_id: pelajaran.id,
              position: posisiBerikut(daftar),
            })
            .select('id'),
        )
        setFormBaru(false)
      }
      await blok.muatUlang()
    })
  const hapusBlok = (id) =>
    jalankan(async () => {
      ambil(await supabase.from('blocks').delete().eq('id', id).select('id'))
      await blok.muatUlang()
    })
  const geserBlok = (indeks, arah) =>
    jalankan(async () => {
      const perubahan = susunUlang(daftar, indeks, arah)
      const hasil = await Promise.all(
        perubahan.map((p) => supabase.from('blocks').update({ position: p.position }).eq('id', p.id)),
      )
      hasil.forEach((h) => {
        if (h.error) throw h.error
      })
      await blok.muatUlang()
    })

  const indeksPelajaran = modulItem.lessons.findIndex((l) => l.id === pelajaran.id)

  return (
    <>
      <div className="kepala-pelajaran">
        <p className="sub">{modulItem.title}</p>
        <UbahDiTempat tag="h1" nilai={pelajaran.title} label="judul pelajaran" onSimpan={(v) => ubahPelajaran({ title: v })} />
        <div className="baris">
          {ujian && <span className="lencana">Ujian</span>}
          {tugas && <span className="lencana">Tugas</span>}
          <span className={`lencana ${pelajaran.is_published ? 'status-aktif' : ''}`}>
            {pelajaran.is_published ? 'Terbit' : 'Draft'}
          </span>
          <span className="rapat-kanan baris rapat">
            <TombolIkon
              ikon={pratinjau ? 'pensil' : 'mata'}
              label={pratinjau ? 'Kembali ke mode edit' : 'Pratinjau'}
              kelas={pratinjau ? 'utama' : ''}
              onClick={() => setPratinjau((p) => !p)}
            />
            <TombolIkon
              ikon={pelajaran.is_published ? 'draft' : 'terbit'}
              label={pelajaran.is_published ? 'Jadikan draft' : 'Terbitkan'}
              kelas={pelajaran.is_published ? 'peringatan' : 'sukses'}
              disabled={sibuk}
              onClick={() => ubahPelajaran({ is_published: !pelajaran.is_published })}
            />
            <MenuTitik
              ikon="⚙"
              label={ujian ? 'Aksi lain untuk ujian' : 'Aksi lain untuk pelajaran'}
              disabled={sibuk}
              item={[
                { label: 'Naikkan urutan', nonaktif: indeksPelajaran <= 0, onPilih: () => geserPelajaran(indeksPelajaran, -1) },
                {
                  label: 'Turunkan urutan',
                  nonaktif: indeksPelajaran === modulItem.lessons.length - 1,
                  onPilih: () => geserPelajaran(indeksPelajaran, 1),
                },
                {
                  label: ujian ? 'Hapus ujian' : tugas ? 'Hapus tugas' : 'Hapus pelajaran',
                  bahaya: true,
                  konfirmasi: `Hapus ${ujian ? 'ujian' : tugas ? 'tugas' : 'pelajaran'} beserta isinya? Penanda selesai siswa ikut terhapus. Untuk menyembunyikan sementara, pakai Jadikan draft.`,
                  onPilih: hapusPelajaran,
                },
              ]}
            />
          </span>
        </div>
      </div>

      <KotakGalat galat={galat || (blok.error && pesanError(blok.error))} onTutup={() => setGalat('')} />
      {blok.memuat && !blok.data && <Memuat />}

      {pratinjau ? (
        <>
          <DaftarBlok blok={daftar} tampilkanCatatan={false} />
          {ujian && <PanelUjian pelajaranId={pelajaran.id} kelasId={null} uid={null} aktif={false} />}
          {tugas && <PanelTugas pelajaranId={pelajaran.id} uid={null} aktif={false} />}
        </>
      ) : (
        <>
          {bertab && (
            <div className="tab-bar" role="tablist" aria-label={ujian ? 'Bagian ujian' : 'Bagian tugas'}>
              {(ujian
                ? [
                    ['petunjuk', 'Petunjuk'],
                    ['soal', 'Soal'],
                    ['pengaturan', 'Pengaturan'],
                    ['hasil', 'Hasil'],
                  ]
                : [
                    ['petunjuk', 'Instruksi'],
                    ['pengaturan', 'Pengaturan'],
                    ['hasil', 'Pengumpulan'],
                  ]
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={tab === k}
                  className={`tab ${tab === k ? 'aktif' : ''}`}
                  onClick={() => setTab(k)}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
          {ujian && tab === 'soal' && <DaftarSoal pelajaranId={pelajaran.id} />}
          {ujian && tab === 'pengaturan' && <PengaturanUjian pelajaranId={pelajaran.id} />}
          {tugas && tab === 'pengaturan' && <PengaturanTugas pelajaranId={pelajaran.id} kursusId={kursusId} />}
          {tugas && tab === 'hasil' && (
            <PengumpulanTugas pelajaranId={pelajaran.id} kursusId={kursusId} judul={pelajaran.title} />
          )}
          {ujian && tab === 'hasil' && <HasilUjianGuru pelajaranId={pelajaran.id} kursusId={kursusId} judul={pelajaran.title} />}
          {(!bertab || tab === 'petunjuk') && (
            <>
              {blok.data && daftar.length === 0 && <Kosong>Pelajaran ini belum punya isi. Tambahkan blok di bawah.</Kosong>}
              {daftar.map((b, i) => (
                <div key={b.id} className="bagian">
                  {diubah?.id === b.id ? (
                    <BlokForm awal={b} sibuk={sibuk} onSimpan={simpanBlok} onBatal={() => setDiubah(null)} />
                  ) : (
                    <>
                      <BlokView blok={b} />
                      <div className="alat-blok">
                        <TombolIkon
                          ikon="naik"
                          label="Naikkan blok"
                          disabled={sibuk || i === 0}
                          onClick={() => geserBlok(i, -1)}
                        />
                        <TombolIkon
                          ikon="turun"
                          label="Turunkan blok"
                          disabled={sibuk || i === daftar.length - 1}
                          onClick={() => geserBlok(i, 1)}
                        />
                        <TombolIkon
                          ikon="pensil"
                          label="Ubah blok"
                          kelas="info"
                          disabled={sibuk}
                          onClick={() => {
                            setFormBaru(false)
                            setDiubah(b)
                          }}
                        />
                        <TombolKonfirmasi
                          ikon="sampah"
                          label="Hapus blok"
                          tanya="Hapus blok ini?"
                          disabled={sibuk}
                          onYakin={() => hapusBlok(b.id)}
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}

              {formBaru ? (
                <BlokForm sibuk={sibuk} onSimpan={simpanBlok} onBatal={() => setFormBaru(false)} />
              ) : (
                <div>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setDiubah(null)
                      setFormBaru(true)
                    }}
                  >
                    + Tambah blok
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  )
}