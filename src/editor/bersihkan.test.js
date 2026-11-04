import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bersihkan, dariTeksPolos, teksPolos } from './bersihkan.js'

const doc = (...c) => ({ type: 'doc', content: c })
const p = (...c) => ({ type: 'paragraph', content: c })
const t = (text, marks) => ({ type: 'text', text, ...(marks ? { marks } : {}) })

test('dokumen yang sah tetap sama', () => {
  const d = doc(p(t('Halo ', [{ type: 'bold' }]), t('dunia')))
  assert.deepEqual(bersihkan(d), d)
})
test('simpul tidak dikenal dibuang', () => {
  const r = bersihkan(doc({ type: 'script', content: [t('x')] }, p(t('aman'))))
  assert.equal(r.content.length, 1)
  assert.equal(r.content[0].type, 'paragraph')
})
test('tautan bukan https dibuang tandanya, teks tetap', () => {
  const r = bersihkan(doc(p(t('klik', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]))))
  assert.equal(r.content[0].content[0].marks, undefined)
  assert.equal(r.content[0].content[0].text, 'klik')
})
test('tautan https dipertahankan', () => {
  const r = bersihkan(doc(p(t('a', [{ type: 'link', attrs: { href: 'https://contoh.id/x', onclick: 'x' } }]))))
  assert.deepEqual(r.content[0].content[0].marks, [{ type: 'link', attrs: { href: 'https://contoh.id/x' } }])
})
test('gambar hanya https', () => {
  const r = bersihkan(
    doc(
      { type: 'image', attrs: { src: 'http://a.id/x.png' } },
      { type: 'image', attrs: { src: 'https://a.id/x.png', alt: 'peta', onerror: 'x' } },
    ),
  )
  assert.equal(r.content.length, 1)
  assert.deepEqual(r.content[0].attrs, { src: 'https://a.id/x.png', alt: 'peta' })
})
test('warna hanya dari daftar', () => {
  const r = bersihkan(
    doc(p(t('a', [{ type: 'warna', attrs: { nama: 'merah' } }]), t('b', [{ type: 'warna', attrs: { nama: 'url(x)' } }]))),
  )
  assert.equal(r.content[0].content[0].marks[0].attrs.nama, 'merah')
  assert.equal(r.content[0].content[1].marks, undefined)
})
test('bukan dokumen menghasilkan null', () => {
  assert.equal(bersihkan(null), null)
  assert.equal(bersihkan({ type: 'paragraph' }), null)
  assert.equal(bersihkan('x'), null)
})
test('rumus kosong dibuang', () => {
  const r = bersihkan(doc(p({ type: 'inlineMath', attrs: { latex: '  ' } }, t('x'))))
  assert.equal(r.content[0].content.length, 1)
})
test('terlalu dalam dipotong', () => {
  let n = p(t('x'))
  for (let i = 0; i < 100; i++) n = { type: 'blockquote', content: [n] }
  const r = bersihkan(doc(n))
  let dalam = 0
  for (let c = r; c.content; c = c.content[0]) dalam++
  assert.ok(dalam <= 42)
})
test('teksPolos memuat teks, gambar, dan rumus', () => {
  const d = doc(p(t('Luas ='), { type: 'inlineMath', attrs: { latex: 'x^2' } }), {
    type: 'image',
    attrs: { src: 'https://a.id/x.png', alt: 'segitiga' },
  })
  assert.equal(teksPolos(d), 'Luas =[rumus: x^2]\n[gambar: segitiga]')
})
test('dariTeksPolos mempertahankan paragraf dan baris baru', () => {
  const d = dariTeksPolos('Satu\nDua\n\nTiga')
  assert.equal(d.content.length, 2)
  assert.deepEqual(
    d.content[0].content.map((x) => x.type),
    ['text', 'hardBreak', 'text'],
  )
  assert.equal(teksPolos(d), 'Satu\nDua\nTiga')
})

test('kotak: gaya tak dikenal menjadi info, judul dipotong, kotak bersarang dibuang', () => {
  const doc = {
    type: 'doc',
    content: [
      {
        type: 'kotak',
        attrs: { gaya: 'jahat', judul: 'x'.repeat(200) },
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'isi' }] },
          { type: 'kotak', attrs: { gaya: 'tips' }, content: [{ type: 'paragraph' }] },
        ],
      },
    ],
  }
  const h = bersihkan(doc).content[0]
  assert.equal(h.type, 'kotak')
  assert.equal(h.attrs.gaya, 'info')
  assert.equal(h.attrs.judul.length, 80)
  assert.deepEqual(
    h.content.map((n) => n.type),
    ['paragraph'],
  )
})

test('kotak kosong diberi satu paragraf', () => {
  const h = bersihkan({ type: 'doc', content: [{ type: 'kotak', attrs: { gaya: 'tips' } }] }).content[0]
  assert.deepEqual(h.content, [{ type: 'paragraph' }])
})

test('pita dan pembatas: atribut di luar daftar diganti bawaan', () => {
  const doc = {
    type: 'doc',
    content: [
      { type: 'pita', attrs: { warna: 'url(javascript:1)' }, content: [{ type: 'text', text: 'Deskripsi:' }] },
      { type: 'horizontalRule', attrs: { gaya: 'x', warna: 'y' } },
      { type: 'horizontalRule', attrs: { gaya: 'gradasi', warna: 'ungu' } },
    ],
  }
  const [p, h1, h2] = bersihkan(doc).content
  assert.equal(p.attrs.warna, 'hijau')
  assert.deepEqual(h1.attrs, { gaya: 'tipis', warna: 'abu' })
  assert.deepEqual(h2.attrs, { gaya: 'gradasi', warna: 'ungu' })
})

test('sorot: hanya warna dari daftar', () => {
  const t = (nama) => ({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a', marks: [{ type: 'sorot', attrs: { nama } }] }] }],
  })
  assert.equal(bersihkan(t('kuning')).content[0].content[0].marks[0].attrs.nama, 'kuning')
  assert.equal(bersihkan(t('merah-jambu')).content[0].content[0].marks, undefined)
})