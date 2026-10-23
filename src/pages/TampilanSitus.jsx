import { useState } from 'react'
import { KotakGalat } from '../components/ui.jsx'
import { useAksi } from '../lib/hooks.js'
import { ambil, supabase } from '../lib/supabase.js'
import { useTema } from '../tema/TemaProvider.jsx'
import { peringatanWarna, variabelTema, warnaValid } from '../tema/warna.js'

const CONTOH = [
  { nama: 'Biru', hex: '#2563eb' },
  { nama: 'Hijau toska', hex: '#0f766e' },
  { nama: 'Hijau', hex: '#15803d' },
  { nama: 'Ungu', hex: '#7c3aed' },
  { nama: 'Merah muda', hex: '#be185d' },
  { nama: 'Merah', hex: '#c62828' },
  { nama: 'Oranye', hex: '#c2410c' },
  { nama: 'Abu-abu biru', hex: '#475569' },
]

function Pratinjau({ nama, logo, warna, gelap }) {
  const v = variabelTema(warnaValid(warna) ? warna : '#2563eb', gelap)
  return (
    <div className="pratinjau" data-tema={gelap ? 'gelap' : 'terang'} style={v} role="img" aria-label={`Pratinjau mode ${gelap ? 'gelap' : 'terang'}`}>
      <div className="pratinjau-atas">
        {logo && /^https:\/\/\S+$/.test(logo) && <img src={logo} alt="" onError={(e) => (e.currentTarget.hidden = true)} />}
        <span>{nama || 'Nama situs'}</span>
      </div>
      <div className="pratinjau-isi">
        <h3>Informatika Kelas 8</h3>
        <div className="bar">
          <span style={{ width: '60%' }} />
        </div>
        <p className="info">Pelajaran berikutnya sudah dibuka.</p>
        <div className="baris">
          <span className="btn utama">Buka kelas</span>
          <span className="btn">Batal</span>
          <a href="#pratinjau" onClick={(e) => e.preventDefault()}>
            Tautan
          </a>
        </div>
      </div>
    </div>
  )
}

// Bagian di halaman Admin untuk mengatur nama, logo, warna, dan mode tampilan.
export default function TampilanSitus() {
  const { situs, muat } = useTema()
  const [f, setF] = useState({
    nama_situs: situs.nama_situs,
    logo_url: situs.logo_url ?? '',
    warna_utama: situs.warna_utama,
    mode_bawaan: situs.mode_bawaan,
  })
  const [pesanForm, setPesanForm] = useState('')
  const [tersimpan, setTersimpan] = useState(false)
  const { sibuk, galat, jalankan } = useAksi()
  const isi = (k) => (e) => {
    setTersimpan(false)
    setF((l) => ({ ...l, [k]: e.target.value }))
  }
  const peringatan = peringatanWarna(f.warna_utama)

  const simpan = (e) => {
    e.preventDefault()
    const nama = f.nama_situs.trim()
    const logo = f.logo_url.trim()
    if (!nama || nama.length > 60) return setPesanForm('Nama situs wajib diisi, paling banyak 60 karakter.')
    if (!warnaValid(f.warna_utama)) return setPesanForm('Warna harus berbentuk #RRGGBB, misalnya #2563eb.')
    if (logo && !/^https:\/\/\S+$/.test(logo)) return setPesanForm('Link logo harus diawali https://')
    setPesanForm('')
    jalankan(async () => {
      const hasil = ambil(
        await supabase
          .from('pengaturan_situs')
          .update({
            nama_situs: nama,
            warna_utama: f.warna_utama.toLowerCase(),
            mode_bawaan: f.mode_bawaan,
            logo_url: logo || null,
            diubah_pada: new Date().toISOString(),
          })
          .eq('id', true)
          .select('id'),
      )
      if (!hasil.length) throw new Error('tidak_berwenang')
      await muat()
      setTersimpan(true)
    })
  }

  return (
    <section className="bagian" aria-labelledby="judul-tampilan">
      <h2 id="judul-tampilan">Tampilan situs</h2>
      <form className="panel" onSubmit={simpan}>
        <div className="kolom">
          <label htmlFor="situs-nama">Nama situs</label>
          <input id="situs-nama" value={f.nama_situs} onChange={isi('nama_situs')} maxLength={60} />
        </div>
        <div className="kolom">
          <label htmlFor="situs-logo">Link logo (boleh kosong)</label>
          <input id="situs-logo" type="url" value={f.logo_url} onChange={isi('logo_url')} placeholder="https://" autoComplete="off" />
          <span className="petunjuk">Tempel link gambar. Gambar persegi, PNG atau SVG, terlihat paling baik.</span>
        </div>
        <fieldset className="kolom" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, fontSize: '0.9rem', padding: 0, marginBottom: 6 }}>Warna utama</legend>
          <div className="pilihan-warna">
            {CONTOH.map((c) => (
              <button
                key={c.hex}
                type="button"
                className="contoh-warna"
                style={{ background: c.hex }}
                aria-label={c.nama}
                aria-pressed={f.warna_utama.toLowerCase() === c.hex}
                onClick={() => {
                  setTersimpan(false)
                  setF((l) => ({ ...l, warna_utama: c.hex }))
                }}
              />
            ))}
          </div>
          <div className="form-baris">
            <div className="kolom" style={{ flex: '0 0 72px' }}>
              <label htmlFor="situs-picker">Pilih</label>
              <input
                id="situs-picker"
                type="color"
                value={warnaValid(f.warna_utama) ? f.warna_utama.toLowerCase() : '#2563eb'}
                onChange={isi('warna_utama')}
              />
            </div>
            <div className="kolom">
              <label htmlFor="situs-hex">Kode warna</label>
              <input id="situs-hex" value={f.warna_utama} onChange={isi('warna_utama')} maxLength={7} autoComplete="off" spellCheck={false} />
            </div>
          </div>
          {peringatan && <span className="petunjuk">{peringatan}</span>}
        </fieldset>
        <div className="kolom">
          <label htmlFor="situs-mode">Mode tampilan bawaan</label>
          <select id="situs-mode" value={f.mode_bawaan} onChange={isi('mode_bawaan')}>
            <option value="sistem">Ikuti pengaturan perangkat</option>
            <option value="terang">Terang</option>
            <option value="gelap">Gelap</option>
          </select>
          <span className="petunjuk">Setiap pengguna tetap bisa mengganti sendiri dari menu atas.</span>
        </div>

        <div className="kartu-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <Pratinjau nama={f.nama_situs.trim()} logo={f.logo_url.trim()} warna={f.warna_utama} gelap={false} />
          <Pratinjau nama={f.nama_situs.trim()} logo={f.logo_url.trim()} warna={f.warna_utama} gelap />
        </div>

        <KotakGalat galat={pesanForm || galat} />
        {tersimpan && (
          <p className="info" role="status">
            Tampilan tersimpan. Pengguna lain melihatnya saat memuat ulang halaman.
          </p>
        )}
        <div className="baris">
          <button type="submit" className="btn utama" disabled={sibuk}>
            Simpan tampilan
          </button>
        </div>
      </form>
    </section>
  )
}