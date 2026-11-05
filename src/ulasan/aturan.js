// Aturan murni untuk ulasan kursus (tanpa jaringan, mudah diuji).

export const BATAS_KOMENTAR = 500

export const sisaKarakter = (teks) => BATAS_KOMENTAR - String(teks ?? '').length

// Hasil: pesan galat (string) atau null bila boleh dikirim.
export function periksaUlasan(bintang, komentar) {
  if (!Number.isInteger(bintang) || bintang < 1 || bintang > 5) return 'Pilih jumlah bintang dulu.'
  if (String(komentar ?? '').trim().length > BATAS_KOMENTAR) return `Komentar maksimal ${BATAS_KOMENTAR} karakter.`
  return null
}

export function periksaBalasan(teks) {
  if (String(teks ?? '').trim().length > BATAS_KOMENTAR) return `Balasan maksimal ${BATAS_KOMENTAR} karakter.`
  return null
}

// "4,5 (12 ulasan)" atau "Belum ada ulasan".
export function teksRating(rata, jumlah) {
  const n = Number(jumlah) || 0
  if (n === 0 || rata == null) return 'Belum ada ulasan'
  const angka = Number(rata).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return `${angka} (${n} ulasan)`
}

// Bintang penuh untuk tampilan (pembulatan ke bilangan bulat terdekat, 0-5).
export const bintangPenuh = (rata) => Math.max(0, Math.min(5, Math.round(Number(rata) || 0)))

export function tanggalPendek(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}