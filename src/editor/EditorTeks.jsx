import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import katex from 'katex'
import { useMemo, useState } from 'react'
import { bersihkan, WARNA } from './bersihkan.js'
import { buatEkstensi } from './ekstensi.js'

const CONTOH_RUMUS = [
  ['Pecahan', '\\frac{a}{b}'],
  ['Akar', '\\sqrt{x}'],
  ['Pangkat', 'x^{2}'],
  ['Indeks', 'x_{1}'],
  ['≤', '\\leq '],
  ['≥', '\\geq '],
  ['≠', '\\neq '],
  ['×', '\\times '],
  ['÷', '\\div '],
  ['π', '\\pi '],
  ['°', '^{\\circ}'],
  ['±', '\\pm '],
]
const NAMA_WARNA = { merah: 'Merah', biru: 'Biru', hijau: 'Hijau', oranye: 'Oranye', ungu: 'Ungu', abu: 'Abu-abu' }

function Tombol({ aktif, label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      className={`alat-tombol ${aktif ? 'aktif' : ''}`}
      aria-label={label}
      title={label}
      aria-pressed={aktif === undefined ? undefined : Boolean(aktif)}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function PratinjauRumus({ latex, blok }) {
  const html = useMemo(() => {
    if (!latex.trim()) return ''
    try {
      return katex.renderToString(latex, { throwOnError: false, displayMode: blok, strict: 'ignore', maxSize: 20, maxExpand: 200 })
    } catch {
      return ''
    }
  }, [latex, blok])
  if (!html) return <p className="petunjuk">Pratinjau rumus muncul di sini.</p>
  // KaTeX menghasilkan markup yang aman dari teks yang kita beri; throwOnError false mencegah galat mentah.
  return <div className="rumus-pratinjau" dangerouslySetInnerHTML={{ __html: html }} />
}

export default function EditorTeks({ nilai, onChange, label = 'Isi teks' }) {
  const [panel, setPanel] = useState(null) // {jenis:'rumus'|'tautan'|'gambar', ...}
  const [galat, setGalat] = useState('')

  const ekstensi = useMemo(
    () =>
      buatEkstensi({
        klik: (jenis, node, pos) => setPanel({ jenis: 'rumus', blok: jenis === 'block', latex: node.attrs.latex, pos }),
      }),
    [],
  )
  const editor = useEditor({
    extensions: ekstensi,
    content: bersihkan(nilai),
    editorProps: { attributes: { class: 'rich rich-sunting', role: 'textbox', 'aria-multiline': 'true', 'aria-label': label } },
    onUpdate: ({ editor: e }) => onChange(e.getJSON()),
  })

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e && {
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        underline: e.isActive('underline'),
        strike: e.isActive('strike'),
        kecil: e.isActive('kecil'),
        bullet: e.isActive('bulletList'),
        urut: e.isActive('orderedList'),
        kutip: e.isActive('blockquote'),
        link: e.isActive('link'),
        tabel: e.isActive('table'),
        gaya: e.isActive('heading', { level: 2 }) ? 'h2' : e.isActive('heading', { level: 3 }) ? 'h3' : 'p',
        warna: WARNA.find((w) => e.isActive('warna', { nama: w })) ?? '',
        undo: e.can().undo(),
        redo: e.can().redo(),
      },
  })
  if (!editor || !s) return null
  const c = () => editor.chain().focus()

  const ubahGaya = (v) => {
    if (v === 'p') c().setParagraph().run()
    else c().setHeading({ level: v === 'h2' ? 2 : 3 }).run()
  }
  const ubahWarna = (v) => {
    if (!v) c().unsetMark('warna').run()
    else c().setMark('warna', { nama: v }).run()
  }

  const bukaTautan = () => setPanel({ jenis: 'tautan', url: editor.getAttributes('link').href ?? '' })
  const simpanPanel = () => {
    setGalat('')
    if (panel.jenis === 'tautan') {
      const u = panel.url.trim()
      if (!u) {
        c().extendMarkRange('link').unsetLink().run()
      } else if (!/^https:\/\/[^\s]+$/i.test(u)) {
        return setGalat('Link harus diawali https://')
      } else {
        c().extendMarkRange('link').setLink({ href: u }).run()
      }
    } else if (panel.jenis === 'gambar') {
      const u = panel.url.trim()
      if (!/^https:\/\/[^\s"'<>]+$/i.test(u)) return setGalat('Tempel link gambar yang diawali https://')
      c().setImage({ src: u, alt: panel.alt.trim() }).run()
    } else if (panel.jenis === 'rumus') {
      const latex = panel.latex.trim()
      if (!latex) return setGalat('Tulis rumusnya dulu.')
      if (panel.pos != null) {
        if (panel.blok) editor.chain().focus().updateBlockMath({ latex, pos: panel.pos }).run()
        else editor.chain().focus().updateInlineMath({ latex, pos: panel.pos }).run()
      } else if (panel.blok) c().insertBlockMath({ latex }).run()
      else c().insertInlineMath({ latex }).run()
    }
    setPanel(null)
  }
  const hapusRumus = () => {
    if (panel.blok) editor.chain().focus().deleteBlockMath({ pos: panel.pos }).run()
    else editor.chain().focus().deleteInlineMath({ pos: panel.pos }).run()
    setPanel(null)
  }

  return (
    <div className="editor-teks">
      <div className="alat-editor" role="toolbar" aria-label="Format teks">
        <select aria-label="Gaya paragraf" value={s.gaya} onChange={(e) => ubahGaya(e.target.value)}>
          <option value="p">Teks normal</option>
          <option value="h2">Judul besar</option>
          <option value="h3">Judul kecil</option>
        </select>
        <Tombol label="Tebal" aktif={s.bold} onClick={() => c().toggleBold().run()}>
          <b>B</b>
        </Tombol>
        <Tombol label="Miring" aktif={s.italic} onClick={() => c().toggleItalic().run()}>
          <i>I</i>
        </Tombol>
        <Tombol label="Garis bawah" aktif={s.underline} onClick={() => c().toggleUnderline().run()}>
          <u>U</u>
        </Tombol>
        <Tombol label="Coret" aktif={s.strike} onClick={() => c().toggleStrike().run()}>
          <s>S</s>
        </Tombol>
        <Tombol label="Huruf kecil" aktif={s.kecil} onClick={() => c().toggleMark('kecil').run()}>
          <small>Aa</small>
        </Tombol>
        <select aria-label="Warna teks" value={s.warna} onChange={(e) => ubahWarna(e.target.value)}>
          <option value="">Warna biasa</option>
          {WARNA.map((w) => (
            <option key={w} value={w}>
              {NAMA_WARNA[w]}
            </option>
          ))}
        </select>
        <span className="alat-pemisah" aria-hidden="true" />
        <Tombol label="Daftar poin" aktif={s.bullet} onClick={() => c().toggleBulletList().run()}>
          • ―
        </Tombol>
        <Tombol label="Daftar bernomor" aktif={s.urut} onClick={() => c().toggleOrderedList().run()}>
          1.
        </Tombol>
        <Tombol label="Kutipan" aktif={s.kutip} onClick={() => c().toggleBlockquote().run()}>
          ❝
        </Tombol>
        <Tombol label="Garis pemisah" onClick={() => c().setHorizontalRule().run()}>
          ―
        </Tombol>
        <span className="alat-pemisah" aria-hidden="true" />
        <Tombol label="Tautan" aktif={s.link} onClick={bukaTautan}>
          🔗
        </Tombol>
        <Tombol label="Gambar dari link" onClick={() => setPanel({ jenis: 'gambar', url: '', alt: '' })}>
          🖼
        </Tombol>
        <Tombol label="Rumus" onClick={() => setPanel({ jenis: 'rumus', blok: false, latex: '', pos: null })}>
          ∑
        </Tombol>
        <Tombol label="Sisipkan tabel" onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          ▦
        </Tombol>
        <span className="alat-pemisah" aria-hidden="true" />
        <Tombol label="Urungkan" disabled={!s.undo} onClick={() => c().undo().run()}>
          ↶
        </Tombol>
        <Tombol label="Ulangi" disabled={!s.redo} onClick={() => c().redo().run()}>
          ↷
        </Tombol>
      </div>

      {s.tabel && (
        <div className="alat-editor alat-tabel" role="toolbar" aria-label="Atur tabel">
          <button type="button" className="btn kecil" onClick={() => c().addRowAfter().run()}>
            + Baris
          </button>
          <button type="button" className="btn kecil" onClick={() => c().addColumnAfter().run()}>
            + Kolom
          </button>
          <button type="button" className="btn kecil" onClick={() => c().deleteRow().run()}>
            Hapus baris
          </button>
          <button type="button" className="btn kecil" onClick={() => c().deleteColumn().run()}>
            Hapus kolom
          </button>
          <button type="button" className="btn kecil bahaya" onClick={() => c().deleteTable().run()}>
            Hapus tabel
          </button>
        </div>
      )}

      {panel && (
        <div className="panel-editor" role="group" aria-label={`Atur ${panel.jenis}`}>
          {panel.jenis === 'tautan' && (
            <div className="kolom">
              <label htmlFor="ed-url">Link (kosongkan untuk melepas tautan)</label>
              <input id="ed-url" type="url" value={panel.url} placeholder="https://" onChange={(e) => setPanel({ ...panel, url: e.target.value })} autoFocus />
            </div>
          )}
          {panel.jenis === 'gambar' && (
            <>
              <div className="kolom">
                <label htmlFor="ed-gambar">Link gambar</label>
                <input id="ed-gambar" type="url" value={panel.url} placeholder="https://" onChange={(e) => setPanel({ ...panel, url: e.target.value })} autoFocus />
              </div>
              <div className="kolom">
                <label htmlFor="ed-alt">Deskripsi gambar (untuk pembaca layar)</label>
                <input id="ed-alt" value={panel.alt} onChange={(e) => setPanel({ ...panel, alt: e.target.value })} />
              </div>
              <p className="petunjuk">Gambar dari Google Drive perlu dibagikan "Siapa saja yang memiliki link". Bila tidak tampil, pakai alamat gambar langsung dari situs penyimpan gambar.</p>
            </>
          )}
          {panel.jenis === 'rumus' && (
            <>
              <div className="baris">
                <label className="baris rapat">
                  <input type="radio" name="jenis-rumus" checked={!panel.blok} onChange={() => setPanel({ ...panel, blok: false })} />
                  Di dalam kalimat
                </label>
                <label className="baris rapat">
                  <input type="radio" name="jenis-rumus" checked={panel.blok} onChange={() => setPanel({ ...panel, blok: true })} />
                  Baris sendiri
                </label>
              </div>
              <div className="baris rapat" aria-label="Sisipan cepat">
                {CONTOH_RUMUS.map(([nama, kode]) => (
                  <button key={nama} type="button" className="btn kecil" onClick={() => setPanel({ ...panel, latex: panel.latex + kode })}>
                    {nama}
                  </button>
                ))}
              </div>
              <div className="kolom">
                <label htmlFor="ed-rumus">Rumus (kode LaTeX)</label>
                <textarea id="ed-rumus" value={panel.latex} spellCheck={false} onChange={(e) => setPanel({ ...panel, latex: e.target.value })} autoFocus />
              </div>
              <PratinjauRumus latex={panel.latex} blok={panel.blok} />
            </>
          )}
          {galat && <p className="galat" role="alert">{galat}</p>}
          <div className="baris">
            <button type="button" className="btn kecil utama" onClick={simpanPanel}>
              {panel.pos != null ? 'Simpan rumus' : 'Sisipkan'}
            </button>
            <button type="button" className="btn kecil" onClick={() => { setPanel(null); setGalat('') }}>
              Batal
            </button>
            {panel.jenis === 'rumus' && panel.pos != null && (
              <button type="button" className="btn kecil bahaya" onClick={hapusRumus}>
                Hapus rumus
              </button>
            )}
          </div>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  )
}