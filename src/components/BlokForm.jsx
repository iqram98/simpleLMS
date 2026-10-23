import { lazy, Suspense, useState } from 'react'
import { bersihkan, dariTeksPolos, teksPolos } from '../editor/bersihkan.js'
import { toEmbed, urlHttpsValid } from '../lib/embed.js'
import { KotakGalat, Memuat } from './ui.jsx'

// Editor dimuat hanya saat dibutuhkan agar halaman siswa tetap ringan.
const EditorTeks = lazy(() => import('../editor/EditorTeks.jsx'))

const JENIS = [
  { nilai: 'text', label: 'Teks' },
  { nilai: 'embed', label: 'Embed link (Drive, Docs, Slides, YouTube, LKPD)' },
  { nilai: 'link', label: 'Tombol link' },
  { nilai: 'note', label: 'Catatan guru / RPP (tersembunyi dari siswa)' },
]

// Formulir menambah atau mengubah satu blok. Aturan yang sama dengan database
// diperiksa di sini lebih dulu supaya pesan galatnya jelas.
export default function BlokForm({ awal, onSimpan, onBatal, sibuk }) {
  const mengubah = Boolean(awal)
  const [tipe, setTipe] = useState(awal?.type ?? 'embed')
  const [judul, setJudul] = useState(awal?.title ?? '')
  const [url, setUrl] = useState(awal?.url ?? '')
  const [dokumen, setDokumen] = useState(() => bersihkan(awal?.body_rich) ?? dariTeksPolos(awal?.body_text))
  const [tinggi, setTinggi] = useState(awal?.embed_height ? String(awal.embed_height) : '')
  const [galat, setGalat] = useState('')

  const butuhUrl = tipe === 'embed' || tipe === 'link'
  const bolehUrl = tipe !== 'text'
  const butuhIsi = tipe === 'text'
  const bolehIsi = tipe === 'text' || tipe === 'note'
  const embed = tipe === 'embed' && url.trim() ? toEmbed(url) : null

  const kirim = async (e) => {
    e.preventDefault()
    const u = url.trim()
    const doc = bersihkan(dokumen)
    const t = teksPolos(doc)
    if (butuhUrl && !urlHttpsValid(u)) return setGalat('Tempel link lengkap yang diawali https://')
    if (tipe === 'note' && u && !urlHttpsValid(u)) return setGalat('Link harus diawali https://')
    if (butuhIsi && !t) return setGalat('Isi teks tidak boleh kosong.')
    if (tipe === 'note' && !t && !u) return setGalat('Isi catatan atau tempel link RPP.')
    const th = tinggi.trim() === '' ? null : Number(tinggi)
    if (tipe === 'embed' && th !== null && (!Number.isInteger(th) || th < 200 || th > 2000)) {
      return setGalat('Tinggi harus bilangan bulat antara 200 dan 2000 piksel, atau dikosongkan.')
    }
    setGalat('')
    await onSimpan({
      embed_height: tipe === 'embed' ? th : null,
      type: tipe,
      title: judul.trim() || null,
      url: bolehUrl && u ? u : null,
      body_text: bolehIsi && t ? t : null,
      body_rich: bolehIsi && t ? doc : null,
    })
  }

  return (
    <form className="blok-editor" onSubmit={kirim}>
      <h3>{mengubah ? 'Ubah blok' : 'Tambah blok'}</h3>
      <div className="kolom">
        <label htmlFor="blok-jenis">Jenis blok</label>
        <select id="blok-jenis" value={tipe} onChange={(e) => setTipe(e.target.value)} disabled={mengubah}>
          {JENIS.map((j) => (
            <option key={j.nilai} value={j.nilai}>
              {j.label}
            </option>
          ))}
        </select>
      </div>
      <div className="kolom">
        <label htmlFor="blok-judul">Judul (boleh kosong)</label>
        <input id="blok-judul" value={judul} onChange={(e) => setJudul(e.target.value)} />
      </div>
      {bolehUrl && (
        <div className="kolom">
          <label htmlFor="blok-url">{tipe === 'note' ? 'Link RPP (boleh kosong)' : 'Tempel link'}</label>
          <input
            id="blok-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
            autoComplete="off"
          />
          {tipe === 'embed' && (
            <span className="petunjuk">
              {!url.trim()
                ? 'Pastikan file Drive dibagikan sebagai "Siapa saja yang memiliki link".'
                : embed
                  ? `Terdeteksi: ${embed.jenis}. Akan tampil langsung di halaman.`
                  : 'Link ini tidak bisa ditampilkan di halaman, jadi akan muncul sebagai tombol buka link.'}
            </span>
          )}
          {tipe === 'note' && (
            <span className="petunjuk">Simpan RPP dengan akses Drive dibatasi ke akun Anda. Siswa tidak melihat blok ini.</span>
          )}
        </div>
      )}
      {tipe === 'embed' && (
        <div className="kolom">
          <label htmlFor="blok-tinggi">Tinggi tampilan dalam piksel (boleh kosong)</label>
          <input
            id="blok-tinggi"
            type="number"
            inputMode="numeric"
            min={200}
            max={2000}
            step={10}
            value={tinggi}
            onChange={(e) => setTinggi(e.target.value)}
            placeholder="Bawaan, misalnya 900 untuk LKPD panjang"
          />
          <span className="petunjuk">Lebar mengikuti halaman. Kosongkan untuk ukuran bawaan.</span>
        </div>
      )}
      {bolehIsi && (
        <div className="kolom">
          <span id="blok-isi-label" className="label-palsu">
            {tipe === 'note' ? 'Catatan' : 'Isi teks'}
          </span>
          <Suspense fallback={<Memuat teks="Memuat editor…" />}>
            <EditorTeks nilai={dokumen} onChange={setDokumen} label={tipe === 'note' ? 'Catatan' : 'Isi teks'} />
          </Suspense>
        </div>
      )}
      <KotakGalat galat={galat} />
      <div className="baris">
        <button type="submit" className="btn utama" disabled={sibuk}>
          {mengubah ? 'Simpan perubahan' : 'Tambah blok'}
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