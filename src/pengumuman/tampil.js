// Pembantu tampilan pengumuman.
export const waktuPengumuman = (iso) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// Disematkan dulu, lalu terbaru.
export const urutkanPengumuman = (daftar) =>
  [...daftar].sort((a, b) => Number(b.disematkan) - Number(a.disematkan) || new Date(b.dibuat_pada) - new Date(a.dibuat_pada))

const kunci = (kursusId) => `lms.pengumuman.${kursusId}`
export function terakhirDilihat(kursusId) {
  try {
    return Number(localStorage.getItem(kunci(kursusId))) || 0
  } catch {
    return 0
  }
}
export function tandaiDilihat(kursusId) {
  try {
    localStorage.setItem(kunci(kursusId), String(Date.now()))
  } catch {
    /* abaikan */
  }
}