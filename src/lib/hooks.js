import { useCallback, useEffect, useRef, useState } from 'react'
import { pesanError } from './supabase.js'

// Memuat data async. Data lama tetap tampil saat memuat ulang, jadi layar
// tidak berkedip setiap kali guru menambah atau mengubah sesuatu.
export function useMuat(fungsi, deps) {
  const [state, setState] = useState({ data: null, error: null, memuat: true })
  const [putaran, setPutaran] = useState(0)
  const terbaru = useRef(fungsi)
  terbaru.current = fungsi

  useEffect(() => {
    let batal = false
    setState((s) => ({ ...s, memuat: true, error: null }))
    Promise.resolve()
      .then(() => terbaru.current())
      .then((data) => {
        if (!batal) setState({ data, error: null, memuat: false })
      })
      .catch((error) => {
        if (!batal) setState({ data: null, error, memuat: false })
      })
    return () => {
      batal = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, putaran])

  const muatUlang = useCallback(() => setPutaran((n) => n + 1), [])
  return { ...state, muatUlang }
}

// Menjalankan aksi (simpan, hapus, dll.) dengan status sibuk dan pesan galat.
export function useAksi() {
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')

  const jalankan = useCallback(async (fungsi) => {
    setSibuk(true)
    setGalat('')
    try {
      return await fungsi()
    } catch (e) {
      setGalat(pesanError(e))
      return undefined
    } finally {
      setSibuk(false)
    }
  }, [])

  return { sibuk, galat, setGalat, jalankan }
}

// Posisi berikutnya untuk item baru di akhir daftar.
export function posisiBerikut(daftar) {
  return daftar.reduce((maks, x) => Math.max(maks, x.position ?? 0), 0) + 1
}

// Menggeser item satu langkah. Mengembalikan pasangan {id, position} yang perlu
// disimpan, dihitung dari indeks sehingga tetap benar walau posisi sebelumnya sama.
export function susunUlang(daftar, indeks, arah) {
  const tujuan = indeks + arah
  if (tujuan < 0 || tujuan >= daftar.length) return []
  const baru = daftar.slice()
  ;[baru[indeks], baru[tujuan]] = [baru[tujuan], baru[indeks]]
  return baru
    .map((x, i) => ({ id: x.id, position: i + 1, lama: x.position }))
    .filter((x) => x.position !== x.lama)
    .map(({ id, position }) => ({ id, position }))
}
