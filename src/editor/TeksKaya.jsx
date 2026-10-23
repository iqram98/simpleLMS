import { EditorContent, useEditor } from '@tiptap/react'
import { useMemo } from 'react'
import { bersihkan } from './bersihkan.js'
import { buatEkstensi } from './ekstensi.js'

// Tampilan baca untuk teks berformat (siswa dan pratinjau guru).
// Isi dibersihkan lebih dulu, lalu dirender dari skema editor, bukan sebagai HTML mentah.
export default function TeksKaya({ doc }) {
  const bersih = useMemo(() => bersihkan(doc), [doc])
  const ekstensi = useMemo(() => buatEkstensi(), [])
  const editor = useEditor({ extensions: ekstensi, content: bersih, editable: false }, [bersih])
  return <EditorContent editor={editor} className="rich" />
}