import { Mark } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import { BlockMath, InlineMath } from '@tiptap/extension-mathematics'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import StarterKit from '@tiptap/starter-kit'
import 'katex/dist/katex.min.css'
import { WARNA } from './bersihkan.js'

// Teks kecil: ukuran huruf berupa pilihan tetap, bukan angka bebas.
const Kecil = Mark.create({
  name: 'kecil',
  parseHTML: () => [{ tag: 'small' }],
  renderHTML: () => ['small', 0],
})

// Warna teks dari daftar tetap. Warna sebenarnya diatur di CSS agar
// tetap terbaca di mode terang maupun gelap.
const Warna = Mark.create({
  name: 'warna',
  addAttributes: () => ({
    nama: {
      default: null,
      parseHTML: (el) => el.getAttribute('data-warna'),
      renderHTML: (a) => (WARNA.includes(a.nama) ? { 'data-warna': a.nama, class: `w-${a.nama}` } : {}),
    },
  }),
  parseHTML: () => [{ tag: 'span[data-warna]' }],
  renderHTML: ({ HTMLAttributes }) => ['span', HTMLAttributes, 0],
})

const GambarAman = Image.extend({
  renderHTML({ HTMLAttributes }) {
    const { src, alt } = HTMLAttributes
    if (!/^https:\/\//i.test(String(src ?? ''))) return ['span', {}, '[gambar tidak valid]']
    return ['img', { src, alt: alt ?? '', loading: 'lazy', referrerpolicy: 'no-referrer' }]
  },
})

const katexOptions = { throwOnError: false, strict: 'ignore', maxSize: 20, maxExpand: 200 }

export function buatEkstensi({ klik } = {}) {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      code: false,
      codeBlock: false,
      link: {
        openOnClick: false,
        autolink: false,
        protocols: [],
        isAllowedUri: (url) => /^https:\/\//i.test(String(url)),
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer nofollow' },
      },
    }),
    Kecil,
    Warna,
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    GambarAman.configure({ inline: false, allowBase64: false }),
    InlineMath.configure({ katexOptions, onClick: klik ? (n, pos) => klik('inline', n, pos) : undefined }),
    BlockMath.configure({ katexOptions, onClick: klik ? (n, pos) => klik('block', n, pos) : undefined }),
  ]
}