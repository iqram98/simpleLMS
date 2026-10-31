import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export const NAMA_PELANGGARAN = {
  pindah_tab: 'Pindah tab atau aplikasi',
  keluar_layar_penuh: 'Keluar dari layar penuh',
  kehilangan_fokus: 'Jendela kehilangan fokus',
}

export const layarPenuhDidukung = () => typeof document !== 'undefined' && Boolean(document.documentElement.requestFullscreen)
export const sedangLayarPenuh = () => typeof document !== 'undefined' && Boolean(document.fullscreenElement)

// Harus dipanggil langsung dari klik pengguna, kalau tidak peramban menolak.
export function masukLayarPenuh() {
  try {
    return Promise.resolve(document.documentElement.requestFullscreen?.()).catch(() => {})
  } catch {
    return Promise.resolve()
  }
}
export function keluarLayarPenuh() {
  try {
    if (document.fullscreenElement) document.exitFullscreen?.().catch?.(() => {})
  } catch {
    /* abaikan */
  }
}

// Memantau perpindahan tab, hilangnya fokus, dan keluar dari layar penuh.
// Setiap kejadian dilaporkan ke server (waktu dicatat server), lalu lamanya
// pergi dihitung saat siswa kembali. Pemantauan ini penghalang, bukan penjaga
// mutlak: guru yang menilai catatannya.
export function usePengawas({ pid, layarPenuh, onTutup }) {
  const [peringatan, setPeringatan] = useState(null) // { jenis, jumlah, ditutup }
  const pergi = useRef(false)
  const idAktif = useRef(null)
  const sudahMasuk = useRef(sedangLayarPenuh())
  const tutupRef = useRef(onTutup)
  tutupRef.current = onTutup

  const kembali = useCallback(() => {
    if (!pergi.current) return
    pergi.current = false
    const id = idAktif.current
    idAktif.current = null
    if (id)
      supabase.rpc('selesai_pelanggaran', { id_pelanggaran: id }).then(
        () => {},
        () => {},
      )
  }, [])

  const lapor = useCallback(
    async (jenis) => {
      if (!pid || pergi.current) return
      pergi.current = true
      setPeringatan((p) => ({ jenis, jumlah: (p?.jumlah ?? 0) + 1, ditutup: false }))
      try {
        const { data, error } = await supabase.rpc('catat_pelanggaran', { id_percobaan: pid, jenis_baru: jenis })
        if (error) return
        idAktif.current = data?.id ?? null
        setPeringatan({ jenis, jumlah: data?.jumlah ?? 1, ditutup: Boolean(data?.ditutup) })
        if (data?.ditutup) tutupRef.current?.()
        else if (!pergi.current && data?.id) {
          // siswa sudah kembali sebelum laporan selesai
          idAktif.current = data.id
          pergi.current = true
          kembali()
        }
      } catch {
        /* jaringan putus: lanjut tanpa mencatat */
      }
    },
    [pid, kembali],
  )

  useEffect(() => {
    if (!pid) return undefined
    const kasar = window.matchMedia?.('(pointer: coarse)').matches
    const sembunyi = () => {
      if (document.visibilityState === 'hidden') lapor('pindah_tab')
      else if (document.hasFocus()) kembali()
    }
    const blur = () => {
      if (kasar) return // di layar sentuh, blur sering salah (keyboard, pemilih bawaan)
      setTimeout(() => {
        if (document.visibilityState === 'visible' && !document.hasFocus()) lapor('kehilangan_fokus')
      }, 150)
    }
    const fokus = () => {
      if (document.visibilityState === 'visible' && !sedangKeluarLayar.current) kembali()
    }
    const sedangKeluarLayar = { current: false }
    const layar = () => {
      const penuh = sedangLayarPenuh()
      if (penuh) {
        sudahMasuk.current = true
        if (sedangKeluarLayar.current) {
          sedangKeluarLayar.current = false
          kembali()
        }
      } else if (layarPenuh === 'otomatis' && sudahMasuk.current) {
        sudahMasuk.current = false
        sedangKeluarLayar.current = true
        lapor('keluar_layar_penuh')
      }
    }
    document.addEventListener('visibilitychange', sembunyi)
    window.addEventListener('blur', blur)
    window.addEventListener('focus', fokus)
    document.addEventListener('fullscreenchange', layar)
    return () => {
      document.removeEventListener('visibilitychange', sembunyi)
      window.removeEventListener('blur', blur)
      window.removeEventListener('focus', fokus)
      document.removeEventListener('fullscreenchange', layar)
    }
  }, [pid, lapor, kembali, layarPenuh])

  const tutupPeringatan = () => {
    kembali()
    setPeringatan(null)
  }
  return { peringatan, tutupPeringatan }
}