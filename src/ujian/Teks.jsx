import { lazy, Suspense } from 'react'

const TeksKaya = lazy(() => import('../editor/TeksKaya.jsx'))

// Teks berformat (soal, pilihan, pembahasan). Dimuat saat dibutuhkan.
export default function Teks({ doc }) {
  return (
    <Suspense fallback={<span className="petunjuk">Memuat…</span>}>
      <TeksKaya doc={doc} />
    </Suspense>
  )
}