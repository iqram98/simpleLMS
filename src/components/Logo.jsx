import { useEffect, useState } from 'react'

// Logo bawaan: berkas /logo-192.png (public/). Ganti berkas itu untuk mengubah logo.
export default function Logo({ ukuran = 32, kelas = '' }) {
  return <img className={`logo ${kelas}`.trim()} src="/logo-192.png" width={ukuran} height={ukuran} alt="" draggable="false" />
}

// Logo situs: gambar buatan admin bila ada dan berhasil dimuat; jika tidak, logo bawaan.
export function LogoSitus({ url, ukuran = 32, kelas = '' }) {
  const [rusak, setRusak] = useState(false)
  useEffect(() => setRusak(false), [url])
  if (url && !rusak) {
    return (
      <img
        className={kelas}
        src={url}
        alt=""
        style={{ width: ukuran, height: ukuran, objectFit: 'contain', borderRadius: 8 }}
        onError={() => setRusak(true)}
      />
    )
  }
  return <Logo ukuran={ukuran} kelas={kelas} />
}