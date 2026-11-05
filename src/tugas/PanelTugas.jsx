import { useEffect, useState } from 'react'
import { KotakGalat, Memuat } from '../components/ui.jsx'
import { urlHttpsValid } from '../lib/embed.js'
import { useAksi, useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'
import { tandaiNilaiDilihat } from '../beranda/penanda.js'
import { angka, waktu } from './tampil.js'
import { teksAnggota } from '../kelompok/aturan.js'

// Bagian tugas di halaman siswa: instruksi ada di blok pelajaran, di sini
// pengaturan, formulir kirim tautan, dan status penilaian.
// aktif=false untuk pratinjau guru (tanpa formulir).
export default function PanelTugas({ pelajaranId, uid, aktif, onKirim }) {
  const { data, error, memuat, muatUlang } = useMuat(async () => {
    const [st, kiriman, klp] = await Promise.all([
      supabase
        .from('tugas_pengaturan')
        .select('tenggat,terima_terlambat,kirim_ulang,nilai_maks,maks_tautan,kelompok_set_id')
        .eq('lesson_id', pelajaranId)
        .maybeSingle(),
      aktif
        ? supabase
            .from('pengumpulan_tugas')
            .select('id,tautan,catatan,dikirim_pada,terlambat,perlu_dinilai,nilai,nilai_sebelumnya,komentar,dinilai_pada')
            .eq('lesson_id', pelajaranId)
            .eq('user_id', uid)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      aktif ? supabase.rpc('kelompok_saya', { pelajaran: pelajaranId }) : Promise.resolve({ data: [], error: null }),
    ])
    // Baris kosong: tugas individu. kelompok_id null: tugas kelompok tetapi saya belum masuk kelompok.
    const baris = (ambil(klp) ?? [])[0] ?? null
    return { st: ambil(st), kiriman: ambil(kiriman), kelompok: baris }
  }, [pelajaranId, uid, aktif])
  const [ubah, setUbah] = useState(false)
  const dinilai = Boolean(aktif && data?.kiriman?.dinilai_pada)
  useEffect(() => {
    if (dinilai) tandaiNilaiDilihat(pelajaranId)
  }, [dinilai, pelajaranId])

  if (memuat && !data) return <Memuat />
  if (error) return <KotakGalat galat={pesanError(error)} />
  const { st, kiriman, kelompok } = data
  const tugasKelompok = Boolean(st?.kelompok_set_id)
  const tanpaKelompok = Boolean(aktif && tugasKelompok && !kelompok?.kelompok_id)
  if (!st) return <p className="info">Pengaturan tugas belum tersedia.</p>

  const lewat = st.tenggat && Date.now() > Date.parse(st.tenggat)
  const tutup = lewat && !st.terima_terlambat
  const bisaKirim = aktif && !tutup && !tanpaKelompok && (!kiriman || st.kirim_ulang)

  return (
    <section className="panel panel-tugas" aria-label="Pengumpulan tugas">
      <h2>Pengumpulan tugas</h2>
      <dl className="ringkas-ujian">
        <div>
          <dt>Tenggat</dt>
          <dd>{st.tenggat ? waktu(st.tenggat) : 'Tanpa tenggat'}</dd>
        </div>
        <div>
          <dt>Nilai maksimum</dt>
          <dd>{angka(st.nilai_maks)}</dd>
        </div>
        <div>
          <dt>Tautan</dt>
          <dd>Maks {st.maks_tautan}</dd>
        </div>
      </dl>
      {st.tenggat && lewat && (
        <p className="info">
          {st.terima_terlambat
            ? 'Tenggat sudah lewat. Kiriman sekarang ditandai terlambat.'
            : 'Tenggat sudah lewat dan tugas ini tidak menerima kiriman lagi.'}
        </p>
      )}
      {tugasKelompok && !aktif && <p className="info">Tugas kelompok: satu anggota mengumpulkan untuk seluruh kelompok.</p>}
      {tanpaKelompok && (
        <p className="info" role="status">
          Ini tugas kelompok, tetapi kamu belum masuk kelompok. Hubungi gurumu untuk masuk kelompok.
        </p>
      )}
      {aktif && kelompok?.kelompok_id && (
        <div className="kolom kelompok-saya">
          <p>
            <strong>Tugas kelompok · {kelompok.nama}</strong>
          </p>
          <p className="petunjuk">Anggota: {teksAnggota(kelompok.anggota)}</p>
          {kiriman && kelompok.dikirim_oleh_nama ? (
            <p className="petunjuk">Dikumpulkan oleh {kelompok.dikirim_oleh_nama} untuk seluruh kelompok.</p>
          ) : (
            <p className="petunjuk">Cukup satu anggota yang mengumpulkan; semua anggota otomatis ditandai selesai.</p>
          )}
        </div>
      )}
      {!aktif && <p className="info">Pratinjau guru: formulir kirim hanya muncul untuk siswa.</p>}

      {aktif && kiriman && !ubah && <Status kiriman={kiriman} nilaiMaks={st.nilai_maks} />}
      {aktif && kiriman && !ubah && bisaKirim && (
        <div>
          <button type="button" className="btn" onClick={() => setUbah(true)}>
            Kirim ulang
          </button>
          {st.kirim_ulang && <p className="petunjuk">Kiriman baru menggantikan yang lama dan perlu dinilai ulang.</p>}
        </div>
      )}
      {bisaKirim && (!kiriman || ubah) && (
        <FormKirim
          pelajaranId={pelajaranId}
          maks={st.maks_tautan}
          awal={kiriman}
          onBatal={kiriman ? () => setUbah(false) : null}
          onSelesai={() => {
            setUbah(false)
            muatUlang()
            onKirim?.()
          }}
        />
      )}
      {aktif && !kiriman && tutup && <p className="info">Kamu tidak mengirim tugas ini sebelum tenggat.</p>}
    </section>
  )
}

function Status({ kiriman, nilaiMaks }) {
  return (
    <div className="kolom">
      <p>
        <strong>
          {kiriman.nilai != null ? 'Sudah dinilai' : kiriman.perlu_dinilai ? 'Terkirim, menunggu penilaian' : 'Terkirim'}
        </strong>
        <span className="petunjuk"> · dikirim {waktu(kiriman.dikirim_pada)}</span>
        {kiriman.terlambat && <span className="lencana"> Terlambat</span>}
      </p>
      {kiriman.nilai != null && (
        <p className="nilai-tugas">
          Nilai: <strong>{angka(kiriman.nilai)}</strong> dari {angka(nilaiMaks)}
        </p>
      )}
      {kiriman.nilai == null && kiriman.nilai_sebelumnya != null && (
        <p className="petunjuk">
          Nilai sebelumnya: {angka(kiriman.nilai_sebelumnya)} dari {angka(nilaiMaks)}. Kiriman baru sedang dinilai ulang.
        </p>
      )}
      {kiriman.komentar && (
        <blockquote className="komentar-guru">
          <strong>{kiriman.nilai == null ? 'Komentar sebelumnya' : 'Komentar guru'}</strong>
          <p>{kiriman.komentar}</p>
        </blockquote>
      )}
      <ul className="daftar-tautan">
        {kiriman.tautan.map((t, n) => (
          <li key={n}>
            <a href={t.url} target="_blank" rel="noopener noreferrer">
              {t.label || t.url}
            </a>
          </li>
        ))}
      </ul>
      {kiriman.catatan && <p className="petunjuk">Catatan: {kiriman.catatan}</p>}
    </div>
  )
}

function FormKirim({ pelajaranId, maks, awal, onBatal, onSelesai }) {
  const { sibuk, galat, setGalat, jalankan } = useAksi()
  const [tautan, setTautan] = useState(() =>
    awal?.tautan?.length ? awal.tautan.map((t) => ({ url: t.url, label: t.label ?? '' })) : [{ url: '', label: '' }],
  )
  const [catatan, setCatatan] = useState(awal?.catatan ?? '')
  useEffect(() => setGalat(''), [tautan, catatan, setGalat])

  const ubahSatu = (n, k, v) => setTautan(tautan.map((t, i) => (i === n ? { ...t, [k]: v } : t)))
  const kirim = (e) => {
    e.preventDefault()
    const isi = tautan.map((t) => ({ url: t.url.trim(), label: t.label.trim() })).filter((t) => t.url || t.label)
    if (isi.length === 0) return setGalat('Isi minimal satu tautan.')
    if (isi.some((t) => !urlHttpsValid(t.url))) return setGalat('Setiap tautan harus diawali https:// dan tanpa spasi.')
    return jalankan(async () => {
      ambil(
        await supabase.rpc('kirim_tugas', {
          pelajaran: pelajaranId,
          tautan_baru: isi.map((t) => ({ url: t.url, label: t.label || null })),
          catatan_baru: catatan.trim() || null,
        }),
      )
      onSelesai()
    })
  }

  return (
    <form className="kolom" onSubmit={kirim}>
      <p className="petunjuk">
        Tempel tautan hasil kerjamu. Untuk Google Docs, Slides, Sheets, atau Drive, atur berbagi menjadi &quot;Siapa saja yang
        memiliki link&quot; (bisa melihat) agar guru dapat membukanya.
      </p>
      {tautan.map((t, n) => (
        <div className="form-baris" key={n}>
          <div className="kolom">
            <label htmlFor={`tgs-url-${n}`}>Tautan {tautan.length > 1 ? n + 1 : ''}</label>
            <input
              id={`tgs-url-${n}`}
              inputMode="url"
              placeholder="https://"
              value={t.url}
              onChange={(e) => ubahSatu(n, 'url', e.target.value)}
              maxLength={500}
            />
          </div>
          <div className="kolom">
            <label htmlFor={`tgs-lbl-${n}`}>Keterangan (boleh kosong)</label>
            <input id={`tgs-lbl-${n}`} value={t.label} onChange={(e) => ubahSatu(n, 'label', e.target.value)} maxLength={100} />
          </div>
          {tautan.length > 1 && (
            <button
              type="button"
              className="btn kecil"
              aria-label={`Hapus tautan ${n + 1}`}
              onClick={() => setTautan(tautan.filter((_, i) => i !== n))}
            >
              Hapus
            </button>
          )}
        </div>
      ))}
      {tautan.length < maks && (
        <div>
          <button type="button" className="btn kecil" onClick={() => setTautan([...tautan, { url: '', label: '' }])}>
            + Tambah tautan
          </button>
        </div>
      )}
      <div className="kolom">
        <label htmlFor="tgs-catatan">Catatan untuk guru (boleh kosong)</label>
        <textarea id="tgs-catatan" rows={2} maxLength={2000} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
      </div>
      <KotakGalat galat={galat} onTutup={() => setGalat('')} />
      <div className="baris">
        <button type="submit" className="btn utama" disabled={sibuk}>
          {sibuk ? 'Mengirim…' : awal ? 'Kirim ulang tugas' : 'Kirim tugas'}
        </button>
        {onBatal && (
          <button type="button" className="btn" onClick={onBatal}>
            Batal
          </button>
        )}
      </div>
    </form>
  )
}