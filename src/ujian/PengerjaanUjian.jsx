import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { KotakGalat } from '../components/ui.jsx'
import { ambil, pesanError, supabase } from '../lib/supabase.js'
import { sisaWaktu } from './konstanta.js'
import Teks from './Teks.jsx'

const sudahDijawab = (j) => (Array.isArray(j) ? j.length > 0 : typeof j === 'string' ? j.trim() !== '' : j != null)

// Layar mengerjakan ujian: satu soal per layar, jawaban tersimpan otomatis,
// waktu mengikuti jam server, dikumpulkan otomatis saat waktu habis.
export default function PengerjaanUjian({ data, onSelesai }) {
  const { percobaan_id: pid, soal, batas_pada: batas } = data
  const [jawab, setJawab] = useState(() => data.jawaban ?? {})
  const [i, setI] = useState(0)
  const [galat, setGalat] = useState('')
  const [simpanan, setSimpanan] = useState('tersimpan') // tersimpan | menyimpan | gagal
  const [konfirmasi, setKonfirmasi] = useState(false)
  const [mengumpulkan, setMengumpulkan] = useState(false)
  const selisih = useRef(Date.parse(data.sekarang) - Date.now())
  const [sisa, setSisa] = useState(() => (batas ? Date.parse(batas) - Date.parse(data.sekarang) : null))
  const terbaru = useRef(jawab)
  const kotor = useRef(false)
  const jalan = useRef(false)
  const selesaiRef = useRef(false)

  const simpan = useCallback(async () => {
    if (jalan.current || selesaiRef.current) return
    jalan.current = true
    try {
      while (kotor.current) {
        kotor.current = false
        setSimpanan('menyimpan')
        const r = ambil(
          await supabase.rpc('simpan_jawaban', {
            id_percobaan: pid,
            jawaban_baru: terbaru.current,
          }),
        )
        if (r?.status === 'selesai') {
          selesaiRef.current = true
          onSelesai(true)
          return
        }
        if (r?.sekarang) selisih.current = Date.parse(r.sekarang) - Date.now()
      }
      setSimpanan('tersimpan')
    } catch {
      kotor.current = true
      setSimpanan('gagal')
    } finally {
      jalan.current = false
    }
  }, [pid, onSelesai])

  // Simpan tertunda 700 ms setelah perubahan terakhir; coba lagi tiap 5 detik bila gagal.
  const tunda = useRef(null)
  const ubah = (id, nilai) => {
    const baru = { ...terbaru.current, [id]: nilai }
    terbaru.current = baru
    setJawab(baru)
    kotor.current = true
    clearTimeout(tunda.current)
    tunda.current = setTimeout(simpan, 700)
  }
  useEffect(() => {
    const t = setInterval(() => {
      if (kotor.current && !jalan.current) simpan()
    }, 5000)
    return () => {
      clearInterval(t)
      clearTimeout(tunda.current)
    }
  }, [simpan])

  const kumpulkan = useCallback(
    async (otomatis = false) => {
      if (selesaiRef.current) return
      setMengumpulkan(true)
      setGalat('')
      try {
        clearTimeout(tunda.current)
        // Pastikan jawaban terakhir sudah tersimpan sebelum dinilai.
        if (kotor.current) {
          kotor.current = false
          try {
            ambil(
              await supabase.rpc('simpan_jawaban', {
                id_percobaan: pid,
                jawaban_baru: terbaru.current,
              }),
            )
          } catch {
            /* tetap lanjut kumpulkan */
          }
        }
        ambil(await supabase.rpc('kumpulkan_ujian', { id_percobaan: pid }))
        selesaiRef.current = true
        onSelesai(otomatis)
      } catch (e) {
        setGalat(pesanError(e))
        setMengumpulkan(false)
      }
    },
    [pid, onSelesai],
  )

  // Hitung mundur berdasarkan jam server.
  useEffect(() => {
    if (!batas) return undefined
    const t = setInterval(() => {
      const s = Date.parse(batas) - (Date.now() + selisih.current)
      setSisa(s)
      if (s <= 0) {
        clearInterval(t)
        kumpulkan(true)
      }
    }, 1000)
    return () => clearInterval(t)
  }, [batas, kumpulkan])

  // Peringatan sebelum meninggalkan halaman saat masih ada yang belum tersimpan.
  useEffect(() => {
    const f = (e) => {
      if (kotor.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', f)
    return () => window.removeEventListener('beforeunload', f)
  }, [])

  const belum = useMemo(() => soal.map((s, n) => (sudahDijawab(jawab[s.id]) ? null : n + 1)).filter(Boolean), [soal, jawab])
  const s = soal[i]
  const mendesak = sisa != null && sisa <= 60000

  return (
    <section className="ujian-jalan" aria-label="Mengerjakan ujian">
      <div className="ujian-atas">
        <span>
          Soal {i + 1} dari {soal.length}
        </span>
        {sisa != null && (
          <span className={`pewaktu ${mendesak ? 'mendesak' : ''}`} role="timer" aria-label="Sisa waktu">
            {sisaWaktu(sisa)}
          </span>
        )}
        <span className={`petunjuk simpanan ${simpanan}`} role="status">
          {simpanan === 'tersimpan' ? 'Tersimpan' : simpanan === 'menyimpan' ? 'Menyimpan…' : 'Belum tersimpan, mencoba lagi'}
        </span>
      </div>

      <nav className="navigator" aria-label="Nomor soal">
        {soal.map((x, n) => (
          <button
            key={x.id}
            type="button"
            className={`nomor ${n === i ? 'sekarang' : ''} ${sudahDijawab(jawab[x.id]) ? 'terisi' : ''}`}
            aria-current={n === i ? 'step' : undefined}
            aria-label={`Soal ${n + 1}${sudahDijawab(jawab[x.id]) ? ', sudah dijawab' : ', belum dijawab'}`}
            onClick={() => {
              setI(n)
              setKonfirmasi(false)
            }}
          >
            {n + 1}
          </button>
        ))}
      </nav>

      {!konfirmasi && s && (
        <div className="soal-layar">
          <div className="soal-teks-penuh">
            <Teks doc={s.prompt_rich} />
          </div>
          <Jawaban soal={s} nilai={jawab[s.id]} onUbah={(v) => ubah(s.id, v)} />
          <div className="pager">
            <button type="button" className="btn" disabled={i === 0} onClick={() => setI(i - 1)}>
              ← Sebelumnya
            </button>
            {i < soal.length - 1 ? (
              <button type="button" className="btn utama" onClick={() => setI(i + 1)}>
                Berikutnya →
              </button>
            ) : (
              <button type="button" className="btn utama" onClick={() => setKonfirmasi(true)}>
                Periksa dan kumpulkan
              </button>
            )}
          </div>
          {i < soal.length - 1 && (
            <div>
              <button type="button" className="btn kecil" onClick={() => setKonfirmasi(true)}>
                Periksa dan kumpulkan
              </button>
            </div>
          )}
        </div>
      )}

      {konfirmasi && (
        <div className="soal-layar">
          <h2>Kumpulkan ujian?</h2>
          {belum.length > 0 ? (
            <p className="peringatan">
              {belum.length} soal belum dijawab: nomor {belum.join(', ')}.
            </p>
          ) : (
            <p>Semua soal sudah dijawab.</p>
          )}
          <p className="petunjuk">Setelah dikumpulkan, jawaban tidak bisa diubah.</p>
          <KotakGalat galat={galat} />
          <div className="baris">
            <button type="button" className="btn utama" disabled={mengumpulkan} onClick={() => kumpulkan(false)}>
              {mengumpulkan ? 'Mengumpulkan…' : 'Ya, kumpulkan'}
            </button>
            <button type="button" className="btn" disabled={mengumpulkan} onClick={() => setKonfirmasi(false)}>
              Kembali ke soal
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function Jawaban({ soal, nilai, onUbah }) {
  if (soal.type === 'isian_singkat') {
    return (
      <div className="kolom">
        <label htmlFor={`isi-${soal.id}`}>Jawabanmu</label>
        <input
          id={`isi-${soal.id}`}
          value={nilai ?? ''}
          maxLength={200}
          autoComplete="off"
          onChange={(e) => onUbah(e.target.value)}
        />
      </div>
    )
  }
  const banyak = soal.type === 'pilihan_kompleks'
  const dipilih = banyak ? (Array.isArray(nilai) ? nilai : []) : nilai
  return (
    <fieldset className="pilihan-siswa">
      <legend className="sr-only">{banyak ? 'Pilih semua jawaban yang benar' : 'Pilih satu jawaban'}</legend>
      {banyak && <p className="petunjuk">Pilih semua jawaban yang benar.</p>}
      {soal.options.map((o, n) => {
        const aktif = banyak ? dipilih.includes(o.id) : dipilih === o.id
        return (
          <label key={o.id} className={`pilihan ${aktif ? 'dipilih' : ''}`}>
            <input
              type={banyak ? 'checkbox' : 'radio'}
              name={`soal-${soal.id}`}
              checked={aktif}
              onChange={() => onUbah(banyak ? (aktif ? dipilih.filter((x) => x !== o.id) : [...dipilih, o.id]) : o.id)}
            />
            <span className="pilihan-huruf">{soal.type === 'benar_salah' ? '' : String.fromCharCode(65 + n)}</span>
            <span className="pilihan-isi">
              <Teks doc={o.rich} />
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}