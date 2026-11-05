import { useId } from 'react'
import { bintangPenuh } from './aturan.js'

const Satu = ({ penuh }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className={penuh ? 'bintang penuh' : 'bintang'}>
    <path d="M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3L2.8 9.5l6.4-.9z" />
  </svg>
)

// Tampilan bintang saja (bukan input).
export function Bintang({ nilai, label }) {
  const n = bintangPenuh(nilai)
  return (
    <span className="bintang-baris" role="img" aria-label={label ?? `${n} dari 5 bintang`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Satu key={i} penuh={i <= n} />
      ))}
    </span>
  )
}

// Pilihan bintang 1-5 yang bisa dipakai dengan keyboard (radio group).
export function PilihBintang({ nilai, onUbah, disabled }) {
  const nama = useId()
  return (
    <fieldset className="pilih-bintang" disabled={disabled}>
      <legend className="label-kecil">Penilaianmu</legend>
      <div className="bintang-baris">
        {[1, 2, 3, 4, 5].map((i) => (
          <label key={i} className={`bintang-pilihan ${i <= nilai ? 'aktif' : ''}`}>
            <input type="radio" name={nama} value={i} checked={nilai === i} onChange={() => onUbah(i)} />
            <Satu penuh={i <= nilai} />
            <span className="sr-only">{i} bintang</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}