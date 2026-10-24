import { useState } from 'react'
import { KotakGalat, Memuat } from '../components/ui.jsx'
import { useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'
import { adalahSurvei, NAMA_TIPE } from './konstanta.js'
import Teks from './Teks.jsx'
import { tampilRumpang } from './TipeBaru.jsx'

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
      {h.perlu_dinilai ? (
        <>
          <p className="nilai-besar tunggu">Menunggu penilaian guru</p>
          <p>Sebagian jawabanmu berupa uraian yang dinilai guru. Nilai akan muncul setelah guru selesai menilai.</p>
        </>
      ) : h.nilai == null ? (
        <p className="info">Terima kasih, jawabanmu sudah terkirim.</p>
      ) : (
        <>
          <p className="nilai-besar" aria-label={`Nilai ${angka(h.nilai)}`}>
            {angka(h.nilai)}
          </p>
          <p>
            Skor {angka(h.skor)} dari {angka(h.skor_maks)}. {h.lulus ? 'Mencapai KKM' : 'Belum mencapai KKM'} ({angka(h.kkm)}).
          </p>
        </>
      )}
      {h.nilai_akhir != null && (
        <p>
          Nilai akhir saat ini: <strong>{angka(h.nilai_akhir)}</strong>
        </p>
      )}
      {!h.rinci_tersedia && (h.uraian ?? []).length > 0 && (
        <section className="kolom" aria-label="Jawaban uraian">
          <h3>Jawaban uraian</h3>
          {h.uraian.map((u) => (
            <div key={u.id} className="soal-item">
              <Teks doc={u.prompt_rich} />
              <p className="jawaban-teks">{u.jawaban || '(kosong)'}</p>
              <UraianNilai u={u} />
            </div>
          ))}
        </section>
      )}
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
                {adalahSurvei(s.type) ? (
                  <span className="petunjuk">Survei, tanpa nilai</span>
                ) : s.type === 'uraian' ? (
                  <span className="petunjuk">
                    {s.menunggu || s.poin == null ? 'Menunggu penilaian' : `${angka(s.poin)}/${angka(s.points)}`}
                  </span>
                ) : (
                  <span className={s.benar ? 'benar' : 'salah'}>
                    {s.benar ? 'Benar' : Number(s.poin) > 0 ? 'Sebagian benar' : 'Salah'} ({angka(s.poin)}/{angka(s.points)})
                  </span>
                )}
              </div>
              <Teks doc={s.type === 'rumpang' ? tampilRumpang(s.prompt_rich) : s.prompt_rich} />
              <Rincian s={s} uraian={(h.uraian ?? []).find((u) => u.id === s.id)} />
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

function Rincian({ s, uraian }) {
  if (s.type === 'uraian') {
    return (
      <div>
        <p className="jawaban-teks">{s.jawaban || '(kosong)'}</p>
        {uraian && <UraianNilai u={uraian} />}
      </div>
    )
  }
  if (adalahSurvei(s.type)) return <RincianSurvei s={s} />
  if (s.type === 'menjodohkan') return <RincianJodoh s={s} />
  if (s.type === 'mengurutkan') return <RincianUrut s={s} />
  if (s.type === 'rumpang') return <RincianRumpang s={s} />
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

const huruf = (n) => String.fromCharCode(65 + n)

function RincianJodoh({ s }) {
  const kanan = s.config?.kanan ?? []
  const j = s.jawaban && typeof s.jawaban === 'object' && !Array.isArray(s.jawaban) ? s.jawaban : {}
  const kunci = s.kunci?.pasangan ?? {}
  const letak = (id) => kanan.findIndex((y) => y.id === id)
  return (
    <ul className="rincian-opsi">
      {(s.options ?? []).map((x, i) => {
        const benar = j[x.id] === kunci[x.id]
        return (
          <li key={x.id} className={benar ? 'kunci' : 'keliru'}>
            <span className="pilihan-huruf">{i + 1}</span>
            <span className="pilihan-isi">
              <Teks doc={x.rich} />
            </span>
            <span className="petunjuk">
              Jawabanmu: {j[x.id] ? huruf(letak(j[x.id])) : '(kosong)'}
              {benar ? '' : `, kunci: ${huruf(letak(kunci[x.id]))}`}
            </span>
          </li>
        )
      })}
      <li className="petunjuk">Pilihan kanan: {kanan.map((y, n) => `${huruf(n)} = ${y.text ?? ''}`).join('; ')}</li>
    </ul>
  )
}

function RincianUrut({ s }) {
  const oleh = Object.fromEntries((s.options ?? []).map((o) => [o.id, o]))
  const kunci = s.kunci?.urutan ?? []
  const j = Array.isArray(s.jawaban) ? s.jawaban : []
  return (
    <div className="urut-bandingan">
      <div>
        <strong>Urutanmu</strong>
        {j.length === 0 ? (
          <p className="petunjuk">(kosong)</p>
        ) : (
          <ol>
            {j.map((id, i) => (
              <li key={id} className={id === kunci[i] ? 'benar' : 'salah'}>
                {oleh[id]?.text}
              </li>
            ))}
          </ol>
        )}
      </div>
      <div>
        <strong>Urutan benar</strong>
        <ol>
          {kunci.map((id) => (
            <li key={id}>{oleh[id]?.text}</li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function RincianRumpang({ s }) {
  const j = s.jawaban && typeof s.jawaban === 'object' && !Array.isArray(s.jawaban) ? s.jawaban : {}
  const kunci = s.kunci?.rumpang ?? {}
  const norm = (t) =>
    String(t ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
  return (
    <ul className="rincian-opsi">
      {Object.keys(kunci)
        .sort((a, b) => Number(a) - Number(b))
        .map((n) => {
          const benar = kunci[n].some((x) => norm(x) === norm(j[n]) && norm(j[n]) !== '')
          return (
            <li key={n} className={benar ? 'kunci' : 'keliru'}>
              <span>
                ({n}) Jawabanmu: <strong>{j[n] || '(kosong)'}</strong>. Diterima: {kunci[n].join(', ')}
              </span>
            </li>
          )
        })}
    </ul>
  )
}

function UraianNilai({ u }) {
  return (
    <div>
      <p>
        {u.menunggu || u.poin == null ? (
          <span className="petunjuk">Menunggu penilaian guru.</span>
        ) : (
          <strong>
            Nilai: {angka(u.poin)} dari {angka(u.points)}
          </strong>
        )}
      </p>
      {u.komentar && (
        <div className="pembahasan">
          <strong>Komentar guru</strong>
          <p>{u.komentar}</p>
        </div>
      )}
    </div>
  )
}

function RincianSurvei({ s }) {
  let isi = '(kosong)'
  if (s.type === 'survei_pilihan') isi = (s.options ?? []).find((o) => o.id === s.jawaban)?.text ?? isi
  else if (s.type === 'survei_skala') isi = s.jawaban == null ? isi : `${s.jawaban} dari 5`
  else if (typeof s.jawaban === 'string' && s.jawaban.trim()) isi = s.jawaban
  return (
    <p>
      Jawabanmu: <strong>{isi}</strong>
    </p>
  )
}