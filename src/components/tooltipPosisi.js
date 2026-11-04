// Menghitung posisi tooltip (koordinat tetap) di bawah elemen, atau di atasnya bila ruang bawah tidak cukup.
// Tooltip dijaga tetap di dalam layar.
export function hitungPosisi(rect, lebar, tinggi, vw, vh, jarak = 8, tepi = 8) {
  const ruangBawah = vh - rect.bottom
  const diAtas = ruangBawah < tinggi + jarak + tepi && rect.top > ruangBawah
  const top = diAtas ? rect.top - tinggi - jarak : rect.bottom + jarak
  const tengah = rect.left + rect.width / 2
  const left = Math.max(tepi, Math.min(tengah - lebar / 2, vw - lebar - tepi))
  return { left, top: Math.max(tepi, top), diAtas }
}