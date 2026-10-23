// Tipe soal Tahap A. Tipe baru ditambahkan di sini, di formulir soal,
// dan di fungsi penilaian database (_nilai_jawaban).
export const TIPE_SOAL = [
  {
    nilai: 'pilihan_ganda',
    label: 'Pilihan ganda',
    petunjuk: 'Satu jawaban benar.',
  },
  {
    nilai: 'pilihan_kompleks',
    label: 'Pilihan ganda kompleks',
    petunjuk: 'Lebih dari satu jawaban benar.',
  },
  {
    nilai: 'benar_salah',
    label: 'Benar atau salah',
    petunjuk: 'Pernyataan yang dinilai benar atau salah.',
  },
  {
    nilai: 'isian_singkat',
    label: 'Isian singkat',
    petunjuk: 'Jawaban berupa kata atau angka.',
  },
]
export const NAMA_TIPE = Object.fromEntries(TIPE_SOAL.map((t) => [t.nilai, t.label]))

export const ATURAN_NILAI = [
  {
    nilai: 'tertinggi',
    label: 'Nilai tertinggi',
    ket: 'Diambil dari percobaan dengan nilai terbaik.',
  },
  {
    nilai: 'terakhir',
    label: 'Nilai terakhir',
    ket: 'Diambil dari percobaan paling akhir.',
  },
  {
    nilai: 'rata_rata',
    label: 'Rata-rata',
    ket: 'Rata-rata semua percobaan yang dikumpulkan.',
  },
  {
    nilai: 'maks_kkm',
    label: 'Maksimal KKM pada percobaan ulang',
    ket: 'Percobaan pertama dipakai apa adanya. Percobaan ulang hanya bisa menaikkan nilai sampai KKM.',
  },
]

export const PEMBAHASAN = [
  { nilai: 'tidak', label: 'Siswa hanya melihat nilai' },
  {
    nilai: 'setelah_selesai',
    label: 'Kunci dan pembahasan terlihat setelah mengumpulkan',
  },
  {
    nilai: 'setelah_tutup',
    label: 'Kunci dan pembahasan terlihat setelah waktu tutup',
  },
]

export const HURUF = 'abcdefghij'

// Ringkasan pengaturan satu kalimat.
export function ringkasPengaturan(p) {
  if (!p) return ''
  const bagian = [
    `${p.maks_percobaan} percobaan`,
    p.durasi_menit ? `${p.durasi_menit} menit` : 'tanpa batas waktu',
    `KKM ${p.kkm}`,
    (ATURAN_NILAI.find((a) => a.nilai === p.aturan_nilai)?.label ?? '').toLowerCase(),
  ]
  return bagian.join(', ')
}

export const sisaWaktu = (ms) => {
  const d = Math.max(0, Math.floor(ms / 1000))
  const j = Math.floor(d / 3600)
  const m = Math.floor((d % 3600) / 60)
  const s = d % 60
  const dua = (n) => String(n).padStart(2, '0')
  return j > 0 ? `${j}:${dua(m)}:${dua(s)}` : `${dua(m)}:${dua(s)}`
}