import { useEffect, useRef, useState } from 'react'
import Ikon from './Ikon.jsx'

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
export function TombolKonfirmasi({ label, tanya = 'Yakin?', onYakin, disabled, kelas = 'bahaya' }) {
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
        {nilai ? <Tag>{nilai}</Tag> : null}
        <button
          type="button"
          className={nilai ? 'btn kecil ikon' : 'btn kecil'}
          aria-label={`Ubah ${label}`}
          title={`Ubah ${label}`}
          onClick={() => {
            setIsi(nilai ?? '')
            setUbah(true)
          }}
        >
          {nilai ? <span aria-hidden="true">✎</span> : `+ Tambah ${label}`}
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

export function TombolSalin({ teks, label = 'Salin', ikon = false }) {
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
    <button
      type="button"
      className={`btn kecil ${ikon ? 'ikon' : ''}`}
      onClick={salin}
      aria-label={status || label}
      title={status || label}
    >
      {ikon && !status ? <Ikon nama="salin" /> : status || label}
    </button>
  )
}

// Menu "⋯": mengumpulkan aksi sekunder agar tidak menumpuk di layar.
// Item bisa punya `konfirmasi` (tanya dulu) dan `bahaya` (merah).
export function MenuTitik({ label = 'Aksi lainnya', item, disabled, ikon = '⋯', tombol }) {
  const [buka, setBuka] = useState(false)
  const [pos, setPos] = useState(null)
  const [tanya, setTanya] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    if (!buka) return undefined
    const luar = (e) => ref.current && !ref.current.contains(e.target) && tutup()
    const esc = (e) => e.key === 'Escape' && tutup()
    document.addEventListener('mousedown', luar)
    document.addEventListener('touchstart', luar)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', luar)
      document.removeEventListener('touchstart', luar)
      document.removeEventListener('keydown', esc)
    }
  }, [buka])

  function tutup() {
    setBuka(false)
    setTanya(null)
  }
  // Menu memakai posisi tetap agar tidak terpotong oleh sidebar yang bisa digulir.
  const bukaMenu = () => {
    const r = ref.current.getBoundingClientRect()
    const lebar = Math.min(260, window.innerWidth - 16)
    const kiri = Math.max(8, Math.min(r.left, window.innerWidth - lebar - 8))
    const bawah = window.innerHeight - r.bottom
    setPos(
      bawah < 260 && r.top > bawah
        ? { left: kiri, bottom: window.innerHeight - r.top + 6, width: lebar }
        : { left: kiri, top: r.bottom + 6, width: lebar },
    )
    setBuka(true)
  }
  useEffect(() => {
    if (!buka) return undefined
    // Gulir sesaat setelah dibuka (misalnya karena fokus) diabaikan.
    const mulai = Date.now()
    const t = (e) => {
      if (e.type === 'scroll' && (Date.now() - mulai < 300 || e.target?.closest?.('.menu-titik-isi'))) return
      tutup()
    }
    window.addEventListener('resize', t)
    window.addEventListener('scroll', t, true)
    return () => {
      window.removeEventListener('resize', t)
      window.removeEventListener('scroll', t, true)
    }
  }, [buka])
  const pilih = (it) => {
    if (it.konfirmasi && tanya !== it) return setTanya(it)
    tutup()
    it.onPilih()
  }

  return (
    <span className="menu-titik" ref={ref}>
      <button
        type="button"
        className={tombol ? 'btn kecil' : 'btn kecil ikon'}
        aria-haspopup="menu"
        aria-expanded={buka}
        aria-label={label}
        title={label}
        disabled={disabled}
        onClick={() => (buka ? tutup() : bukaMenu())}
      >
        {tombol ? (
          <>
            {tombol} <span aria-hidden="true">▾</span>
          </>
        ) : (
          <span aria-hidden="true">{ikon}</span>
        )}
      </button>
      {buka && (
        <div className="menu-titik-isi" role="menu" style={pos}>
          {tanya ? (
            <div className="menu-tanya">
              <p>{tanya.konfirmasi}</p>
              <div className="baris rapat">
                <button type="button" className="btn kecil bahaya" onClick={() => pilih({ ...tanya, konfirmasi: null })}>
                  Ya, lanjut
                </button>
                <button type="button" className="btn kecil" onClick={() => setTanya(null)}>
                  Batal
                </button>
              </div>
            </div>
          ) : (
            item
              .filter((it) => !it.sembunyi)
              .map((it) => (
                <button
                  key={it.label}
                  type="button"
                  role="menuitem"
                  className={`menu-titik-item ${it.bahaya ? 'bahaya' : ''}`}
                  disabled={it.nonaktif}
                  onClick={() => pilih(it)}
                >
                  {it.label}
                </button>
              ))
          )}
        </div>
      )}
    </span>
  )
}