// Menghitung warna turunan dari satu warna utama pilihan admin, sehingga teks
// selalu terbaca (rasio kontras WCAG minimal 4,5 untuk teks, 3 untuk tombol).

const HEX = /^#[0-9a-fA-F]{6}$/
export const warnaValid = (h) => HEX.test(String(h ?? ''))

const keRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const keHex = (rgb) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')

const lin = (v) => {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
export const luminansi = (h) => {
  const [r, g, b] = keRgb(h)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}
export const kontras = (a, b) => {
  const [x, y] = [luminansi(a), luminansi(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
// Campuran: t = 0 menghasilkan a, t = 1 menghasilkan b.
export const campur = (a, b, t) => {
  const p = keRgb(a)
  const q = keRgb(b)
  return keHex(p.map((v, i) => v + (q[i] - v) * t))
}

// Menggeser warna ke arah `ke` sampai kontras terhadap `latar` mencapai `target`.
function sesuaikan(warna, latar, ke, target) {
  let w = warna
  for (let t = 0; t <= 1.0001 && kontras(w, latar) < target; t += 0.04) w = campur(warna, ke, t)
  return w
}

const LATAR = { terang: '#ffffff', gelap: '#171b24' }
const TEKS_GELAP = '#0b1220'

// Hasil: peta variabel CSS untuk mode terang atau gelap.
export function variabelTema(utama, gelap) {
  const latar = gelap ? LATAR.gelap : LATAR.terang
  const ke = gelap ? '#ffffff' : '#000000'
  // Isi tombol: cukup kontras 3:1 terhadap latar agar batasnya terlihat.
  const isi = sesuaikan(utama, latar, ke, 3)
  const diIsi = kontras(isi, '#ffffff') >= kontras(isi, TEKS_GELAP) ? '#ffffff' : TEKS_GELAP
  // Teks dan tautan berwarna: 4,5:1 terhadap latar.
  const teks = sesuaikan(utama, latar, ke, 4.5)
  const lembut = campur(latar, isi, gelap ? 0.22 : 0.1)
  return {
    '--aksen': isi,
    '--di-aksen': diIsi,
    '--aksen-teks': teks,
    '--aksen-lembut': lembut,
  }
}

// Peringatan ramah untuk formulir admin. Mengembalikan teks atau ''.
export function peringatanWarna(utama) {
  if (!warnaValid(utama)) return ''
  const l = luminansi(utama)
  if (l > 0.8) return 'Warna ini sangat terang. Aplikasi akan menggelapkannya otomatis agar teks tetap terbaca.'
  if (l < 0.02) return 'Warna ini hampir hitam, jadi tombol dan tautan akan terlihat tidak berbeda dari teks biasa.'
  return ''
}