import { useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { KotakGalat } from '../components/ui.jsx'
import { useTema } from '../tema/TemaProvider.jsx'
import { bagikanPublik, cariAtauBuatFolder, GalatDrive, unggah } from './api.js'
import { atributTerima, namaFolder, periksaFile, tanpaEkstensi, urlBuka, urlGambar } from './aturan.js'
import { ambilToken, driveSiap, lupakanToken, pickerSiap, pilihDariDrive } from './google.js'

const KUNCI_FOLDER = 'drive-folder'

const bacaFolder = (nama) => {
  try {
    const c = JSON.parse(localStorage.getItem(KUNCI_FOLDER) ?? '{}')
    return c.nama === nama ? c.id : null
  } catch {
    return null
  }
}
const simpanFolder = (nama, id) => {
  try {
    localStorage.setItem(KUNCI_FOLDER, JSON.stringify({ nama, id }))
  } catch {
    /* penyimpanan tidak tersedia */
  }
}

// Tombol "Unggah ke Drive" dan "Pilih dari Drive". Tidak tampil bila Client ID Google belum diisi.
// onPilih({ id, nama, jenis, urlBuka, urlGambar, peringatan })
export default function PanelDrive({ terima = 'semua', onPilih }) {
  const { sesi } = useAuth()
  const { situs } = useTema()
  const berkas = useRef(null)
  const [status, setStatus] = useState('') // teks tahap saat ini
  const [progres, setProgres] = useState(null)
  const [galat, setGalat] = useState('')
  const sibuk = Boolean(status)

  if (!driveSiap) return null

  const jalan = async (kerja) => {
    setGalat('')
    try {
      await kerja()
    } catch (e) {
      if (e instanceof GalatDrive && e.status === 401) lupakanToken()
      setGalat(e?.message || 'Terjadi masalah saat menghubungi Google Drive.')
    } finally {
      setStatus('')
      setProgres(null)
    }
  }

  const bagikan = async (token, id) => {
    setStatus('Mengatur agar siswa bisa membuka berkas…')
    try {
      await bagikanPublik(token, id)
      return ''
    } catch {
      return 'Berkas belum bisa dibagikan otomatis. Di Drive, atur "Siapa saja yang memiliki link" agar siswa bisa membukanya.'
    }
  }

  const unggahBerkas = (file) =>
    jalan(async () => {
      const cek = periksaFile(file, terima)
      if (!cek.ok) throw new Error(cek.galat)
      setStatus('Menyambungkan ke Google…')
      const token = await ambilToken(sesi?.user?.email)
      const nama = namaFolder(situs.nama_situs)
      let folder = bacaFolder(nama)
      if (!folder) {
        setStatus('Menyiapkan folder di Drive Anda…')
        folder = await cariAtauBuatFolder(token, nama)
        simpanFolder(nama, folder)
      }
      setStatus('Mengunggah…')
      let hasil
      try {
        hasil = await unggah(token, file, folder, { onProgres: setProgres })
      } catch (e) {
        // Folder lama mungkin terhapus: lupakan lalu minta coba lagi.
        if (e?.status === 404) simpanFolder(nama, '')
        throw e
      }
      const peringatan = await bagikan(token, hasil.id)
      onPilih({
        id: hasil.id,
        nama: tanpaEkstensi(hasil.nama),
        jenis: cek.jenis,
        urlBuka: urlBuka(hasil.id),
        urlGambar: urlGambar(hasil.id),
        peringatan,
      })
    })

  const pilihBerkas = () =>
    jalan(async () => {
      setStatus('Menyambungkan ke Google…')
      const token = await ambilToken(sesi?.user?.email)
      setStatus('Membuka pemilih berkas…')
      const p = await pilihDariDrive(token, terima)
      if (!p) return
      const peringatan = await bagikan(token, p.id)
      onPilih({
        id: p.id,
        nama: tanpaEkstensi(p.nama),
        jenis: terima === 'gambar' ? 'gambar' : 'dokumen',
        urlBuka: urlBuka(p.id),
        urlGambar: urlGambar(p.id),
        peringatan,
      })
    })

  return (
    <div className="panel-drive">
      <div className="baris rapat">
        <button type="button" className="btn kecil" disabled={sibuk} onClick={() => berkas.current?.click()}>
          ⬆ Unggah ke Drive
        </button>
        {pickerSiap && (
          <button type="button" className="btn kecil" disabled={sibuk} onClick={pilihBerkas}>
            📁 Pilih dari Drive
          </button>
        )}
        <input
          ref={berkas}
          type="file"
          hidden
          accept={atributTerima(terima)}
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) unggahBerkas(f)
          }}
        />
      </div>
      {sibuk && (
        <p className="petunjuk" role="status">
          {status}
          {progres != null && ` ${Math.round(progres * 100)}%`}
        </p>
      )}
      {progres != null && <progress max="1" value={progres} aria-label="Kemajuan unggahan" />}
      <KotakGalat galat={galat} onTutup={() => setGalat('')} />
    </div>
  )
}