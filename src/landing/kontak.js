// Pengubah isian kontak menjadi baris tampilan dan tautan. Fungsi murni agar mudah diuji.

export function tautanEmail(e) {
  const s = String(e ?? '').trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? `mailto:${s}` : null
}

// Menerima 08xxxx, 628xxxx, +62 8xx, atau 8xxxx; hasilnya tautan wa.me berawalan 62.
export function tautanWhatsapp(nomor) {
  let d = String(nomor ?? '').replace(/\D/g, '')
  if (d.length < 8 || d.length > 15) return null
  if (d.startsWith('0')) d = `62${d.slice(1)}`
  else if (d.startsWith('8')) d = `62${d}`
  return `https://wa.me/${d}`
}

export function tautanInstagram(akun) {
  const u = String(akun ?? '')
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '')
  return /^[\w.]{1,30}$/.test(u) ? `https://instagram.com/${u}` : null
}

// Hanya isian yang terisi yang tampil. Hasil: [{ kunci, label, teks, href }]
export function daftarKontak(k) {
  const isi = (v) => String(v ?? '').trim()
  const baris = []
  if (isi(k.email)) baris.push({ kunci: 'email', label: 'Email', teks: isi(k.email), href: tautanEmail(k.email) })
  if (isi(k.whatsapp))
    baris.push({ kunci: 'whatsapp', label: 'WhatsApp', teks: isi(k.whatsapp), href: tautanWhatsapp(k.whatsapp) })
  if (isi(k.instagram))
    baris.push({ kunci: 'instagram', label: 'Instagram', teks: isi(k.instagram), href: tautanInstagram(k.instagram) })
  if (isi(k.alamat)) baris.push({ kunci: 'alamat', label: 'Alamat', teks: isi(k.alamat), href: null })
  return baris
}