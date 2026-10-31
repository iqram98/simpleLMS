// Penanda "baru" yang disimpan di browser (tanpa tabel database). Tidak ikut berpindah antar perangkat.
const kunciNilai = (lessonId) => `lms.nilai.${lessonId}`

// Kapan siswa terakhir melihat nilai tugas ini (ms), 0 bila belum pernah.
function terakhirNilai(lessonId) {
  try {
    return Number(localStorage.getItem(kunciNilai(lessonId))) || 0
  } catch {
    return 0
  }
}

// Nilai dianggap sudah dilihat bila dilihat setelah waktu penilaian.
export function sudahDilihatNilai(lessonId, dinilaiPada) {
  return terakhirNilai(lessonId) >= new Date(dinilaiPada).getTime()
}

export function tandaiNilaiDilihat(lessonId) {
  try {
    localStorage.setItem(kunciNilai(lessonId), String(Date.now()))
  } catch {
    /* abaikan */
  }
}