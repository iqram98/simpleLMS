import { lazy, Suspense, useState } from 'react'
import { KotakGalat, Memuat } from '../components/ui.jsx'
import { bersihkan, dariTeksPolos, teksPolos } from '../editor/bersihkan.js'
import { HURUF, TIPE_SOAL } from './konstanta.js'

const EditorTeks = lazy(() => import('../editor/EditorTeks.jsx'))

const dokTeks = (t) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: t }] }],
})
const kosong = () => ({ type: 'doc', content: [{ type: 'paragraph' }] })

function opsiAwal(tipe) {
  if (tipe === 'benar_salah') {
    return [
      { id: 'benar', dok: dokTeks('Benar') },
      { id: 'salah', dok: dokTeks('Salah') },
    ]
  }
  return [HURUF[0], HURUF[1], HURUF[2], HURUF[3]].map((id) => ({
    id,
    dok: kosong(),
  }))
}

// Formulir membuat atau mengubah satu soal. Aturan yang sama dengan database
// diperiksa di sini lebih dulu supaya pesan galatnya jelas.
// awal: { soal, kunci } saat mengubah.
export default function SoalForm({ awal, tipeAwal = 'pilihan_ganda', onSimpan, onBatal, sibuk, kunciTipe }) {
  const s = awal?.soal
  const k = awal?.kunci
  const [tipe, setTipe] = useState(s?.type ?? tipeAwal)
  const [poin, setPoin] = useState(s ? String(Number(s.points)) : '1')
  const [prompt, setPrompt] = useState(() => bersihkan(s?.prompt_rich) ?? kosong())
  const [opsi, setOpsi] = useState(() =>
    s && s.options?.length
      ? s.options.map((o) => ({ id: o.id, dok: bersihkan(o.rich) ?? kosong() }))
      : opsiAwal(s?.type ?? tipeAwal),
  )
  const [benar, setBenar] = useState(() => k?.kunci?.benar ?? [])
  const [isian, setIsian] = useState(() => (k?.kunci?.jawaban?.length ? k.kunci.jawaban : ['']))
  const [sebagian, setSebagian] = useState(Boolean(s?.config?.nilai_sebagian))
  const [pembahasan, setPembahasan] = useState(() => bersihkan(k?.pembahasan_rich) ?? kosong())
  const [galat, setGalat] = useState('')
  const [versi, setVersi] = useState(0) // memaksa editor dibuat ulang saat tipe berganti
  const mengubah = Boolean(s)

  const ganti = (t) => {
    setTipe(t)
    setBenar([])
    setGalat('')
    if (t === 'isian_singkat') setOpsi([])
    else if (t === 'benar_salah') setOpsi(opsiAwal('benar_salah'))
    else if (!opsi.length || opsi.some((o) => o.id === 'benar' || o.id === 'salah')) setOpsi(opsiAwal(t))
    setVersi((v) => v + 1)
  }
  const tambahOpsi = () => {
    const pakai = new Set(opsi.map((o) => o.id))
    const id = [...HURUF].find((h) => !pakai.has(h))
    if (id) setOpsi([...opsi, { id, dok: kosong() }])
  }
  const hapusOpsi = (id) => {
    setOpsi(opsi.filter((o) => o.id !== id))
    setBenar(benar.filter((b) => b !== id))
  }
  const ubahOpsi = (id, dok) => setOpsi((l) => l.map((o) => (o.id === id ? { ...o, dok } : o)))
  const pilihBenar = (id) => {
    if (tipe === 'pilihan_kompleks') setBenar(benar.includes(id) ? benar.filter((b) => b !== id) : [...benar, id])
    else setBenar([id])
  }

  const kirim = async (e) => {
    e.preventDefault()
    const p = Number(String(poin).replace(',', '.'))
    if (!Number.isFinite(p) || p <= 0 || p > 1000) return setGalat('Poin harus lebih dari 0 dan paling banyak 1000.')
    const docSoal = bersihkan(prompt)
    const teksSoal = teksPolos(docSoal)
    if (!teksSoal) return setGalat('Teks soal tidak boleh kosong.')

    const payload = {
      type: tipe,
      prompt_rich: docSoal,
      prompt_text: teksSoal,
      points: p,
      options: [],
      config: {},
    }
    if (tipe === 'isian_singkat') {
      const jawaban = isian.map((j) => j.trim()).filter(Boolean)
      if (!jawaban.length) return setGalat('Isi paling sedikit satu jawaban yang diterima.')
      payload.kunci = { jawaban: [...new Set(jawaban)] }
    } else {
      if (opsi.length < 2) return setGalat('Minimal ada dua pilihan jawaban.')
      const hasil = []
      for (const o of opsi) {
        const d = bersihkan(o.dok)
        const t = teksPolos(d)
        if (!t) return setGalat('Setiap pilihan jawaban harus berisi teks.')
        hasil.push({ id: o.id, rich: d, text: t })
      }
      if (!benar.length) return setGalat('Tandai jawaban yang benar.')
      payload.options = hasil
      payload.kunci = { benar }
      if (tipe === 'pilihan_kompleks') payload.config = { nilai_sebagian: sebagian }
    }
    const bh = bersihkan(pembahasan)
    const teksBh = teksPolos(bh)
    payload.pembahasan_rich = teksBh ? bh : null
    payload.pembahasan_text = teksBh || null
    setGalat('')
    await onSimpan(payload)
  }

  const nomorOpsi = (i) => String.fromCharCode(65 + i)
  const tetap = tipe === 'benar_salah'
  const tipeTerkunci = mengubah && kunciTipe

  return (
    <form className="blok-editor soal-form" onSubmit={kirim}>
      <h3>{mengubah ? 'Ubah soal' : 'Tambah soal'}</h3>
      <div className="form-baris">
        <div className="kolom">
          <label htmlFor="soal-tipe">Tipe soal</label>
          <select id="soal-tipe" value={tipe} onChange={(e) => ganti(e.target.value)} disabled={tipeTerkunci}>
            {TIPE_SOAL.map((t) => (
              <option key={t.nilai} value={t.nilai}>
                {t.label}
              </option>
            ))}
          </select>
          {tipeTerkunci && <span className="petunjuk">Tipe tidak bisa diganti setelah ada siswa yang mengerjakan.</span>}
        </div>
        <div className="kolom" style={{ flex: '0 0 120px' }}>
          <label htmlFor="soal-poin">Poin</label>
          <input id="soal-poin" inputMode="decimal" value={poin} onChange={(e) => setPoin(e.target.value)} />
        </div>
      </div>

      <div className="kolom">
        <span className="label-palsu" id="soal-teks-label">
          Teks soal
        </span>
        <Suspense fallback={<Memuat teks="Memuat editor…" />}>
          <EditorTeks key={`p${versi}`} nilai={prompt} onChange={setPrompt} label="Teks soal" />
        </Suspense>
      </div>

      {tipe !== 'isian_singkat' && (
        <fieldset className="pilihan-soal">
          <legend>
            {tipe === 'pilihan_kompleks' ? 'Pilihan jawaban (centang semua yang benar)' : 'Pilihan jawaban (pilih yang benar)'}
          </legend>
          {opsi.map((o, i) => (
            <div className="opsi-baris" key={`${versi}-${o.id}`}>
              <label className="opsi-tanda">
                <input
                  type={tipe === 'pilihan_kompleks' ? 'checkbox' : 'radio'}
                  name="kunci"
                  checked={benar.includes(o.id)}
                  onChange={() => pilihBenar(o.id)}
                  aria-label={`Jawaban benar: pilihan ${nomorOpsi(i)}`}
                />
                <span>{tetap ? '' : nomorOpsi(i)}</span>
              </label>
              <div className="opsi-isi">
                {tetap ? (
                  <strong>{o.id === 'benar' ? 'Benar' : 'Salah'}</strong>
                ) : (
                  <Suspense fallback={<Memuat teks="Memuat…" />}>
                    <EditorTeks ringkas nilai={o.dok} onChange={(d) => ubahOpsi(o.id, d)} label={`Pilihan ${nomorOpsi(i)}`} />
                  </Suspense>
                )}
              </div>
              {!tetap && (
                <button type="button" className="btn kecil" disabled={opsi.length <= 2} onClick={() => hapusOpsi(o.id)}>
                  Hapus
                </button>
              )}
            </div>
          ))}
          {!tetap && opsi.length < 8 && (
            <div>
              <button type="button" className="btn kecil" onClick={tambahOpsi}>
                + Pilihan
              </button>
            </div>
          )}
          {tipe === 'pilihan_kompleks' && (
            <label className="baris rapat">
              <input
                type="checkbox"
                checked={sebagian}
                onChange={(e) => setSebagian(e.target.checked)}
                style={{ width: 'auto', minHeight: 0 }}
              />
              Beri nilai sebagian bila hanya sebagian jawaban yang benar
            </label>
          )}
        </fieldset>
      )}

      {tipe === 'isian_singkat' && (
        <fieldset className="pilihan-soal">
          <legend>Jawaban yang diterima</legend>
          <p className="petunjuk">
            Huruf besar atau kecil dan spasi berlebih diabaikan. Tambahkan ejaan atau bentuk lain yang juga benar.
          </p>
          {isian.map((j, i) => (
            <div className="opsi-baris" key={i}>
              <div className="opsi-isi">
                <input
                  aria-label={`Jawaban diterima ${i + 1}`}
                  value={j}
                  maxLength={200}
                  onChange={(e) => setIsian(isian.map((x, n) => (n === i ? e.target.value : x)))}
                />
              </div>
              <button
                type="button"
                className="btn kecil"
                disabled={isian.length <= 1}
                onClick={() => setIsian(isian.filter((_, n) => n !== i))}
              >
                Hapus
              </button>
            </div>
          ))}
          {isian.length < 20 && (
            <div>
              <button type="button" className="btn kecil" onClick={() => setIsian([...isian, ''])}>
                + Jawaban lain
              </button>
            </div>
          )}
        </fieldset>
      )}

      <div className="kolom">
        <span className="label-palsu">Pembahasan (boleh kosong)</span>
        <Suspense fallback={<Memuat teks="Memuat editor…" />}>
          <EditorTeks key={`b${versi}`} nilai={pembahasan} onChange={setPembahasan} label="Pembahasan" />
        </Suspense>
        <span className="petunjuk">Hanya terlihat siswa bila pengaturan ujian mengizinkan.</span>
      </div>

      <KotakGalat galat={galat} />
      <div className="baris">
        <button type="submit" className="btn utama" disabled={sibuk}>
          {mengubah ? 'Simpan soal' : 'Tambah soal'}
        </button>
        <button type="button" className="btn" onClick={onBatal}>
          Batal
        </button>
      </div>
    </form>
  )
}