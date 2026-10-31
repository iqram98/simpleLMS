// Pembantu tampilan forum.
export const MAKS_JUDUL = 150
export const MAKS_ISI = 5000
export const JEDA_MUAT_ULANG = 30000

export const waktuForum = (iso) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// "5 menit lalu", "kemarin", atau tanggal bila sudah lama.
export function waktuRelatif(iso, sekarang = Date.now()) {
  const detik = Math.max(0, Math.round((sekarang - new Date(iso).getTime()) / 1000))
  if (detik < 60) return 'baru saja'
  if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`
  if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`
  if (detik < 172800) return 'kemarin'
  if (detik < 7 * 86400) return `${Math.floor(detik / 86400)} hari lalu`
  return waktuForum(iso)
}

// Disematkan dulu, lalu aktivitas terbaru.
export const urutkanTopik = (daftar) =>
  [...daftar].sort(
    (a, b) => Number(b.disematkan) - Number(a.disematkan) || new Date(b.aktivitas_terakhir) - new Date(a.aktivitas_terakhir),
  )