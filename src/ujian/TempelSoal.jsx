import { useMemo, useState } from 'react'
import { KotakGalat } from '../components/ui.jsx'
import { pesanError, supabase, ambil } from '../lib/supabase.js'
import { NAMA_TIPE } from './konstanta.js'
import { MAKS_TEMPEL, parseSoal } from './tempel.js'

const CONTOH = `1. Ibu kota Indonesia adalah
A. Bandung
B. Jakarta
C. Surabaya
Jawaban: B
Poin: 2
Pembahasan: Jakarta adalah ibu kota negara.

2. Matahari terbit dari barat
Jawaban: Salah

3. Pilih bilangan genap
A. 2
B. 3
C. 4
Jawaban: A, C

4. Hasil 3 + 4 adalah
Jawaban: 7 | tujuh`

// Menempel banyak soal sekaligus dari teks sederhana.
export default function TempelSoal({ pelajaranId, onSelesai, onBatal }) {
  const [teks, setTeks] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [kemajuan, setKemajuan] = useState(null)
  const [galat, setGalat] = useState('')
  const hasil = useMemo(() => parseSoal(teks), [teks])
  const baik = hasil.filter((h) => h.payload)
  const rusak = hasil.length - baik.length

  const buat = async () => {
    if (baik.length === 0 || baik.length > MAKS_TEMPEL) return
    setSibuk(true)
    setGalat('')
    let jadi = 0
    try {
      for (const h of baik) {
        setKemajuan(`Menyimpan soal ${jadi + 1} dari ${baik.length}…`)
        ambil(await supabase.rpc('simpan_soal', { pelajaran: pelajaranId, id_soal: null, data: h.payload }))
        jadi += 1
      }
      onSelesai(jadi)
    } catch (e) {
      setGalat(`${pesanError(e)} ${jadi} soal sudah tersimpan sebelum berhenti.`)
      setSibuk(false)
      setKemajuan(null)
      if (jadi > 0) onSelesai(jadi, true)
    }
  }

  return (
    <div className="blok-editor">
      <h3>Tempel banyak soal</h3>
      <p className="petunjuk">
        Pisahkan soal dengan baris kosong. Pilihan ditulis A. B. C., kunci pada baris Jawaban. Satu huruf = pilihan ganda,
        beberapa huruf (A, C) = pilihan ganda kompleks. Tanpa pilihan: Benar atau Salah = benar/salah, selain itu = isian singkat
        (beberapa jawaban dipisah tanda |). Poin dan Pembahasan boleh ditambahkan. Tipe menjodohkan, mengurutkan, dan rumpang
        dibuat lewat formulir.
      </p>
      <div className="kolom">
        <label htmlFor="tempel-teks">Teks soal</label>
        <textarea id="tempel-teks" rows={12} value={teks} onChange={(e) => setTeks(e.target.value)} placeholder={CONTOH} />
      </div>
      {hasil.length > 0 && (
        <div className="kolom" aria-live="polite">
          <strong>
            {baik.length} soal siap dibuat{rusak > 0 ? `, ${rusak} perlu diperbaiki` : ''}
          </strong>
          {hasil.length > MAKS_TEMPEL && <p className="info">Paling banyak {MAKS_TEMPEL} soal sekali tempel.</p>}
          <ol className="daftar-soal">
            {hasil.map((h) => (
              <li key={h.nomor} className="soal-item">
                <div className="baris rapat">
                  <strong>{h.nomor}.</strong>
                  {h.payload ? (
                    <>
                      <span className="lencana">{NAMA_TIPE[h.payload.type]}</span>
                      <span className="petunjuk">{h.payload.points} poin</span>
                    </>
                  ) : (
                    <span className="salah">Perlu diperbaiki</span>
                  )}
                </div>
                <div>{h.ringkas}</div>
                {h.galat && <p className="salah">{h.galat}</p>}
              </li>
            ))}
          </ol>
        </div>
      )}
      <KotakGalat galat={galat} />
      {kemajuan && <p role="status">{kemajuan}</p>}
      <div className="baris">
        <button
          type="button"
          className="btn utama"
          disabled={sibuk || baik.length === 0 || baik.length > MAKS_TEMPEL}
          onClick={buat}
        >
          {baik.length ? `Buat ${baik.length} soal` : 'Buat soal'}
        </button>
        <button type="button" className="btn" disabled={sibuk} onClick={onBatal}>
          Batal
        </button>
      </div>
      {rusak > 0 && baik.length > 0 && (
        <p className="petunjuk">Soal yang perlu diperbaiki dilewati. Perbaiki teksnya lalu tempel lagi.</p>
      )}
    </div>
  )
}