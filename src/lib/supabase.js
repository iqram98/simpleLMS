import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const kunci = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Bila .env.local belum diisi, aplikasi menampilkan panduan, bukan layar kosong.
export const konfigurasiLengkap = Boolean(url && kunci)

export const supabase = createClient(url || 'http://localhost', kunci || 'belum-diisi', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Mengembalikan data, atau melempar error bila permintaan gagal.
export function ambil(hasil) {
  if (hasil.error) throw hasil.error
  return hasil.data
}

const PESAN = {
  harus_login: 'Silakan masuk terlebih dahulu.',
  tidak_berwenang: 'Anda tidak berwenang melakukan ini.',
  admin_terakhir: 'Tidak bisa dilakukan karena ini admin terakhir.',
  admin_harus_guru: 'Admin harus berperan guru.',
  tidak_dapat_mengajukan: 'Pengajuan tidak dapat dilakukan.',
  pengguna_tidak_ada: 'Pengguna tidak ditemukan.',
  status_tidak_valid: 'Status tidak valid.',
  ujian_belum_dibuka: 'Ujian ini belum dibuka.',
  ujian_ditutup: 'Ujian ini sudah ditutup.',
  percobaan_habis: 'Kesempatan mengerjakan sudah habis.',
  ujian_belum_siap: 'Ujian ini belum siap. Guru belum menambahkan soal.',
  sudah_dikerjakan: 'Sudah ada siswa yang mengerjakan ujian ini, jadi soal tidak bisa ditambah, dihapus, atau diganti tipenya.',
  soal_tidak_valid: 'Soal belum lengkap atau tidak valid. Periksa teks soal, pilihan jawaban, dan kunci.',
  belum_selesai: 'Percobaan ini belum dikumpulkan.',
  jenis_tidak_bisa_diubah: 'Jenis pelajaran tidak bisa diubah.',
  jawaban_tidak_valid: 'Jawaban tidak valid.',
}

// Mengubah galat teknis menjadi kalimat yang dapat dipahami pengguna.
export function pesanError(e) {
  const teks = String(e?.message ?? e ?? '')
  for (const kunci of Object.keys(PESAN)) {
    if (teks.includes(kunci)) return PESAN[kunci]
  }
  if (/failed to fetch|networkerror|load failed/i.test(teks)) {
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet.'
  }
  switch (e?.code) {
    case '42501':
      return 'Tindakan ini tidak diizinkan untuk akun Anda.'
    case '23514':
      return 'Isi tidak sesuai aturan. Link harus diawali https:// dan teks tidak boleh kosong.'
    case '23503':
      return 'Tidak bisa dihapus karena masih dipakai data lain. Hapus kelas dari kursus ini terlebih dahulu.'
    case '23505':
      return 'Data yang sama sudah ada.'
    default:
      return teks || 'Terjadi kesalahan. Coba lagi.'
  }
}