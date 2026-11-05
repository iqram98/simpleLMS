// Aturan murni untuk kelompok tugas (tanpa jaringan, mudah diuji).

export const BATAS_NAMA = 80
export const BATAS_ACAK = 50

// Hasil: pesan galat atau null bila nama boleh dipakai.
export function periksaNama(nama) {
  const n = String(nama ?? '').trim()
  if (n.length < 1) return 'Nama tidak boleh kosong.'
  if (n.length > BATAS_NAMA) return `Nama maksimal ${BATAS_NAMA} karakter.`
  return null
}

// tersedia = jumlah siswa yang belum punya kelompok.
export function periksaJumlahAcak(jumlah, tersedia) {
  if (tersedia < 1) return 'Semua siswa sudah punya kelompok.'
  if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > BATAS_ACAK) return `Jumlah kelompok harus 1 sampai ${BATAS_ACAK}.`
  return null
}

// Pratinjau pembagian acak: jumlah kelompok yang benar-benar dibuat dan ukurannya.
export function pratinjauAcak(jumlah, tersedia) {
  if (tersedia < 1 || !Number.isInteger(jumlah) || jumlah < 1) return { kelompok: 0, kecil: 0, besar: 0 }
  const kelompok = Math.min(jumlah, tersedia)
  return { kelompok, kecil: Math.floor(tersedia / kelompok), besar: Math.ceil(tersedia / kelompok) }
}

export function teksUkuran({ kelompok, kecil, besar }) {
  if (kelompok === 0) return ''
  const per = kecil === besar ? `${besar} siswa` : `${kecil} sampai ${besar} siswa`
  return `${kelompok} kelompok, masing-masing ${per}`
}

export const teksAnggota = (anggota) => (anggota ?? []).map((a) => a.nama).join(', ')

// Tugas kelompok: kelompok_set_id terisi.
export const adalahTugasKelompok = (st) => Boolean(st?.kelompok_set_id)

// Pilihan tujuan saat memindahkan siswa, tanpa kelompok asalnya.
export const tujuanPindah = (kelompok, asalId) => (kelompok ?? []).filter((k) => k.id !== asalId)