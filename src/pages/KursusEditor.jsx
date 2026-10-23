import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import BlokForm from '../components/BlokForm.jsx'
import DaftarSoal from '../ujian/DaftarSoal.jsx'
import PengaturanUjian from '../ujian/PengaturanUjian.jsx'
import HasilUjianGuru from '../ujian/HasilUjianGuru.jsx'
import { BlokView, DaftarBlok } from '../components/Isi.jsx'
import { Kosong, KotakGalat, Memuat, TombolKonfirmasi, TombolSalin, UbahDiTempat } from '../components/ui.jsx'
import { posisiBerikut, susunUlang, useAksi, useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'

// Editor kursus untuk guru: modul, pelajaran, dan blok konten.
export default function KursusEditor() {
  const { kursusId, pelajaranId } = useParams()
  const { uid, adalahAdmin } = useAuth()
  const navigate = useNavigate()
  const { sibuk, galat, setGalat, jalankan } = useAksi()
  const [terbuka, setTerbuka] = useState(null)
  const [sampingBuka, setSampingBuka] = useState(false)

  const { data, error, memuat, muatUlang } = useMuat(async () => {
    const [kursus, modul, kelas] = await Promise.all([
      supabase.from('courses').select('id,title,description,owner_id').eq('id', kursusId).maybeSingle(),
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
    if (modulSekarangId) setTerbuka(modulSekarangId)
  }, [modulSekarangId])

  if (memuat && !data) return <Memuat />
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
  const buatKelas = (nama) =>
    ubah(async () => ambil(await supabase.from('classes').insert({ course_id: kursusId, name: nama }).select('id')))

  return (
    <div className="kursus">
      <aside className={`samping ${sampingBuka ? 'terbuka' : ''}`} id="samping-kursus" aria-label="Susunan kursus">
        <div className="samping-kepala">
          <Link to="/" className="btn kecil">
            ← Beranda
          </Link>
          <h2>{kursus.title}</h2>
          <Link to={`/kursus/${kursusId}`} className={`pelajaran ${!sekarang ? 'sekarang' : ''}`}>
            Ringkasan kursus dan kelas
          </Link>
        </div>

        {modul.map((m, mi) => {
          const buka = terbuka === m.id
          return (
            <div className="modul" key={m.id}>
              <button
                type="button"
                className={`modul-kepala ${buka ? 'buka' : ''}`}
                aria-expanded={buka}
                onClick={() => setTerbuka(buka ? null : m.id)}
              >
                <span className="modul-nama">{m.title}</span>
                <span className="petunjuk">{m.lessons.length} item</span>
                <span aria-hidden="true">{buka ? '▾' : '▸'}</span>
              </button>
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
                          {!l.is_published && <span className="lencana">Draft</span>}
                        </Link>
                      </li>
                    ))}
                    {m.lessons.length === 0 && <li className="petunjuk">Modul ini masih kosong.</li>}
                  </ul>
                  <TambahPelajaran disabled={sibuk} onSimpan={(judul, kind) => tambahPelajaran(m, judul, kind)} />
                  <div className="baris rapat alat-modul">
                    <button
                      type="button"
                      className="btn kecil"
                      aria-label={`Naikkan modul ${m.title}`}
                      disabled={sibuk || mi === 0}
                      onClick={() => geserDaftar('modules', modul, mi, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn kecil"
                      aria-label={`Turunkan modul ${m.title}`}
                      disabled={sibuk || mi === modul.length - 1}
                      onClick={() => geserDaftar('modules', modul, mi, 1)}
                    >
                      ↓
                    </button>
                    <UbahDiTempat
                      nilai={m.title}
                      label={`judul modul ${m.title}`}
                      onSimpan={(v) => ubahModul(m.id, v)}
                      tag="span"
                    />
                  </div>
                  <TombolKonfirmasi
                    label="Hapus modul"
                    tanya="Modul dan semua pelajarannya ikut terhapus. Lanjut?"
                    disabled={sibuk}
                    onYakin={() => hapusModul(m.id)}
                  />
                </>
              )}
            </div>
          )
        })}
        <TambahTeks label="+ Modul" nama="Judul modul" disabled={sibuk} onSimpan={tambahModul} />
      </aside>

      <div className="utama-isi">
        <div className="baris">
          <button
            type="button"
            className="btn kecil tombol-samping"
            aria-expanded={sampingBuka}
            aria-controls="samping-kursus"
            onClick={() => setSampingBuka((b) => !b)}
          >
            {sampingBuka ? 'Tutup susunan kursus' : 'Susunan kursus'}
          </button>
        </div>
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
          />
        )}
      </div>
    </div>
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

function TambahPelajaran({ onSimpan, disabled }) {
  const [menu, setMenu] = useState(false)
  const [jenis, setJenis] = useState(null) // 'pelajaran' | 'ujian'
  const [isi, setIsi] = useState('')

  if (jenis) {
    const nama = jenis === 'ujian' ? 'Judul ujian' : 'Judul pelajaran'
    const kirim = async (e) => {
      e.preventDefault()
      const bersih = isi.trim()
      if (!bersih) return
      await onSimpan(bersih, jenis)
      setIsi('')
      setJenis(null)
    }
    return (
      <form className="form-baris" onSubmit={kirim}>
        <div className="kolom">
          <label htmlFor="tambah-judul">{nama}</label>
          <input id="tambah-judul" value={isi} onChange={(e) => setIsi(e.target.value)} autoFocus />
        </div>
        <button type="submit" className="btn kecil utama" disabled={disabled}>
          Simpan
        </button>
        <button type="button" className="btn kecil" onClick={() => setJenis(null)}>
          Batal
        </button>
      </form>
    )
  }
  const pilih = (j) => {
    setMenu(false)
    setJenis(j)
  }
  return (
    <div className="menu-tambah">
      <button
        type="button"
        className="btn kecil"
        aria-haspopup="menu"
        aria-expanded={menu}
        disabled={disabled}
        onClick={() => setMenu((m) => !m)}
        onKeyDown={(e) => e.key === 'Escape' && setMenu(false)}
      >
        + Tambah ▾
      </button>
      {menu && (
        <div className="menu-tambah-isi" role="menu" onKeyDown={(e) => e.key === 'Escape' && setMenu(false)}>
          <button type="button" role="menuitem" className="btn kecil" onClick={() => pilih('pelajaran')}>
            Pelajaran
          </button>
          <button type="button" role="menuitem" className="btn kecil" onClick={() => pilih('ujian')}>
            Ujian
          </button>
        </div>
      )}
    </div>
  )
}

/* ---------- ringkasan kursus dan kelas ---------- */

function Ringkasan({ kursus, kelas, sibuk, onUbahKursus, onHapusKursus, onBuatKelas }) {
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
                      <span className="kode">{k.join_code}</span> <TombolSalin teks={k.join_code} />
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

      <section className="panel" aria-labelledby="judul-hapus-kursus">
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
  const [tab, setTab] = useState('petunjuk')
  const ujian = pelajaran.kind === 'ujian'

  const blok = useMuat(
    async () => ambil(await supabase.from('blocks').select('*').eq('lesson_id', pelajaran.id).order('position')),
    [pelajaran.id],
  )
  const daftar = blok.data ?? []

  useEffect(() => {
    window.scrollTo(0, 0)
    setTab('petunjuk')
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
          <span className="lencana">{pelajaran.is_published ? 'Terbit' : 'Draft'}</span>
          <button
            type="button"
            className="btn kecil"
            disabled={sibuk}
            onClick={() => ubahPelajaran({ is_published: !pelajaran.is_published })}
          >
            {pelajaran.is_published ? 'Jadikan draft' : 'Terbitkan untuk siswa'}
          </button>
          <button
            type="button"
            className="btn kecil"
            aria-label="Naikkan pelajaran"
            disabled={sibuk || indeksPelajaran <= 0}
            onClick={() => geserPelajaran(indeksPelajaran, -1)}
          >
            ↑ Naikkan
          </button>
          <button
            type="button"
            className="btn kecil"
            aria-label="Turunkan pelajaran"
            disabled={sibuk || indeksPelajaran === modulItem.lessons.length - 1}
            onClick={() => geserPelajaran(indeksPelajaran, 1)}
          >
            ↓ Turunkan
          </button>
          <button type="button" className="btn kecil" aria-pressed={pratinjau} onClick={() => setPratinjau((p) => !p)}>
            {pratinjau ? 'Kembali ke mode edit' : 'Pratinjau tampilan siswa'}
          </button>
        </div>
      </div>

      <KotakGalat galat={galat || (blok.error && pesanError(blok.error))} onTutup={() => setGalat('')} />
      {blok.memuat && !blok.data && <Memuat />}

      {pratinjau ? (
        <DaftarBlok blok={daftar} tampilkanCatatan={false} />
      ) : (
        <>
          {ujian && (
            <div className="tab-bar" role="tablist" aria-label="Bagian ujian">
              {[
                ['petunjuk', 'Petunjuk'],
                ['soal', 'Soal'],
                ['pengaturan', 'Pengaturan'],
                ['hasil', 'Hasil'],
              ].map(([k, l]) => (
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
          {ujian && tab === 'hasil' && <HasilUjianGuru pelajaranId={pelajaran.id} kursusId={kursusId} judul={pelajaran.title} />}
          {(!ujian || tab === 'petunjuk') && (
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
                        <button
                          type="button"
                          className="btn kecil"
                          aria-label="Naikkan blok"
                          disabled={sibuk || i === 0}
                          onClick={() => geserBlok(i, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn kecil"
                          aria-label="Turunkan blok"
                          disabled={sibuk || i === daftar.length - 1}
                          onClick={() => geserBlok(i, 1)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="btn kecil"
                          onClick={() => {
                            setFormBaru(false)
                            setDiubah(b)
                          }}
                        >
                          Ubah
                        </button>
                        <TombolKonfirmasi
                          label="Hapus"
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

          <section className="panel" aria-labelledby="judul-hapus-pelajaran">
            <h3 id="judul-hapus-pelajaran">{ujian ? 'Hapus ujian' : 'Hapus pelajaran'}</h3>
            <p className="petunjuk">
              Blok dan penanda selesai siswa untuk pelajaran ini ikut terhapus. Untuk menyembunyikan sementara, pakai Jadikan
              draft.
            </p>
            <div>
              <TombolKonfirmasi
                label={ujian ? 'Hapus ujian ini' : 'Hapus pelajaran ini'}
                tanya="Hapus pelajaran beserta isinya?"
                disabled={sibuk}
                onYakin={hapusPelajaran}
              />
            </div>
          </section>
        </>
      )}
    </>
  )
}