// Aturan murni untuk katalog kursus (tanpa jaringan, mudah diuji).

export const MODE = [
  { nilai: 'privat', label: 'Privat', ket: 'Tidak muncul di katalog. Siswa bergabung dengan kode kelas.' },
  {
    nilai: 'publik_langsung',
    label: 'Publik, gabung langsung',
    ket: 'Muncul di katalog. Siswa langsung masuk tanpa persetujuan.',
  },
  {
    nilai: 'publik_persetujuan',
    label: 'Publik, perlu persetujuan',
    ket: 'Muncul di katalog. Siswa mengajukan, guru menyetujui.',
  },
]

export const HARGA = [
  { nilai: 'gratis', label: 'Gratis' },
  { nilai: 'premium', label: 'Premium' },
]

export const labelHarga = (h) => (h === 'premium' ? 'Premium' : 'Gratis')
export const adalahPublik = (v) => v === 'publik_langsung' || v === 'publik_persetujuan'

// Premium tidak boleh gabung langsung. Database menormalkan hal yang sama.
export const modeEfektif = (mode, harga) => (harga === 'premium' && mode === 'publik_langsung' ? 'publik_persetujuan' : mode)

export const labelMode = (v) => MODE.find((m) => m.nilai === v)?.label ?? 'Privat'

// Kelas yang boleh dipilih sebagai kelas katalog: yang belum diarsipkan.
export const kelasAktif = (kelas) => (kelas ?? []).filter((k) => !k.is_archived)

// Kelas katalog saat ini masih berlaku (ada dan belum diarsipkan)?
export function kelasKatalogBerlaku(kursus, kelas) {
  if (!adalahPublik(kursus?.visibilitas) || !kursus?.kelas_publik_id) return false
  return kelasAktif(kelas).some((k) => k.id === kursus.kelas_publik_id)
}

// Tombol di kartu katalog.
// Hasil: { teks, aksi: 'gabung'|'ajukan'|null, status: string|null, info: string }
export function tombolKatalog(k) {
  if (k.milik_saya) return { teks: 'Kursus Anda', aksi: null, status: null, info: 'Kelola dari Beranda.' }
  if (k.status_saya === 'aktif') return { teks: 'Sudah bergabung', aksi: null, status: 'aktif', info: '' }
  if (k.status_saya === 'menunggu')
    return { teks: 'Menunggu persetujuan', aksi: null, status: 'menunggu', info: 'Guru akan memutuskan permintaanmu.' }
  const langsung = modeEfektif(k.visibilitas, k.harga_tipe) === 'publik_langsung'
  const ulang = k.status_saya === 'ditolak' || k.status_saya === 'dikeluarkan'
  if (langsung && !ulang) return { teks: 'Gabung', aksi: 'gabung', status: null, info: '' }
  return {
    teks: ulang ? 'Ajukan lagi' : 'Ajukan bergabung',
    aksi: 'ajukan',
    status: ulang ? k.status_saya : null,
    info: k.harga_tipe === 'premium' ? 'Kursus premium: guru menyetujui setelah pembayaran.' : '',
  }
}

export const PESAN_KATALOG = {
  aktif: 'Berhasil bergabung. Kursus ada di Beranda.',
  menunggu: 'Permintaan terkirim. Tunggu persetujuan guru.',
  sudah_aktif: 'Kamu sudah bergabung di kursus ini.',
  tidak_tersedia: 'Kursus ini sedang tidak tersedia di katalog.',
}

// Pencarian sederhana: judul, deskripsi, nama guru. Huruf besar/kecil diabaikan.
export function saringKatalog(daftar, kata, harga = 'semua') {
  const q = String(kata ?? '')
    .trim()
    .toLowerCase()
  return (daftar ?? []).filter((k) => {
    if (harga !== 'semua' && k.harga_tipe !== harga) return false
    if (!q) return true
    return [k.title, k.description, k.nama_guru].some((t) =>
      String(t ?? '')
        .toLowerCase()
        .includes(q),
    )
  })
}