// Pembersih isi teks berformat. Dipakai sebelum isi disimpan dan sebelum
// ditampilkan, jadi data lama atau data yang diubah langsung lewat API tetap
// aman: hanya jenis simpul dan tanda yang dikenal yang dipertahankan, dan
// tautan serta gambar dipaksa https.

export const WARNA = ['merah', 'biru', 'hijau', 'oranye', 'ungu', 'abu']

const SIMPUL = new Set([
  'doc', 'paragraph', 'text', 'heading', 'bulletList', 'orderedList', 'listItem',
  'blockquote', 'horizontalRule', 'hardBreak', 'table', 'tableRow', 'tableHeader',
  'tableCell', 'image', 'inlineMath', 'blockMath',
])
const TANDA = new Set(['bold', 'italic', 'underline', 'strike', 'link', 'kecil', 'warna'])
const BATAS_DALAM = 40
const BATAS_LATEX = 2000

const httpsSaja = (u) => typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/i.test(u) && u.length <= 2000

function bersihkanTanda(tanda) {
  if (!Array.isArray(tanda)) return undefined
  const hasil = []
  for (const t of tanda) {
    if (!t || !TANDA.has(t.type)) continue
    if (t.type === 'link') {
      if (!httpsSaja(t.attrs?.href)) continue
      hasil.push({ type: 'link', attrs: { href: t.attrs.href } })
    } else if (t.type === 'warna') {
      if (!WARNA.includes(t.attrs?.nama)) continue
      hasil.push({ type: 'warna', attrs: { nama: t.attrs.nama } })
    } else {
      hasil.push({ type: t.type })
    }
  }
  return hasil.length ? hasil : undefined
}

function bersihkanSimpul(n, dalam) {
  if (!n || typeof n !== 'object' || !SIMPUL.has(n.type) || dalam > BATAS_DALAM) return null
  const o = { type: n.type }

  if (n.type === 'text') {
    if (typeof n.text !== 'string' || n.text === '') return null
    o.text = n.text
    const tanda = bersihkanTanda(n.marks)
    if (tanda) o.marks = tanda
    return o
  }
  if (n.type === 'heading') {
    o.attrs = { level: n.attrs?.level === 3 ? 3 : 2 }
  } else if (n.type === 'image') {
    if (!httpsSaja(n.attrs?.src)) return null
    o.attrs = { src: n.attrs.src, alt: String(n.attrs?.alt ?? '').slice(0, 300) }
    return o
  } else if (n.type === 'inlineMath' || n.type === 'blockMath') {
    const latex = String(n.attrs?.latex ?? '').slice(0, BATAS_LATEX)
    if (!latex.trim()) return null
    o.attrs = { latex }
    return o
  } else if (n.type === 'orderedList') {
    const mulai = Number(n.attrs?.start)
    o.attrs = { start: Number.isInteger(mulai) && mulai > 0 && mulai < 10000 ? mulai : 1 }
  } else if (n.type === 'tableCell' || n.type === 'tableHeader') {
    const cs = Number(n.attrs?.colspan)
    const rs = Number(n.attrs?.rowspan)
    o.attrs = {
      colspan: Number.isInteger(cs) && cs >= 1 && cs <= 20 ? cs : 1,
      rowspan: Number.isInteger(rs) && rs >= 1 && rs <= 100 ? rs : 1,
    }
  }
  if (n.type === 'horizontalRule' || n.type === 'hardBreak') return o

  if (Array.isArray(n.content)) {
    const isi = n.content.map((c) => bersihkanSimpul(c, dalam + 1)).filter(Boolean)
    if (isi.length) o.content = isi
  }
  return o
}

// Mengembalikan dokumen yang sudah bersih, atau null bila bukan dokumen.
export function bersihkan(doc) {
  if (!doc || typeof doc !== 'object' || doc.type !== 'doc') return null
  const hasil = bersihkanSimpul(doc, 0)
  return hasil ?? { type: 'doc', content: [{ type: 'paragraph' }] }
}

// Teks polos dari dokumen. Disimpan di kolom body_text sebagai cadangan
// dan agar aturan "blok teks tidak boleh kosong" tetap berlaku.
export function teksPolos(doc) {
  const potong = []
  const jalan = (n) => {
    if (!n) return
    if (n.type === 'text') potong.push(n.text)
    else if (n.type === 'image') potong.push(`[gambar${n.attrs?.alt ? ': ' + n.attrs.alt : ''}]`)
    else if (n.type === 'inlineMath' || n.type === 'blockMath') potong.push(`[rumus: ${n.attrs?.latex ?? ''}]`)
    else if (n.type === 'hardBreak') potong.push('\n')
    if (Array.isArray(n.content)) {
      n.content.forEach(jalan)
      if (['paragraph', 'heading', 'listItem', 'tableRow', 'blockquote'].includes(n.type)) potong.push('\n')
    }
  }
  jalan(doc)
  return potong.join('').replace(/\n{3,}/g, '\n\n').trim()
}

// Mengubah teks polos lama (dengan baris baru) menjadi dokumen.
export function dariTeksPolos(teks) {
  const paragraf = String(teks ?? '')
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n+$/g, ''))
    .filter((p) => p.trim() !== '')
  if (!paragraf.length) return { type: 'doc', content: [{ type: 'paragraph' }] }
  return {
    type: 'doc',
    content: paragraf.map((p) => {
      const baris = p.split('\n')
      const isi = []
      baris.forEach((b, i) => {
        if (i > 0) isi.push({ type: 'hardBreak' })
        if (b) isi.push({ type: 'text', text: b })
      })
      return { type: 'paragraph', content: isi }
    }),
  }
}