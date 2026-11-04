// Aturan murni untuk unggahan ke Google Drive guru (tanpa jaringan, mudah diuji).

export const JENIS_GAMBAR = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
export const JENIS_DOKUMEN = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
export const BATAS_GAMBAR = 10 * 1024 * 1024
export const BATAS_DOKUMEN = 25 * 1024 * 1024

const juta = (b) => `${Math.round(b / 1024 / 1024)} MB`

// terima: 'gambar' (hanya gambar) atau 'semua' (gambar dan dokumen).
// Hasil: { ok: true, jenis: 'gambar'|'dokumen' } atau { ok: false, galat }
export function periksaFile(file, terima = 'semua') {
  if (!file || typeof file.size !== 'number') return { ok: false, galat: 'Berkas tidak terbaca.' }
  if (file.size === 0) return { ok: false, galat: 'Berkas kosong.' }
  if (JENIS_GAMBAR.includes(file.type)) {
    if (file.size > BATAS_GAMBAR) return { ok: false, galat: `Gambar terlalu besar (maksimal ${juta(BATAS_GAMBAR)}).` }
    return { ok: true, jenis: 'gambar' }
  }
  if (terima === 'gambar') return { ok: false, galat: 'Pilih gambar berformat PNG, JPG, WebP, atau GIF.' }
  if (JENIS_DOKUMEN.includes(file.type)) {
    if (file.size > BATAS_DOKUMEN) return { ok: false, galat: `Dokumen terlalu besar (maksimal ${juta(BATAS_DOKUMEN)}).` }
    return { ok: true, jenis: 'dokumen' }
  }
  return { ok: false, galat: 'Format belum didukung. Pilih gambar, PDF, Word, PowerPoint, atau Excel.' }
}

export const atributTerima = (terima) => (terima === 'gambar' ? JENIS_GAMBAR : [...JENIS_GAMBAR, ...JENIS_DOKUMEN]).join(',')

export const namaFolder = (namaSitus) =>
  `${
    String(namaSitus ?? '')
      .trim()
      .slice(0, 80) || 'Kelas Online'
  } – File Materi`

// Tanda petik tunggal dan garis miring terbalik di dalam kueri Drive harus di-escape.
export const escapeKueri = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")

const ID = /^[\w-]{10,}$/
export const idValid = (id) => typeof id === 'string' && ID.test(id)

// Gambar untuk <img>: thumbnail berukuran lebar 1600 piksel (file harus dibagikan lewat link).
export const urlGambar = (id) => `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600`
// Link buka biasa; toEmbed() mengubahnya menjadi tampilan pratinjau di halaman.
export const urlBuka = (id) => `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`

export const tanpaEkstensi = (nama) =>
  String(nama ?? '')
    .replace(/\.[^./\\]{1,8}$/, '')
    .slice(0, 150)