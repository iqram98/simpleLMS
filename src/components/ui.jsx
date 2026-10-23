import { useState } from 'react'

export function Memuat({ teks = 'Memuat…' }) {
  return (
    <p className="memuat" role="status">
      {teks}
    </p>
  )
}

export function KotakGalat({ galat, onTutup }) {
  if (!galat) return null
  return (
    <p className="galat" role="alert">
      {galat}
      {onTutup && (
        <button type="button" className="btn kecil" onClick={onTutup}>
          Tutup
        </button>
      )}
    </p>
  )
}

export function Kosong({ children }) {
  return <p className="kosong">{children}</p>
}

const LABEL_STATUS = {
  menunggu: 'Menunggu persetujuan',
  aktif: 'Aktif',
  ditolak: 'Ditolak',
  dikeluarkan: 'Dikeluarkan',
}

export function LencanaStatus({ status }) {
  return <span className={`lencana status-${status}`}>{LABEL_STATUS[status] ?? status}</span>
}

// Tombol dua langkah untuk tindakan yang tidak bisa dibatalkan.
// Dialog bawaan browser tidak dipakai agar bekerja baik di ponsel.
export function TombolKonfirmasi({ label, tanya = 'Yakin?', onYakin, disabled, kelas = '' }) {
  const [tanyaAktif, setTanyaAktif] = useState(false)
  if (!tanyaAktif) {
    return (
      <button type="button" className={`btn kecil ${kelas}`} disabled={disabled} onClick={() => setTanyaAktif(true)}>
        {label}
      </button>
    )
  }
  return (
    <span className="baris rapat">
      <span className="kecil-teks">{tanya}</span>
      <button
        type="button"
        className="btn kecil bahaya"
        onClick={() => {
          setTanyaAktif(false)
          onYakin()
        }}
      >
        Ya, lanjut
      </button>
      <button type="button" className="btn kecil" onClick={() => setTanyaAktif(false)}>
        Batal
      </button>
    </span>
  )
}

// Teks yang bisa diubah di tempat.
export function UbahDiTempat({ nilai, onSimpan, label, tag: Tag = 'span', multibaris = false }) {
  const [ubah, setUbah] = useState(false)
  const [isi, setIsi] = useState(nilai ?? '')

  if (!ubah) {
    return (
      <span className="ubah-tempat">
        <Tag>{nilai || <em className="redup">(kosong)</em>}</Tag>
        <button
          type="button"
          className="btn kecil"
          aria-label={`Ubah ${label}`}
          onClick={() => {
            setIsi(nilai ?? '')
            setUbah(true)
          }}
        >
          Ubah
        </button>
      </span>
    )
  }
  const simpan = async (e) => {
    e.preventDefault()
    const bersih = isi.trim()
    if (!bersih && label !== 'deskripsi') return
    await onSimpan(bersih)
    setUbah(false)
  }
  return (
    <form className="baris ubah-form" onSubmit={simpan}>
      {multibaris ? (
        <textarea aria-label={label} value={isi} onChange={(e) => setIsi(e.target.value)} autoFocus />
      ) : (
        <input aria-label={label} value={isi} onChange={(e) => setIsi(e.target.value)} autoFocus />
      )}
      <button type="submit" className="btn kecil utama">
        Simpan
      </button>
      <button type="button" className="btn kecil" onClick={() => setUbah(false)}>
        Batal
      </button>
    </form>
  )
}

export function TombolSalin({ teks, label = 'Salin' }) {
  const [status, setStatus] = useState('')
  const salin = async () => {
    try {
      await navigator.clipboard.writeText(teks)
      setStatus('Tersalin')
    } catch {
      setStatus('Salin manual')
    }
    setTimeout(() => setStatus(''), 2000)
  }
  return (
    <button type="button" className="btn kecil" onClick={salin}>
      {status || label}
    </button>
  )
}
