import { useId, useState } from 'react'
import { HARGA, MODE, adalahPublik, kelasAktif, kelasKatalogBerlaku, labelHarga, modeEfektif } from './aturan.js'

const BARU = '__umum__'

// Panel guru: kursus ini privat atau tampil di katalog, gratis atau premium,
// dan kelas mana yang dimasuki pendaftar dari katalog.
export default function PengaturanKatalog({ kursus, kelas, sibuk, onSimpan }) {
  const id = useId()
  const aktif = kelasAktif(kelas)
  const berlaku = kelasKatalogBerlaku(kursus, kelas)
  const [mode, setMode] = useState(kursus.visibilitas)
  const [harga, setHarga] = useState(kursus.harga_tipe)
  const [pilihKelas, setPilihKelas] = useState(berlaku ? kursus.kelas_publik_id : aktif.length > 0 ? aktif[0].id : BARU)

  const publik = adalahPublik(mode)
  const efektif = modeEfektif(mode, harga)
  const berubah =
    mode !== kursus.visibilitas ||
    harga !== kursus.harga_tipe ||
    (publik && pilihKelas !== (berlaku ? kursus.kelas_publik_id : null))
  const tersembunyi = adalahPublik(kursus.visibilitas) && !berlaku

  const simpan = (e) => {
    e.preventDefault()
    onSimpan({ mode, harga, kelas: publik && pilihKelas !== BARU ? pilihKelas : null })
  }

  return (
    <form className="panel" onSubmit={simpan} aria-labelledby={`${id}-judul`}>
      <h3 id={`${id}-judul`}>Katalog dan akses</h3>
      <p className="petunjuk">
        Kursus publik muncul di halaman Katalog untuk semua pengguna yang sudah masuk. Isi materi tetap terkunci sampai siswa
        bergabung.
      </p>
      {tersembunyi && (
        <p className="info" role="status">
          Kelas katalog kursus ini sudah diarsipkan, jadi kursus tidak tampil di katalog. Pilih kelas lain di bawah lalu simpan.
        </p>
      )}

      <fieldset className="pilihan-siswa">
        <legend className="label-kecil">Siapa yang bisa bergabung</legend>
        {MODE.map((m) => (
          <label key={m.nilai} className={`pilihan ${mode === m.nilai ? 'dipilih' : ''}`}>
            <input
              type="radio"
              name={`${id}-mode`}
              value={m.nilai}
              checked={mode === m.nilai}
              onChange={() => setMode(m.nilai)}
            />
            <span className="pilihan-isi">
              <strong>{m.label}</strong>
              <span className="petunjuk"> {m.ket}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="form-baris">
        <div className="kolom">
          <label htmlFor={`${id}-harga`}>Jenis kursus</label>
          <select id={`${id}-harga`} value={harga} onChange={(e) => setHarga(e.target.value)}>
            {HARGA.map((h) => (
              <option key={h.nilai} value={h.nilai}>
                {h.label}
              </option>
            ))}
          </select>
        </div>
        {publik && (
          <div className="kolom">
            <label htmlFor={`${id}-kelas`}>Kelas untuk pendaftar katalog</label>
            <select id={`${id}-kelas`} value={pilihKelas} onChange={(e) => setPilihKelas(e.target.value)}>
              {aktif.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
              {aktif.length === 0 && <option value={BARU}>Buat kelas baru bernama “Umum”</option>}
            </select>
          </div>
        )}
      </div>

      {harga === 'premium' && mode === 'publik_langsung' && (
        <p className="petunjuk" role="status">
          Kursus premium tidak bisa gabung langsung. Pendaftar tetap perlu persetujuan Anda, misalnya setelah pembayaran
          dipastikan.
        </p>
      )}
      {publik && (
        <p className="petunjuk">
          {efektif === 'publik_langsung'
            ? 'Siswa yang menekan Gabung langsung aktif di kelas yang dipilih.'
            : 'Siswa mengajukan, lalu Anda menyetujuinya di halaman Kelola siswa.'}{' '}
          Siswa yang pernah dikeluarkan selalu menunggu persetujuan. Kode kelas tetap bisa dipakai. Kursus ini ditandai{' '}
          <strong>{labelHarga(harga)}</strong>.
        </p>
      )}

      <div>
        <button type="submit" className="btn utama" disabled={sibuk || (!berubah && !tersembunyi)}>
          Simpan
        </button>
      </div>
    </form>
  )
}