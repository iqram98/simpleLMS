import { useEffect, useState } from 'react'
import { KotakGalat, Memuat, TombolKonfirmasi } from '../components/ui.jsx'
import { useAksi, useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'
import { Bintang, PilihBintang } from './Bintang.jsx'
import { BATAS_KOMENTAR, periksaBalasan, periksaUlasan, sisaKarakter, tanggalPendek, teksRating } from './aturan.js'

const BATAS_AWAL = 3

// Ringkasan, daftar, dan (bila boleh) form ulasan satu kursus.
// bisaMenulis   : siswa aktif di kursus ini
// bisaBalas     : guru pemilik (atau admin)
// bisaSembunyikan: admin
export default function UlasanKursus({ kursusId, bisaMenulis = false, bisaBalas = false, bisaSembunyikan = false, onBerubah }) {
  const { sibuk, galat, setGalat, jalankan } = useAksi()
  const [formBuka, setFormBuka] = useState(false)
  const [semua, setSemua] = useState(false)
  const { data, error, memuat, muatUlang } = useMuat(async () => {
    const [daftar, ringkasan] = await Promise.all([
      supabase.rpc('daftar_ulasan', { kursus: kursusId }),
      supabase.rpc('ringkasan_ulasan', { kursus: kursusId }),
    ])
    return { daftar: ambil(daftar), ringkasan: ambil(ringkasan)?.[0] ?? { rata_rata: null, jumlah: 0 } }
  }, [kursusId])

  // Mengembalikan true bila berhasil, supaya form bisa menutup sendiri.
  const aksi = async (fungsi) => {
    const ok = await jalankan(async () => {
      await fungsi()
      await muatUlang()
      onBerubah?.()
      return true
    })
    return Boolean(ok)
  }

  const saya = data?.daftar.find((u) => u.milik_saya) ?? null
  const lain = (data?.daftar ?? []).filter((u) => !u.milik_saya)
  const terlihat = semua ? lain : lain.slice(0, BATAS_AWAL)
  const tersisa = lain.length - terlihat.length

  return (
    <section className="bagian ulasan" aria-labelledby={`ulasan-${kursusId}`}>
      <div className="ulasan-judul">
        <h2 id={`ulasan-${kursusId}`}>Ulasan kursus</h2>
        {bisaMenulis && data && !saya && !formBuka && (
          <button type="button" className="btn utama kecil" onClick={() => setFormBuka(true)}>
            Tulis ulasan
          </button>
        )}
      </div>
      {memuat && !data && <Memuat bentuk="daftar" />}
      <KotakGalat galat={galat || (error && pesanError(error))} onTutup={() => setGalat('')} />
      {data && (
        <>
          <p className="ringkas-ulasan">
            <Bintang nilai={data.ringkasan.rata_rata} />
            <span>{teksRating(data.ringkasan.rata_rata, data.ringkasan.jumlah)}</span>
          </p>

          {bisaMenulis && formBuka && (
            <FormUlasan
              awal={saya}
              sibuk={sibuk}
              onBatal={() => setFormBuka(false)}
              onKirim={async (bintang, komentar) => {
                const ok = await aksi(async () =>
                  ambil(await supabase.rpc('kirim_ulasan', { kursus: kursusId, nilai: bintang, isi: komentar })),
                )
                if (ok) setFormBuka(false)
              }}
              onHapus={async () => {
                const ok = await aksi(async () => ambil(await supabase.rpc('hapus_ulasan_saya', { kursus: kursusId })))
                if (ok) setFormBuka(false)
              }}
            />
          )}

          {data.daftar.length === 0 && <p className="kosong">Belum ada ulasan.</p>}
          <ul className="daftar-ulasan">
            {[...(saya && !(bisaMenulis && formBuka) ? [saya] : []), ...terlihat].map((u) => (
              <ButirUlasan
                key={u.id}
                u={u}
                sibuk={sibuk}
                bisaBalas={bisaBalas}
                bisaSembunyikan={bisaSembunyikan}
                onUbah={bisaMenulis && u.milik_saya ? () => setFormBuka(true) : null}
                onBalas={(isi) => aksi(async () => ambil(await supabase.rpc('balas_ulasan', { ulasan: u.id, isi })))}
                onSembunyi={(s) =>
                  aksi(async () => ambil(await supabase.rpc('sembunyikan_ulasan', { ulasan: u.id, sembunyi: s })))
                }
              />
            ))}
          </ul>
          {lain.length > BATAS_AWAL && (
            <div>
              <button type="button" className="btn kecil" aria-expanded={semua} onClick={() => setSemua((v) => !v)}>
                {semua ? 'Tampilkan lebih sedikit' : `Tampilkan semua (${tersisa} lagi)`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function FormUlasan({ awal, sibuk, onKirim, onHapus, onBatal }) {
  const [bintang, setBintang] = useState(awal?.bintang ?? 0)
  const [komentar, setKomentar] = useState(awal?.komentar ?? '')
  const [salah, setSalah] = useState('')
  const sisa = sisaKarakter(komentar)

  const kirim = (e) => {
    e.preventDefault()
    const pesan = periksaUlasan(bintang, komentar)
    setSalah(pesan ?? '')
    if (!pesan) onKirim(bintang, komentar.trim() || null)
  }

  return (
    <form className="panel" onSubmit={kirim}>
      <h3>{awal ? 'Ulasanmu' : 'Beri ulasan'}</h3>
      {awal?.disembunyikan && (
        <p className="info" role="status">
          Ulasanmu disembunyikan admin, jadi tidak terlihat oleh orang lain.
        </p>
      )}
      <PilihBintang nilai={bintang} onUbah={setBintang} disabled={sibuk} />
      <div className="kolom">
        <label htmlFor="komentar-ulasan">Komentar (opsional)</label>
        <textarea
          id="komentar-ulasan"
          rows={3}
          value={komentar}
          onChange={(e) => setKomentar(e.target.value)}
          maxLength={BATAS_KOMENTAR + 50}
          aria-describedby="sisa-komentar"
          placeholder="Ceritakan pengalamanmu belajar di kursus ini"
        />
        <span id="sisa-komentar" className={`petunjuk ${sisa < 0 ? 'galat-teks' : ''}`}>
          {sisa >= 0 ? `Sisa ${sisa} karakter` : `Kelebihan ${-sisa} karakter`}
        </span>
      </div>
      {salah && (
        <p className="galat" role="alert">
          {salah}
        </p>
      )}
      <div className="baris">
        <button type="submit" className="btn utama" disabled={sibuk}>
          {awal ? 'Simpan perubahan' : 'Kirim ulasan'}
        </button>
        {awal && <TombolKonfirmasi label="Hapus ulasanku" tanya="Hapus ulasan ini?" disabled={sibuk} onYakin={onHapus} />}
      </div>
    </form>
  )
}

function ButirUlasan({ u, sibuk, bisaBalas, bisaSembunyikan, onUbah, onBalas, onSembunyi }) {
  const [balas, setBalas] = useState(false)
  const [isi, setIsi] = useState(u.balasan ?? '')
  const [salah, setSalah] = useState('')
  useEffect(() => setIsi(u.balasan ?? ''), [u.balasan])

  const kirimBalasan = (e) => {
    e.preventDefault()
    const pesan = periksaBalasan(isi)
    setSalah(pesan ?? '')
    if (pesan) return
    onBalas(isi.trim())
    setBalas(false)
  }

  return (
    <li className={`butir-ulasan ${u.disembunyikan ? 'tersembunyi' : ''}`}>
      <div className="ulasan-kepala">
        <strong>{u.milik_saya ? `${u.nama} (kamu)` : u.nama}</strong>
        <Bintang nilai={u.bintang} />
        <span className="petunjuk">{tanggalPendek(u.dibuat_pada)}</span>
        {u.disembunyikan && <span className="lencana">Disembunyikan</span>}
      </div>
      {u.komentar && <p className="ulasan-isi">{u.komentar}</p>}
      {u.balasan && (
        <div className="balasan-guru">
          <strong>Balasan guru</strong>
          <p>{u.balasan}</p>
        </div>
      )}
      {(bisaBalas || bisaSembunyikan || onUbah) && (
        <div className="baris">
          {onUbah && (
            <button type="button" className="btn kecil" disabled={sibuk} onClick={onUbah}>
              Ubah ulasan
            </button>
          )}
          {bisaBalas && !balas && (
            <button type="button" className="btn kecil" disabled={sibuk} onClick={() => setBalas(true)}>
              {u.balasan ? 'Ubah balasan' : 'Balas'}
            </button>
          )}
          {bisaSembunyikan &&
            (u.disembunyikan ? (
              <button type="button" className="btn kecil" disabled={sibuk} onClick={() => onSembunyi(false)}>
                Tampilkan lagi
              </button>
            ) : (
              <TombolKonfirmasi
                label="Sembunyikan"
                tanya="Sembunyikan ulasan ini dari pengguna lain?"
                disabled={sibuk}
                onYakin={() => onSembunyi(true)}
              />
            ))}
        </div>
      )}
      {balas && (
        <form className="kolom" onSubmit={kirimBalasan}>
          <label htmlFor={`balas-${u.id}`}>Balasan untuk {u.nama}</label>
          <textarea id={`balas-${u.id}`} rows={2} value={isi} onChange={(e) => setIsi(e.target.value)} />
          <span className={`petunjuk ${sisaKarakter(isi) < 0 ? 'galat-teks' : ''}`}>
            {sisaKarakter(isi) >= 0 ? `Sisa ${sisaKarakter(isi)} karakter` : `Kelebihan ${-sisaKarakter(isi)} karakter`}
          </span>
          {salah && (
            <p className="galat" role="alert">
              {salah}
            </p>
          )}
          <div className="baris">
            <button type="submit" className="btn utama kecil" disabled={sibuk}>
              Kirim balasan
            </button>
            <button type="button" className="btn kecil" onClick={() => setBalas(false)}>
              Batal
            </button>
          </div>
        </form>
      )}
    </li>
  )
}