import { Mark, Node, nodeInputRule } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import { BlockMath, InlineMath } from '@tiptap/extension-mathematics'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import StarterKit from '@tiptap/starter-kit'
import 'katex/dist/katex.min.css'
import { KOTAK, PEMBATAS, SOROT, WARNA } from './bersihkan.js'

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

// Sorotan: warna latar teks dari daftar tetap (warna sebenarnya di CSS).
const Sorot = Mark.create({
  name: 'sorot',
  addAttributes: () => ({
    nama: {
      default: null,
      parseHTML: (el) => el.getAttribute('data-sorot'),
      renderHTML: (a) => (SOROT.includes(a.nama) ? { 'data-sorot': a.nama, class: `s-${a.nama}` } : {}),
    },
  }),
  parseHTML: () => [{ tag: 'mark[data-sorot]' }],
  renderHTML: ({ HTMLAttributes }) => ['mark', HTMLAttributes, 0],
})

// Kotak bergaya (Catatan Guru, Tips, dst). Judul bawaan mengikuti gaya; guru boleh menggantinya.
const Kotak = Node.create({
  name: 'kotak',
  group: 'block',
  content: '(paragraph | heading | bulletList | orderedList | blockquote | horizontalRule | table | blockMath | image | pita)+',
  defining: true,
  addAttributes: () => ({
    gaya: {
      default: 'info',
      parseHTML: (el) => el.getAttribute('data-kotak'),
      renderHTML: () => ({}),
    },
    judul: {
      default: '',
      parseHTML: (el) => el.getAttribute('data-judul-sendiri') ?? '',
      renderHTML: () => ({}),
    },
  }),
  parseHTML: () => [{ tag: 'div[data-kotak]' }],
  renderHTML({ node }) {
    const gaya = Object.hasOwn(KOTAK, node.attrs.gaya) ? node.attrs.gaya : 'info'
    const sendiri = String(node.attrs.judul ?? '').slice(0, 80)
    const attrs = { class: `kotak k-${gaya}`, 'data-kotak': gaya, 'data-judul': sendiri || KOTAK[gaya] }
    if (sendiri) attrs['data-judul-sendiri'] = sendiri
    return ['div', attrs, 0]
  },
  addCommands() {
    return {
      setKotak:
        (gaya) =>
        ({ commands, editor }) =>
          editor.isActive('kotak') ? commands.updateAttributes('kotak', { gaya }) : commands.wrapIn('kotak', { gaya }),
      aturJudulKotak:
        (judul) =>
        ({ commands }) =>
          commands.updateAttributes('kotak', { judul }),
      lepasKotak:
        () =>
        ({ commands }) =>
          commands.lift('kotak'),
    }
  },
})

// Pita judul: baris berlatar warna penuh, seperti "Deskripsi:" pada materi acuan.
const Pita = Node.create({
  name: 'pita',
  group: 'block',
  content: 'inline*',
  defining: true,
  addAttributes: () => ({
    warna: {
      default: 'hijau',
      parseHTML: (el) => el.getAttribute('data-pita'),
      renderHTML: () => ({}),
    },
  }),
  parseHTML: () => [{ tag: 'p[data-pita]' }],
  renderHTML({ node }) {
    const warna = WARNA.includes(node.attrs.warna) ? node.attrs.warna : 'hijau'
    return ['p', { class: `pita p-${warna}`, 'data-pita': warna }, 0]
  },
  addCommands() {
    return {
      setPita:
        (warna) =>
        ({ commands, editor }) =>
          editor.isActive('pita') ? commands.updateAttributes('pita', { warna }) : commands.setNode('pita', { warna }),
    }
  },
})

// Pembatas: pengganti garis pemisah bawaan, dengan gaya dan warna dari daftar tetap.
const Pembatas = Node.create({
  name: 'horizontalRule',
  group: 'block',
  addAttributes: () => ({
    gaya: { default: 'tipis', parseHTML: (el) => el.getAttribute('data-gaya'), renderHTML: () => ({}) },
    warna: { default: 'abu', parseHTML: (el) => el.getAttribute('data-warna'), renderHTML: () => ({}) },
  }),
  parseHTML: () => [{ tag: 'hr' }],
  renderHTML({ node }) {
    const gaya = PEMBATAS.includes(node.attrs.gaya) ? node.attrs.gaya : 'tipis'
    const warna = WARNA.includes(node.attrs.warna) ? node.attrs.warna : 'abu'
    return ['hr', { class: `pb pb-${gaya} pw-${warna}`, 'data-gaya': gaya, 'data-warna': warna }]
  },
  addCommands() {
    return {
      setHorizontalRule:
        (attrs) =>
        ({ chain }) =>
          chain().insertContent({ type: this.name, attrs }).run(),
      aturPembatas:
        (attrs) =>
        ({ commands }) =>
          commands.updateAttributes('horizontalRule', attrs),
    }
  },
  addInputRules() {
    return [nodeInputRule({ find: /^(?:---|___\s|\*\*\*\s)$/, type: this.type })]
  },
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
      horizontalRule: false,
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
    Sorot,
    Kotak,
    Pita,
    Pembatas,
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    GambarAman.configure({ inline: false, allowBase64: false }),
    InlineMath.configure({ katexOptions, onClick: klik ? (n, pos) => klik('inline', n, pos) : undefined }),
    BlockMath.configure({ katexOptions, onClick: klik ? (n, pos) => klik('block', n, pos) : undefined }),
  ]
}