import { useState } from 'react'
import { MAKS_ISI, MAKS_JUDUL } from './tampil.js'

// Formulir topik (baru atau ubah). `pelajaran` = daftar pelajaran yang boleh dipakai sebagai tag.
export default function FormTopik({ awal, pelajaran, sibuk, onSimpan, onBatal, labelSimpan = 'Kirim topik' }) {
  const [judul, setJudul] = useState(awal?.judul ?? '')
  const [isi, setIsi] = useState(awal?.isi ?? '')
  const [lesson, setLesson] = useState(awal?.lesson_id ?? '')
  const sah = judul.trim().length > 0 && judul.length <= MAKS_JUDUL && isi.length <= MAKS_ISI
  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault()
        if (sah) onSimpan({ judul: judul.trim(), isi: isi.trim(), lesson_id: lesson || null })
      }}
    >
      <label>
        Judul
        <input value={judul} maxLength={MAKS_JUDUL} onChange={(e) => setJudul(e.target.value)} autoFocus />
      </label>
      <label>
        Pertanyaan atau isi
        <textarea rows={5} value={isi} maxLength={MAKS_ISI} onChange={(e) => setIsi(e.target.value)} />
        <span className="petunjuk">
          {isi.length} / {MAKS_ISI} karakter
        </span>
      </label>
      {pelajaran.length > 0 && (
        <label>
          Terkait pelajaran (boleh kosong)
          <select value={lesson} onChange={(e) => setLesson(e.target.value)}>
            <option value="">Tidak terkait pelajaran tertentu</option>
            {pelajaran.map((l) => (
              <option key={l.id} value={l.id}>
                {l.modul}: {l.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="baris">
        <button type="submit" className="btn utama" disabled={!sah || sibuk}>
          {labelSimpan}
        </button>
        <button type="button" className="btn" onClick={onBatal} disabled={sibuk}>
          Batal
        </button>
      </div>
    </form>
  )
}