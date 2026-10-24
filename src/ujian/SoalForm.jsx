import { lazy, Suspense, useState } from 'react'
import { KotakGalat, Memuat } from '../components/ui.jsx'
import { bersihkan, dariTeksPolos, teksPolos } from '../editor/bersihkan.js'
import { adalahSurvei, HURUF, TIPE_SOAL } from './konstanta.js'
import { FormMengurutkan, FormMenjodohkan, FormRumpang, nomorRumpang } from './TipeBaru.jsx'

const EditorTeks = lazy(() => import('../editor/EditorTeks.jsx'))

const dokTeks = (t) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: t }] }],
})
const kosong = () => ({ type: 'doc', content: [{ type: 'paragraph' }] })

// Daftar {id, dok} menjadi [{id, rich, text}], atau null bila ada yang kosong.
function susun(daftar) {
  const hasil = []
  for (const o of daftar) {
    const d = bersihkan(o.dok)
    const t = teksPolos(d)
    if (!t) return null
    hasil.push({ id: o.id, rich: d, text: t })
  }
  return hasil
}

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
  const [kiri, setKiri] = useState(() =>
    s?.type === 'menjodohkan' && s.options?.length
      ? s.options.map((o) => ({ id: o.id, dok: bersihkan(o.rich) ?? kosong() }))
      : ['a', 'b', 'c'].map((id) => ({ id, dok: kosong() })),
  )
  const [kanan, setKanan] = useState(() =>
    s?.type === 'menjodohkan' && s.config?.kanan?.length
      ? s.config.kanan.map((o) => ({ id: o.id, dok: bersihkan(o.rich) ?? kosong() }))
      : ['k1', 'k2', 'k3'].map((id) => ({ id, dok: kosong() })),
  )
  const [pasangan, setPasangan] = useState(() => k?.kunci?.pasangan ?? {})
  const [kunciRumpang, setKunciRumpang] = useState(() => k?.kunci?.rumpang ?? {})
  const [labelRendah, setLabelRendah] = useState(s?.config?.label_rendah ?? '')
  const [labelTinggi, setLabelTinggi] = useState(s?.config?.label_tinggi ?? '')
  const [galat, setGalat] = useState('')
  const [versi, setVersi] = useState(0) // memaksa editor dibuat ulang saat tipe berganti
  const mengubah = Boolean(s)

  const ganti = (t) => {
    setTipe(t)
    if (['menjodohkan', 'mengurutkan', 'rumpang'].includes(t)) setSebagian(true)
    else if (t !== 'pilihan_kompleks') setSebagian(false)
    setBenar([])
    setGalat('')
    if (['isian_singkat', 'rumpang', 'menjodohkan', 'uraian', 'survei_skala', 'survei_teks'].includes(t)) setOpsi([])
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
    const survei = adalahSurvei(tipe)
    const p = survei ? 0 : Number(String(poin).replace(',', '.'))
    if (!survei && (!Number.isFinite(p) || p <= 0 || p > 1000)) return setGalat('Poin harus lebih dari 0 dan paling banyak 1000.')
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
    if (tipe === 'uraian' || tipe === 'survei_teks') {
      payload.kunci = {}
    } else if (tipe === 'survei_skala') {
      payload.kunci = {}
      payload.config = { label_rendah: labelRendah.trim().slice(0, 60), label_tinggi: labelTinggi.trim().slice(0, 60) }
    } else if (tipe === 'survei_pilihan') {
      const hasil = susun(opsi)
      if (!hasil) return setGalat('Setiap pilihan jawaban harus berisi teks.')
      if (hasil.length < 2) return setGalat('Minimal ada dua pilihan jawaban.')
      payload.options = hasil
      payload.kunci = {}
    } else if (tipe === 'isian_singkat') {
      const jawaban = isian.map((j) => j.trim()).filter(Boolean)
      if (!jawaban.length) return setGalat('Isi paling sedikit satu jawaban yang diterima.')
      payload.kunci = { jawaban: [...new Set(jawaban)] }
    } else if (tipe === 'menjodohkan') {
      const kiriOk = susun(kiri)
      const kananOk = susun(kanan)
      if (!kiriOk || !kananOk) return setGalat('Setiap item kiri dan kanan harus berisi teks.')
      if (kanan.length < kiri.length) return setGalat('Item kanan tidak boleh lebih sedikit daripada item kiri.')
      if (kiri.some((x) => !pasangan[x.id] || !kanan.some((y) => y.id === pasangan[x.id]))) {
        return setGalat('Pilih pasangan yang benar untuk setiap item kiri.')
      }
      payload.options = kiriOk
      payload.config = { nilai_sebagian: sebagian, kanan: kananOk }
      payload.kunci = { pasangan: Object.fromEntries(kiri.map((x) => [x.id, pasangan[x.id]])) }
    } else if (tipe === 'mengurutkan') {
      const hasil = susun(opsi)
      if (!hasil) return setGalat('Setiap item harus berisi teks.')
      if (hasil.length < 2) return setGalat('Minimal ada dua item.')
      payload.options = hasil
      payload.config = { nilai_sebagian: sebagian }
      payload.kunci = { urutan: hasil.map((x) => x.id) }
    } else if (tipe === 'rumpang') {
      const nomor = nomorRumpang(teksSoal)
      if (nomor.length === 0) return setGalat('Tulis penanda [[1]] di teks soal pada tempat bagian yang kosong.')
      const kunci = {}
      for (const n of nomor) {
        const j = [...new Set((kunciRumpang[n] ?? []).map((x) => x.trim()).filter(Boolean))]
        if (!j.length) return setGalat(`Isi jawaban yang diterima untuk bagian [${n}].`)
        kunci[n] = j
      }
      payload.config = { nilai_sebagian: sebagian }
      payload.kunci = { rumpang: kunci }
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
        {!adalahSurvei(tipe) && (
          <div className="kolom" style={{ flex: '0 0 120px' }}>
            <label htmlFor="soal-poin">Poin</label>
            <input id="soal-poin" inputMode="decimal" value={poin} onChange={(e) => setPoin(e.target.value)} />
          </div>
        )}
      </div>

      <div className="kolom">
        <span className="label-palsu" id="soal-teks-label">
          Teks soal
        </span>
        <Suspense fallback={<Memuat teks="Memuat editor…" />}>
          <EditorTeks key={`p${versi}`} nilai={prompt} onChange={setPrompt} label="Teks soal" />
        </Suspense>
      </div>

      {['pilihan_ganda', 'benar_salah', 'pilihan_kompleks', 'survei_pilihan'].includes(tipe) && (
        <fieldset className="pilihan-soal">
          <legend>
            {tipe === 'pilihan_kompleks'
              ? 'Pilihan jawaban (centang semua yang benar)'
              : tipe === 'survei_pilihan'
                ? 'Pilihan jawaban (tanpa kunci)'
                : 'Pilihan jawaban (pilih yang benar)'}
          </legend>
          {opsi.map((o, i) => (
            <div className="opsi-baris" key={`${versi}-${o.id}`}>
              <label className="opsi-tanda">
                {tipe !== 'survei_pilihan' && (
                  <input
                    type={tipe === 'pilihan_kompleks' ? 'checkbox' : 'radio'}
                    name="kunci"
                    checked={benar.includes(o.id)}
                    onChange={() => pilihBenar(o.id)}
                    aria-label={`Jawaban benar: pilihan ${nomorOpsi(i)}`}
                  />
                )}
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

      {tipe === 'menjodohkan' && (
        <FormMenjodohkan
          kiri={kiri}
          setKiri={setKiri}
          kanan={kanan}
          setKanan={setKanan}
          pasangan={pasangan}
          setPasangan={setPasangan}
          versi={versi}
        />
      )}
      {tipe === 'mengurutkan' && <FormMengurutkan opsi={opsi} setOpsi={setOpsi} versi={versi} />}
      {tipe === 'rumpang' && (
        <FormRumpang nomor={nomorRumpang(teksPolos(bersihkan(prompt)))} kunci={kunciRumpang} setKunci={setKunciRumpang} />
      )}
      {['menjodohkan', 'mengurutkan', 'rumpang'].includes(tipe) && (
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

      {tipe === 'uraian' && (
        <p className="info">
          Siswa mengetik jawaban sendiri. Setelah siswa mengumpulkan, Anda menilainya di tab Hasil. Isi contoh jawaban atau rubrik
          di kolom di bawah agar mudah dirujuk saat menilai.
        </p>
      )}
      {adalahSurvei(tipe) && (
        <p className="info">
          Soal survei tidak punya kunci dan tidak dihitung dalam nilai. Rekap jawaban kelas ada di tab Hasil.
        </p>
      )}
      {tipe === 'survei_skala' && (
        <div className="form-baris">
          <div className="kolom">
            <label htmlFor="skala-rendah">Label angka 1 (boleh kosong)</label>
            <input id="skala-rendah" value={labelRendah} maxLength={60} onChange={(e) => setLabelRendah(e.target.value)} />
          </div>
          <div className="kolom">
            <label htmlFor="skala-tinggi">Label angka 5 (boleh kosong)</label>
            <input id="skala-tinggi" value={labelTinggi} maxLength={60} onChange={(e) => setLabelTinggi(e.target.value)} />
          </div>
        </div>
      )}

      {!adalahSurvei(tipe) && (
        <div className="kolom">
          <span className="label-palsu">
            {tipe === 'uraian' ? 'Contoh jawaban atau rubrik (boleh kosong)' : 'Pembahasan (boleh kosong)'}
          </span>
          <Suspense fallback={<Memuat teks="Memuat editor…" />}>
            <EditorTeks key={`b${versi}`} nilai={pembahasan} onChange={setPembahasan} label="Pembahasan" />
          </Suspense>
          <span className="petunjuk">Hanya terlihat siswa bila pengaturan ujian mengizinkan.</span>
        </div>
      )}

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