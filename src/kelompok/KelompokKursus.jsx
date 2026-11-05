import { useState } from 'react'
import { Kosong, KotakGalat, Memuat, TombolKonfirmasi } from '../components/ui.jsx'
import { useAksi, useMuat } from '../lib/hooks.js'
import { ambil, supabase } from '../lib/supabase.js'
import { BATAS_ACAK, periksaJumlahAcak, periksaNama, pratinjauAcak, teksUkuran, tujuanPindah } from './aturan.js'

// Panel guru: set kelompok untuk tugas kelompok. Satu set bisa dipakai beberapa tugas.
export default function KelompokKursus({ kursusId }) {
  const { sibuk, galat, setGalat, jalankan } = useAksi()
  const [nama, setNama] = useState('')
  const [salah, setSalah] = useState('')
  const [buka, setBuka] = useState(null)
  const { data, error, memuat, muatUlang } = useMuat(
    async () => ambil(await supabase.rpc('daftar_set_kelompok', { kursus: kursusId })),
    [kursusId],
  )

  const buat = (e) => {
    e.preventDefault()
    const pesan = periksaNama(nama)
    setSalah(pesan ?? '')
    if (pesan) return
    jalankan(async () => {
      const id = ambil(await supabase.rpc('buat_set_kelompok', { kursus: kursusId, nama_baru: nama.trim() }))
      setNama('')
      await muatUlang()
      setBuka(id)
    })
  }

  return (
    <section className="panel" aria-labelledby="judul-kelompok">
      <h3 id="judul-kelompok">Kelompok untuk tugas kelompok</h3>
      <p className="petunjuk">
        Buat satu set (misalnya &quot;Proyek 1&quot;), bagi siswa ke kelompok secara acak atau manual, lalu pilih set itu di
        pengaturan tugas. Set yang sama bisa dipakai beberapa tugas.
      </p>
      <KotakGalat galat={galat || (error && String(error.message ?? error))} onTutup={() => setGalat('')} />
      <form className="form-baris" onSubmit={buat}>
        <div className="kolom">
          <label htmlFor="nama-set">Nama set baru</label>
          <input
            id="nama-set"
            value={nama}
            maxLength={80}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Contoh: Proyek 1"
          />
        </div>
        <div>
          <button type="submit" className="btn utama" disabled={sibuk}>
            Buat set
          </button>
        </div>
      </form>
      {salah && (
        <p className="galat" role="alert">
          {salah}
        </p>
      )}

      {memuat && !data && <Memuat bentuk="daftar" />}
      {data && data.length === 0 && <Kosong>Belum ada set kelompok.</Kosong>}
      <ul className="daftar-ulasan">
        {(data ?? []).map((s) => (
          <li key={s.id} className="butir-ulasan">
            <div className="ulasan-kepala">
              <strong>{s.nama}</strong>
              <span className="petunjuk">
                {s.jumlah_kelompok} kelompok · dipakai {s.dipakai_tugas} tugas
              </span>
              <button
                type="button"
                className="btn kecil"
                aria-expanded={buka === s.id}
                onClick={() => setBuka(buka === s.id ? null : s.id)}
              >
                {buka === s.id ? 'Tutup' : 'Kelola'}
              </button>
            </div>
            {buka === s.id && <KelolaSet set={s} onBerubah={muatUlang} />}
          </li>
        ))}
      </ul>
    </section>
  )
}

function KelolaSet({ set, onBerubah }) {
  const { sibuk, galat, setGalat, jalankan } = useAksi()
  const [info, setInfo] = useState('')
  const [jumlah, setJumlah] = useState('3')
  const [namaBaru, setNamaBaru] = useState('')
  const [salah, setSalah] = useState('')
  const [ubahNamaSet, setUbahNamaSet] = useState(null)

  const { data, error, memuat, muatUlang } = useMuat(async () => {
    const [kelompok, tanpa] = await Promise.all([
      supabase.rpc('daftar_kelompok', { id_set: set.id }),
      supabase.rpc('siswa_tanpa_kelompok', { id_set: set.id }),
    ])
    return { kelompok: ambil(kelompok), tanpa: ambil(tanpa) }
  }, [set.id])

  const aksi = (fungsi, pesan) =>
    jalankan(async () => {
      setInfo('')
      const hasil = await fungsi()
      await Promise.all([muatUlang(), onBerubah()])
      if (pesan) setInfo(pesan(hasil))
    })

  const rpc = async (nama, args) => ambil(await supabase.rpc(nama, args))
  const tanpa = data?.tanpa ?? []
  const n = Number(jumlah)
  const galatAcak = data ? periksaJumlahAcak(n, tanpa.length) : null
  const ukuran = teksUkuran(pratinjauAcak(n, tanpa.length))

  const tambah = (e) => {
    e.preventDefault()
    const pesan = periksaNama(namaBaru)
    setSalah(pesan ?? '')
    if (pesan) return
    aksi(async () => {
      await rpc('simpan_kelompok', { id_set: set.id, id_kelompok: null, nama_baru: namaBaru.trim() })
      setNamaBaru('')
    })
  }

  return (
    <div className="kolom kelola-set">
      <KotakGalat galat={galat || (error && String(error.message ?? error))} onTutup={() => setGalat('')} />
      {info && (
        <p className="info" role="status">
          {info}
        </p>
      )}
      {memuat && !data && <Memuat bentuk="daftar" />}

      {data && (
        <>
          <div className="baris">
            {ubahNamaSet === null ? (
              <button type="button" className="btn kecil" onClick={() => setUbahNamaSet(set.nama)}>
                Ubah nama set
              </button>
            ) : (
              <form
                className="baris"
                onSubmit={(e) => {
                  e.preventDefault()
                  const pesan = periksaNama(ubahNamaSet)
                  if (pesan) return setGalat(pesan)
                  aksi(async () => {
                    await rpc('ubah_set_kelompok', { id_set: set.id, nama_baru: ubahNamaSet.trim() })
                    setUbahNamaSet(null)
                  })
                }}
              >
                <label className="sr-only" htmlFor={`nama-set-${set.id}`}>
                  Nama set
                </label>
                <input
                  id={`nama-set-${set.id}`}
                  value={ubahNamaSet}
                  maxLength={80}
                  onChange={(e) => setUbahNamaSet(e.target.value)}
                />
                <button type="submit" className="btn kecil utama" disabled={sibuk}>
                  Simpan
                </button>
                <button type="button" className="btn kecil" onClick={() => setUbahNamaSet(null)}>
                  Batal
                </button>
              </form>
            )}
            {set.dipakai_tugas > 0 ? (
              <span className="petunjuk">Set ini dipakai {set.dipakai_tugas} tugas, jadi tidak bisa dihapus.</span>
            ) : (
              <TombolKonfirmasi
                label="Hapus set"
                tanya="Hapus set ini beserta semua kelompoknya?"
                disabled={sibuk}
                onYakin={() => aksi(async () => rpc('hapus_set_kelompok', { id_set: set.id }))}
              />
            )}
          </div>

          <div className="panel">
            <h4>Bagi acak</h4>
            <p className="petunjuk">
              {tanpa.length} siswa belum punya kelompok. Mereka dibagi merata ke kelompok baru secara acak. Kelompok yang sudah
              ada tidak diubah.
            </p>
            <form
              className="form-baris"
              onSubmit={(e) => {
                e.preventDefault()
                if (galatAcak) return setGalat(galatAcak)
                aksi(
                  async () => rpc('bagi_acak_kelompok', { id_set: set.id, jumlah: n }),
                  (dibagi) => `${dibagi} siswa dibagi ke kelompok baru.`,
                )
              }}
            >
              <div className="kolom">
                <label htmlFor={`acak-${set.id}`}>Jumlah kelompok baru</label>
                <input
                  id={`acak-${set.id}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={BATAS_ACAK}
                  value={jumlah}
                  onChange={(e) => setJumlah(e.target.value)}
                />
              </div>
              <div>
                <button type="submit" className="btn utama" disabled={sibuk || tanpa.length === 0}>
                  Bagi acak
                </button>
              </div>
            </form>
            {ukuran && <p className="petunjuk">Hasilnya: {ukuran}.</p>}
          </div>

          <div className="panel">
            <h4>Pembagian manual</h4>
            <form className="form-baris" onSubmit={tambah}>
              <div className="kolom">
                <label htmlFor={`kel-baru-${set.id}`}>Tambah kelompok kosong</label>
                <input
                  id={`kel-baru-${set.id}`}
                  value={namaBaru}
                  maxLength={80}
                  onChange={(e) => setNamaBaru(e.target.value)}
                  placeholder="Contoh: Kelompok 1"
                />
              </div>
              <div>
                <button type="submit" className="btn" disabled={sibuk}>
                  Tambah kelompok
                </button>
              </div>
            </form>
            {salah && (
              <p className="galat" role="alert">
                {salah}
              </p>
            )}

            {tanpa.length > 0 && (
              <div className="kolom">
                <h5>Belum punya kelompok ({tanpa.length})</h5>
                <ul className="daftar-anggota">
                  {tanpa.map((s) => (
                    <li key={s.id}>
                      <span>
                        {s.nama} <span className="petunjuk">({s.kelas})</span>
                      </span>
                      <PilihTujuan
                        label={`Masukkan ${s.nama} ke kelompok`}
                        kosong="Masukkan ke…"
                        pilihan={data.kelompok}
                        disabled={sibuk || data.kelompok.length === 0}
                        onPilih={(tujuan) => aksi(async () => rpc('pindahkan_siswa', { id_set: set.id, siswa: s.id, tujuan }))}
                      />
                    </li>
                  ))}
                </ul>
                {data.kelompok.length === 0 && <p className="petunjuk">Tambah kelompok dulu, atau pakai Bagi acak.</p>}
              </div>
            )}
          </div>

          {data.kelompok.length === 0 && <Kosong>Belum ada kelompok di set ini.</Kosong>}
          <div className="kartu-grid">
            {data.kelompok.map((k) => (
              <KartuKelompok
                key={k.id}
                k={k}
                semua={data.kelompok}
                sibuk={sibuk}
                onGanti={(nama) =>
                  aksi(async () => rpc('simpan_kelompok', { id_set: set.id, id_kelompok: k.id, nama_baru: nama }))
                }
                onHapus={() => aksi(async () => rpc('hapus_kelompok', { id_kelompok: k.id }))}
                onPindah={(siswa, tujuan) => aksi(async () => rpc('pindahkan_siswa', { id_set: set.id, siswa, tujuan }))}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function KartuKelompok({ k, semua, sibuk, onGanti, onHapus, onPindah }) {
  const [ubah, setUbah] = useState(null)
  const [salah, setSalah] = useState('')
  return (
    <article className="kartu">
      {ubah === null ? (
        <h5>
          {k.nama} <span className="petunjuk">({k.anggota.length} anggota)</span>
        </h5>
      ) : (
        <form
          className="baris"
          onSubmit={(e) => {
            e.preventDefault()
            const pesan = periksaNama(ubah)
            setSalah(pesan ?? '')
            if (pesan) return
            onGanti(ubah.trim())
            setUbah(null)
          }}
        >
          <label className="sr-only" htmlFor={`nk-${k.id}`}>
            Nama kelompok
          </label>
          <input id={`nk-${k.id}`} value={ubah} maxLength={80} onChange={(e) => setUbah(e.target.value)} />
          <button type="submit" className="btn kecil utama" disabled={sibuk}>
            Simpan
          </button>
          <button type="button" className="btn kecil" onClick={() => setUbah(null)}>
            Batal
          </button>
        </form>
      )}
      {salah && (
        <p className="galat" role="alert">
          {salah}
        </p>
      )}
      {k.anggota.length === 0 && <p className="petunjuk">Belum ada anggota.</p>}
      <ul className="daftar-anggota">
        {k.anggota.map((a) => (
          <li key={a.id}>
            <span>{a.nama}</span>
            <PilihTujuan
              label={`Pindahkan ${a.nama}`}
              kosong="Pindahkan…"
              pilihan={tujuanPindah(semua, k.id)}
              lepas
              disabled={sibuk}
              onPilih={(tujuan) => onPindah(a.id, tujuan)}
            />
          </li>
        ))}
      </ul>
      <div className="baris">
        {ubah === null && (
          <button type="button" className="btn kecil" onClick={() => setUbah(k.nama)}>
            Ubah nama
          </button>
        )}
        {k.punya_kiriman ? (
          <span className="petunjuk">Sudah punya kiriman, tidak bisa dihapus.</span>
        ) : (
          <TombolKonfirmasi label="Hapus kelompok" tanya="Hapus kelompok ini?" disabled={sibuk} onYakin={onHapus} />
        )}
      </div>
    </article>
  )
}

// Pilihan tujuan: kelompok lain, atau (bila lepas) "Lepas dari kelompok".
function PilihTujuan({ label, kosong, pilihan, lepas = false, disabled, onPilih }) {
  return (
    <select
      aria-label={label}
      value=""
      disabled={disabled}
      onChange={(e) => {
        const v = e.target.value
        if (v) onPilih(v === '__lepas__' ? null : v)
      }}
    >
      <option value="">{kosong}</option>
      {pilihan.map((p) => (
        <option key={p.id} value={p.id}>
          {p.nama}
        </option>
      ))}
      {lepas && <option value="__lepas__">Lepas dari kelompok</option>}
    </select>
  )
}