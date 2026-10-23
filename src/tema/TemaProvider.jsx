import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { variabelTema, warnaValid } from './warna.js'

const BAWAAN = { nama_situs: 'Kelas Online', warna_utama: '#2563eb', mode_bawaan: 'sistem', logo_url: null }
const KUNCI_CACHE = 'situs-cache'
const KUNCI_MODE = 'mode-tampilan'

const baca = (k) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const tulis = (k, v) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* penyimpanan tidak tersedia */
  }
}
function cacheAwal() {
  try {
    const c = JSON.parse(baca(KUNCI_CACHE) ?? 'null')
    if (c && warnaValid(c.warna_utama)) return { ...BAWAAN, ...c }
  } catch {
    /* abaikan */
  }
  return BAWAAN
}

const Konteks = createContext(null)
export const useTema = () => useContext(Konteks)

const sistemGelap = () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches

export function TemaProvider({ children }) {
  const [situs, setSitus] = useState(cacheAwal)
  const [pilihan, setPilihan] = useState(() => {
    const m = baca(KUNCI_MODE)
    return m === 'terang' || m === 'gelap' ? m : null // null: ikut bawaan admin
  })
  const [gelapSistem, setGelapSistem] = useState(sistemGelap)

  const muat = useCallback(async () => {
    const { data } = await supabase
      .from('pengaturan_situs')
      .select('nama_situs,warna_utama,mode_bawaan,logo_url')
      .maybeSingle()
    if (data && warnaValid(data.warna_utama)) {
      setSitus(data)
      tulis(KUNCI_CACHE, JSON.stringify(data))
    }
  }, [])

  useEffect(() => {
    muat()
  }, [muat])

  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const ubah = () => setGelapSistem(mq.matches)
    mq.addEventListener('change', ubah)
    return () => mq.removeEventListener('change', ubah)
  }, [])

  const mode = pilihan ?? situs.mode_bawaan
  const gelap = mode === 'gelap' || (mode === 'sistem' && gelapSistem)

  useEffect(() => {
    const r = document.documentElement
    r.dataset.tema = gelap ? 'gelap' : 'terang'
    for (const [k, v] of Object.entries(variabelTema(situs.warna_utama, gelap))) r.style.setProperty(k, v)
    document.title = situs.nama_situs
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.content = gelap ? '#12151c' : '#ffffff'
  }, [situs, gelap])

  const ganti = useCallback(() => {
    const berikut = gelap ? 'terang' : 'gelap'
    setPilihan(berikut)
    tulis(KUNCI_MODE, berikut)
  }, [gelap])

  const nilai = useMemo(() => ({ situs, gelap, ganti, muat }), [situs, gelap, ganti, muat])
  return <Konteks.Provider value={nilai}>{children}</Konteks.Provider>
}