import { lazy, Suspense } from 'react'
import { Memuat } from '../components/ui.jsx'
import { teksPolos } from '../editor/bersihkan.js'
import { HURUF } from './konstanta.js'

const EditorTeks = lazy(() => import('../editor/EditorTeks.jsx'))

export const kosong = () => ({ type: 'doc', content: [{ type: 'paragraph' }] })

// Nomor penanda [[1]], [[2]] pada teks soal rumpang, terurut dan tanpa duplikat.
export function nomorRumpang(teks) {
  const set = new Set()
  for (const m of String(teks ?? '').matchAll(/\[\[(\d{1,2})\]\]/g)) set.add(m[1])
  return [...set].sort((a, b) => Number(a) - Number(b))
}

const idKanan = (daftar) => {
  const pakai = new Set(daftar.map((x) => x.id))
  for (let i = 1; i < 100; i++) if (!pakai.has(`k${i}`)) return `k${i}`
  return null
}

function Editor({ nilai, onChange, label }) {
  return (
    <Suspense fallback={<Memuat teks="Memuat…" />}>
      <EditorTeks ringkas nilai={nilai} onChange={onChange} label={label} />
    </Suspense>
  )
}

const ringkasTeks = (dok) => {
  const t = teksPolos(dok)
  return t.length > 28 ? `${t.slice(0, 28)}…` : t
}

// kiri: [{id, dok}], kanan: [{id, dok}], pasangan: {idKiri: idKanan}
export function FormMenjodohkan({ kiri, setKiri, kanan, setKanan, pasangan, setPasangan, versi }) {
  const ubah = (daftar, set, id, dok) => set(daftar.map((x) => (x.id === id ? { ...x, dok } : x)))
  const tambahKiri = () => {
    const pakai = new Set(kiri.map((x) => x.id))
    const id = [...HURUF].find((h) => !pakai.has(h))
    if (id && kiri.length < 8) setKiri([...kiri, { id, dok: kosong() }])
  }
  const hapusKiri = (id) => {
    setKiri(kiri.filter((x) => x.id !== id))
    const baru = { ...pasangan }
    delete baru[id]
    setPasangan(baru)
  }
  const tambahKanan = () => {
    const id = idKanan(kanan)
    if (id && kanan.length < 10) setKanan([...kanan, { id, dok: kosong() }])
  }
  const hapusKanan = (id) => {
    setKanan(kanan.filter((x) => x.id !== id))
    setPasangan(Object.fromEntries(Object.entries(pasangan).filter(([, v]) => v !== id)))
  }
  return (
    <>
      <fieldset className="pilihan-soal">
        <legend>Daftar kiri (soal) dan pasangannya</legend>
        {kiri.map((x, i) => (
          <div className="opsi-baris" key={`${versi}-${x.id}`}>
            <span className="opsi-tanda">{i + 1}</span>
            <div className="opsi-isi">
              <Editor nilai={x.dok} onChange={(d) => ubah(kiri, setKiri, x.id, d)} label={`Item kiri ${i + 1}`} />
              <label className="petunjuk" htmlFor={`pasangan-${x.id}`}>
                Pasangan yang benar
              </label>
              <select
                id={`pasangan-${x.id}`}
                value={pasangan[x.id] ?? ''}
                onChange={(e) => setPasangan({ ...pasangan, [x.id]: e.target.value })}
              >
                <option value="">Pilih pasangan</option>
                {kanan.map((y, n) => {
                  const dipakai = Object.entries(pasangan).some(([k, v]) => v === y.id && k !== x.id)
                  return (
                    <option key={y.id} value={y.id} disabled={dipakai}>
                      {String.fromCharCode(65 + n)}. {ringkasTeks(y.dok) || '(kosong)'}
                    </option>
                  )
                })}
              </select>
            </div>
            <button type="button" className="btn kecil" disabled={kiri.length <= 2} onClick={() => hapusKiri(x.id)}>
              Hapus
            </button>
          </div>
        ))}
        {kiri.length < 8 && (
          <div>
            <button type="button" className="btn kecil" onClick={tambahKiri}>
              + Item kiri
            </button>
          </div>
        )}
      </fieldset>

      <fieldset className="pilihan-soal">
        <legend>Daftar kanan (pilihan jawaban)</legend>
        <p className="petunjuk">
          Boleh ada lebih banyak item daripada kiri sebagai pengecoh. Siswa melihatnya dalam urutan acak.
        </p>
        {kanan.map((y, n) => (
          <div className="opsi-baris" key={`${versi}-${y.id}`}>
            <span className="opsi-tanda">{String.fromCharCode(65 + n)}</span>
            <div className="opsi-isi">
              <Editor
                nilai={y.dok}
                onChange={(d) => ubah(kanan, setKanan, y.id, d)}
                label={`Item kanan ${String.fromCharCode(65 + n)}`}
              />
            </div>
            <button type="button" className="btn kecil" disabled={kanan.length <= 2} onClick={() => hapusKanan(y.id)}>
              Hapus
            </button>
          </div>
        ))}
        {kanan.length < 10 && (
          <div>
            <button type="button" className="btn kecil" onClick={tambahKanan}>
              + Item kanan
            </button>
          </div>
        )}
      </fieldset>
    </>
  )
}

// opsi: [{id, dok}] ditulis dalam urutan yang BENAR.
export function FormMengurutkan({ opsi, setOpsi, versi }) {
  const geser = (i, arah) => {
    const j = i + arah
    if (j < 0 || j >= opsi.length) return
    const baru = opsi.slice()
    ;[baru[i], baru[j]] = [baru[j], baru[i]]
    setOpsi(baru)
  }
  const tambah = () => {
    const pakai = new Set(opsi.map((x) => x.id))
    const id = [...HURUF].find((h) => !pakai.has(h))
    if (id && opsi.length < 8) setOpsi([...opsi, { id, dok: kosong() }])
  }
  return (
    <fieldset className="pilihan-soal">
      <legend>Item dalam urutan yang benar</legend>
      <p className="petunjuk">Tulis item dari yang pertama sampai terakhir. Siswa akan melihatnya dalam urutan acak.</p>
      {opsi.map((x, i) => (
        <div className="opsi-baris" key={`${versi}-${x.id}`}>
          <span className="opsi-tanda">{i + 1}</span>
          <div className="opsi-isi">
            <Editor
              nilai={x.dok}
              onChange={(d) => setOpsi(opsi.map((y) => (y.id === x.id ? { ...y, dok: d } : y)))}
              label={`Item urutan ${i + 1}`}
            />
          </div>
          <div className="baris rapat">
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
              disabled={i === opsi.length - 1}
              onClick={() => geser(i, 1)}
            >
              ↓
            </button>
            <button
              type="button"
              className="btn kecil"
              disabled={opsi.length <= 2}
              onClick={() => setOpsi(opsi.filter((y) => y.id !== x.id))}
            >
              Hapus
            </button>
          </div>
        </div>
      ))}
      {opsi.length < 8 && (
        <div>
          <button type="button" className="btn kecil" onClick={tambah}>
            + Item
          </button>
        </div>
      )}
    </fieldset>
  )
}

// nomor: ['1','2'] dari teks soal; kunci: {'1': ['jawaban', ...]}
export function FormRumpang({ nomor, kunci, setKunci }) {
  return (
    <fieldset className="pilihan-soal">
      <legend>Jawaban untuk tiap bagian kosong</legend>
      <p className="petunjuk">
        Tulis penanda <span className="kode">[[1]]</span>, <span className="kode">[[2]]</span>, dan seterusnya di teks soal, di
        tempat bagian yang harus diisi siswa. Huruf besar atau kecil dan spasi berlebih diabaikan.
      </p>
      {nomor.length === 0 && <p className="info">Belum ada penanda di teks soal.</p>}
      {nomor.map((n) => {
        const daftar = kunci[n]?.length ? kunci[n] : ['']
        const set = (baru) => setKunci({ ...kunci, [n]: baru })
        return (
          <div className="kolom" key={n}>
            <strong>Bagian [{n}]: jawaban yang diterima</strong>
            {daftar.map((j, i) => (
              <div className="opsi-baris" key={i}>
                <div className="opsi-isi">
                  <input
                    aria-label={`Jawaban diterima ${i + 1} untuk bagian ${n}`}
                    value={j}
                    maxLength={200}
                    onChange={(e) => set(daftar.map((x, k) => (k === i ? e.target.value : x)))}
                  />
                </div>
                <button
                  type="button"
                  className="btn kecil"
                  disabled={daftar.length <= 1}
                  onClick={() => set(daftar.filter((_, k) => k !== i))}
                >
                  Hapus
                </button>
              </div>
            ))}
            {daftar.length < 10 && (
              <div>
                <button type="button" className="btn kecil" onClick={() => set([...daftar, ''])}>
                  + Jawaban lain
                </button>
              </div>
            )}
          </div>
        )
      })}
    </fieldset>
  )
}

// Mengganti penanda [[n]] pada teks soal rumpang dengan "(n) ______" untuk tampilan siswa.
export function tampilRumpang(doc) {
  const ubah = (node) => {
    if (!node || typeof node !== 'object') return node
    if (node.type === 'text' && typeof node.text === 'string') {
      return { ...node, text: node.text.replace(/\[\[(\d{1,2})\]\]/g, '($1) ______') }
    }
    return Array.isArray(node.content) ? { ...node, content: node.content.map(ubah) } : node
  }
  return ubah(doc)
}

// Apakah jawaban (bentuk apa pun) berisi sesuatu.
export function terisi(j) {
  if (Array.isArray(j)) return j.length > 0
  if (typeof j === 'string') return j.trim() !== ''
  if (j && typeof j === 'object') return Object.values(j).some((x) => typeof x === 'string' && x.trim() !== '')
  return j != null
}