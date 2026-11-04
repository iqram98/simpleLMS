// Gaya tampilan per blok (kolom blocks.gaya): warna, latar, bingkai.
// Nilainya dibatasi daftar tetap, sama dengan aturan di database (013_gaya_blok.sql).
export const WARNA_BLOK = ['biru', 'hijau', 'oranye', 'merah', 'ungu', 'kuning', 'abu']
export const NAMA_WARNA_BLOK = {
  biru: 'Biru',
  hijau: 'Hijau',
  oranye: 'Oranye',
  merah: 'Merah',
  ungu: 'Ungu',
  kuning: 'Kuning',
  abu: 'Abu-abu',
}
export const BINGKAI = ['garis', 'tebal', 'bayangan', 'judul']
export const NAMA_BINGKAI = {
  garis: 'Garis',
  tebal: 'Garis tebal',
  bayangan: 'Bayangan',
  judul: 'Pita judul di atas',
}

// Bentuk yang aman disimpan, atau null bila tidak ada gaya sama sekali.
export function bersihkanGaya(g) {
  if (!g || typeof g !== 'object' || Array.isArray(g)) return null
  const o = {}
  if (WARNA_BLOK.includes(g.warna)) o.warna = g.warna
  if (g.latar === true) o.latar = true
  if (BINGKAI.includes(g.bingkai)) o.bingkai = g.bingkai
  // Warna tanpa latar maupun bingkai tidak terlihat; tidak disimpan.
  if (!o.latar && !o.bingkai) return null
  return o
}

// Atribut data-* untuk elemen blok; CSS memakai atribut ini.
export function atributGaya(g) {
  const b = bersihkanGaya(g)
  if (!b) return {}
  const a = { 'data-warna': b.warna ?? 'biru' }
  if (b.latar) a['data-latar'] = 'ya'
  if (b.bingkai) a['data-bingkai'] = b.bingkai
  return a
}