import { useState } from 'react'

// Formulir kecil untuk melaporkan kiriman.
export default function FormLapor({ sibuk, onKirim, onBatal }) {
  const [alasan, setAlasan] = useState('')
  return (
    <form
      className="panel kecil-panel"
      onSubmit={(e) => {
        e.preventDefault()
        onKirim(alasan.trim())
      }}
    >
      <label>
        Alasan melapor (boleh kosong)
        <input value={alasan} maxLength={300} onChange={(e) => setAlasan(e.target.value)} autoFocus />
      </label>
      <div className="baris">
        <button type="submit" className="btn kecil bahaya" disabled={sibuk}>
          Kirim laporan
        </button>
        <button type="button" className="btn kecil" onClick={onBatal} disabled={sibuk}>
          Batal
        </button>
      </div>
    </form>
  )
}