import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { KotakGalat } from '../components/ui.jsx'
import { ambil, pesanError, supabase } from '../lib/supabase.js'
import { sisaWaktu } from './konstanta.js'
import Teks from './Teks.jsx'
import { terisi, tampilRumpang } from './TipeBaru.jsx'

const sudahDijawab = terisi

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
            <Teks doc={s.type === 'rumpang' ? tampilRumpang(s.prompt_rich) : s.prompt_rich} />
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
  if (soal.type === 'menjodohkan') return <JawabanJodoh soal={soal} nilai={nilai} onUbah={onUbah} />
  if (soal.type === 'mengurutkan') return <JawabanUrut soal={soal} nilai={nilai} onUbah={onUbah} />
  if (soal.type === 'rumpang') return <JawabanRumpang soal={soal} nilai={nilai} onUbah={onUbah} />
  if (soal.type === 'uraian' || soal.type === 'survei_teks') return <JawabanTeks soal={soal} nilai={nilai} onUbah={onUbah} />
  if (soal.type === 'survei_skala') return <JawabanSkala soal={soal} nilai={nilai} onUbah={onUbah} />
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

const huruf = (n) => String.fromCharCode(65 + n)

function JawabanJodoh({ soal, nilai, onUbah }) {
  const j = nilai && typeof nilai === 'object' && !Array.isArray(nilai) ? nilai : {}
  return (
    <div className="jodoh">
      <p className="petunjuk">Pilih huruf pasangan yang tepat untuk setiap item.</p>
      <ol className="jodoh-kanan" aria-label="Pilihan pasangan">
        {soal.kanan.map((y, n) => (
          <li key={y.id}>
            <span className="pilihan-huruf">{huruf(n)}</span>
            <span className="pilihan-isi">
              <Teks doc={y.rich} />
            </span>
          </li>
        ))}
      </ol>
      {soal.options.map((x, i) => (
        <div className="jodoh-baris" key={x.id}>
          <span className="pilihan-huruf">{i + 1}</span>
          <span className="pilihan-isi">
            <Teks doc={x.rich} />
          </span>
          <select
            aria-label={`Pasangan untuk item ${i + 1}`}
            value={j[x.id] ?? ''}
            onChange={(e) => {
              const baru = { ...j }
              if (e.target.value) baru[x.id] = e.target.value
              else delete baru[x.id]
              onUbah(baru)
            }}
          >
            <option value="">Pilih</option>
            {soal.kanan.map((y, n) => (
              <option key={y.id} value={y.id}>
                {huruf(n)}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}

function JawabanUrut({ soal, nilai, onUbah }) {
  const awal = soal.options.map((o) => o.id)
  const urut = Array.isArray(nilai) && nilai.length === awal.length ? nilai : awal
  const belum = !Array.isArray(nilai)
  const oleh = Object.fromEntries(soal.options.map((o) => [o.id, o]))
  const geser = (i, arah) => {
    const t = i + arah
    if (t < 0 || t >= urut.length) return
    const baru = urut.slice()
    ;[baru[i], baru[t]] = [baru[t], baru[i]]
    onUbah(baru)
  }
  return (
    <div className="urut">
      <p className="petunjuk">Susun item dengan tombol panah sampai urutannya benar.</p>
      <ol className="urut-daftar">
        {urut.map((id, i) => (
          <li key={id} className="urut-item">
            <span className="pilihan-huruf">{i + 1}</span>
            <span className="pilihan-isi">
              <Teks doc={oleh[id]?.rich} />
            </span>
            <span className="baris rapat">
              <button
                type="button"
                className="btn kecil"
                aria-label={`Naikkan item ${i + 1}`}
                disabled={i === 0}
                onClick={() => geser(i, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn kecil"
                aria-label={`Turunkan item ${i + 1}`}
                disabled={i === urut.length - 1}
                onClick={() => geser(i, 1)}
              >
                ↓
              </button>
            </span>
          </li>
        ))}
      </ol>
      {belum && (
        <div>
          <p className="petunjuk">Urutan ini belum tersimpan sebagai jawabanmu.</p>
          <button type="button" className="btn kecil" onClick={() => onUbah(urut)}>
            Pakai urutan ini
          </button>
        </div>
      )}
    </div>
  )
}

function JawabanRumpang({ soal, nilai, onUbah }) {
  const j = nilai && typeof nilai === 'object' && !Array.isArray(nilai) ? nilai : {}
  return (
    <div className="kolom">
      {(soal.rumpang ?? []).map((n) => (
        <div className="kolom" key={n}>
          <label htmlFor={`rum-${soal.id}-${n}`}>Isian ({n})</label>
          <input
            id={`rum-${soal.id}-${n}`}
            value={j[n] ?? ''}
            maxLength={200}
            autoComplete="off"
            onChange={(e) => onUbah({ ...j, [n]: e.target.value })}
          />
        </div>
      ))}
    </div>
  )
}

function JawabanTeks({ soal, nilai, onUbah }) {
  const uraian = soal.type === 'uraian'
  const maks = uraian ? 5000 : 2000
  const t = typeof nilai === 'string' ? nilai : ''
  return (
    <div className="kolom">
      <label htmlFor={`teks-${soal.id}`}>{uraian ? 'Jawabanmu' : 'Tulis jawabanmu (boleh dikosongkan)'}</label>
      <textarea
        id={`teks-${soal.id}`}
        rows={uraian ? 9 : 4}
        maxLength={maks}
        value={t}
        onChange={(e) => onUbah(e.target.value)}
      />
      <span className="petunjuk">
        {t.length} dari {maks} karakter
      </span>
    </div>
  )
}

function JawabanSkala({ soal, nilai, onUbah }) {
  const { label_rendah: rendah, label_tinggi: tinggi } = soal.skala ?? {}
  return (
    <fieldset className="pilihan-siswa">
      <legend className="sr-only">Pilih angka dari 1 sampai 5</legend>
      <div className="skala">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={`skala-angka ${nilai === n ? 'dipilih' : ''}`}>
            <input type="radio" name={`skala-${soal.id}`} checked={nilai === n} onChange={() => onUbah(n)} />
            <span>{n}</span>
          </label>
        ))}
      </div>
      {(rendah || tinggi) && (
        <div className="skala-label">
          <span>1 = {rendah}</span>
          <span>5 = {tinggi}</span>
        </div>
      )}
    </fieldset>
  )
}