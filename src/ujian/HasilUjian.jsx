import { useState } from 'react'
import { KotakGalat, Memuat } from '../components/ui.jsx'
import { useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'
import { NAMA_TIPE } from './konstanta.js'
import Teks from './Teks.jsx'

const angka = (n) => (n == null ? '-' : String(Math.round(Number(n) * 100) / 100).replace('.', ','))

// Hasil satu percobaan. Rincian soal hanya muncul bila guru mengizinkan.
export default function HasilUjian({ idPercobaan, onTutup, otomatis = false }) {
  const [buka, setBuka] = useState(false)
  const { data, error, memuat } = useMuat(
    async () => ambil(await supabase.rpc('lihat_hasil', { id_percobaan: idPercobaan })),
    [idPercobaan],
  )
  if (memuat && !data) return <Memuat />
  if (error) return <KotakGalat galat={pesanError(error)} />
  const h = data
  return (
    <section className="hasil-ujian" aria-label="Hasil ujian">
      {otomatis && <p className="info">Waktu habis, jadi jawabanmu dikumpulkan otomatis.</p>}
      <h2>Hasil percobaan {h.nomor}</h2>
      <p className="nilai-besar" aria-label={`Nilai ${angka(h.nilai)}`}>
        {angka(h.nilai)}
      </p>
      <p>
        Skor {angka(h.skor)} dari {angka(h.skor_maks)}. {h.lulus ? 'Mencapai KKM' : 'Belum mencapai KKM'} ({angka(h.kkm)}).
      </p>
      <p>
        Nilai akhir saat ini: <strong>{angka(h.nilai_akhir)}</strong>
      </p>
      {h.rinci_tersedia && (
        <div>
          <button type="button" className="btn" aria-expanded={buka} onClick={() => setBuka(!buka)}>
            {buka ? 'Sembunyikan pembahasan' : 'Lihat jawaban dan pembahasan'}
          </button>
        </div>
      )}
      {buka && h.soal && (
        <ol className="daftar-soal">
          {h.soal.map((s, n) => (
            <li key={s.id} className="soal-item">
              <div className="baris rapat">
                <strong>{n + 1}.</strong>
                <span className="lencana">{NAMA_TIPE[s.type] ?? s.type}</span>
                <span className={s.benar ? 'benar' : 'salah'}>
                  {s.benar ? 'Benar' : Number(s.poin) > 0 ? 'Sebagian benar' : 'Salah'} ({angka(s.poin)}/{angka(s.points)})
                </span>
              </div>
              <Teks doc={s.prompt_rich} />
              <Rincian s={s} />
              {s.pembahasan_rich && (
                <div className="pembahasan">
                  <strong>Pembahasan</strong>
                  <Teks doc={s.pembahasan_rich} />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      <div>
        <button type="button" className="btn utama" onClick={onTutup}>
          Selesai
        </button>
      </div>
    </section>
  )
}

function Rincian({ s }) {
  if (s.type === 'isian_singkat') {
    return (
      <p>
        Jawabanmu: <strong>{s.jawaban || '(kosong)'}</strong>
        <br />
        Jawaban yang diterima: {(s.kunci?.jawaban ?? []).join(', ')}
      </p>
    )
  }
  const pilih = new Set(Array.isArray(s.jawaban) ? s.jawaban : s.jawaban ? [s.jawaban] : [])
  const benar = new Set(s.kunci?.benar ?? [])
  return (
    <ul className="rincian-opsi">
      {(s.options ?? []).map((o, n) => (
        <li key={o.id} className={benar.has(o.id) ? 'kunci' : pilih.has(o.id) ? 'keliru' : ''}>
          <span className="pilihan-huruf">{s.type === 'benar_salah' ? '' : String.fromCharCode(65 + n)}</span>
          <span className="pilihan-isi">
            <Teks doc={o.rich} />
          </span>
          <span className="petunjuk">
            {pilih.has(o.id) ? 'Pilihanmu' : ''}
            {pilih.has(o.id) && benar.has(o.id) ? ', ' : ''}
            {benar.has(o.id) ? 'Kunci' : ''}
          </span>
        </li>
      ))}
    </ul>
  )
}