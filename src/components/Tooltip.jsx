import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hitungPosisi } from './tooltipPosisi.js'

// Tooltip global untuk semua tombol ikon. Elemen yang punya data-tip, atau tombol ikon dengan aria-label,
// otomatis mendapat tooltip: saat kursor di atasnya (mouse), saat difokus lewat keyboard, dan saat ditekan lama (layar sentuh).
// Tekan lama menampilkan nama tombol tanpa menjalankan aksinya.
const PILIH = '[data-tip], .btn.ikon[aria-label], .rail-item[aria-label]'
const JEDA_HOVER = 120
const JEDA_TEKAN_LAMA = 450
const LAMA_TAMPIL_SENTUH = 2000
const GESER_MAKS = 10

const teksDari = (el) => el.getAttribute('data-tip') || el.getAttribute('aria-label') || ''

export default function Tooltip() {
  const [tip, setTip] = useState(null) // { teks, rect }
  const kotak = useRef(null)

  useLayoutEffect(() => {
    const el = kotak.current
    if (!tip || !el) return
    const p = hitungPosisi(tip.rect, el.offsetWidth, el.offsetHeight, window.innerWidth, window.innerHeight)
    el.style.left = `${p.left}px`
    el.style.top = `${p.top}px`
    el.classList.add('tampil')
    return () => el.classList.remove('tampil')
  }, [tip])

  useEffect(() => {
    let timerHover = null
    let timerTekan = null
    let timerSembunyi = null
    let sasaran = null // elemen yang tooltip-nya sedang ditampilkan atau ditunggu
    let awal = null // titik awal sentuhan
    let tahanKlik = false

    const sembunyi = () => {
      clearTimeout(timerHover)
      clearTimeout(timerTekan)
      clearTimeout(timerSembunyi)
      sasaran = null
      setTip(null)
    }
    const tampil = (el) => {
      const teks = teksDari(el)
      if (!teks) return
      sasaran = el
      setTip({ teks, rect: el.getBoundingClientRect() })
    }
    const cari = (n) => (n instanceof Element ? n.closest(PILIH) : null)

    const masuk = (e) => {
      if (e.pointerType === 'touch') return
      const el = cari(e.target)
      if (!el || el === sasaran) return
      clearTimeout(timerHover)
      timerHover = setTimeout(() => tampil(el), JEDA_HOVER)
    }
    const keluar = (e) => {
      if (e.pointerType === 'touch') return
      const el = cari(e.target)
      if (el && !el.contains(e.relatedTarget)) sembunyi()
    }
    const fokus = (e) => {
      const el = cari(e.target)
      if (el && el.matches(':focus-visible')) tampil(el)
    }
    const turunPointer = (e) => {
      if (e.pointerType !== 'touch') {
        sembunyi()
        return
      }
      const el = cari(e.target)
      if (!el) {
        sembunyi()
        return
      }
      sembunyi()
      awal = { x: e.clientX, y: e.clientY }
      timerTekan = setTimeout(() => {
        tahanKlik = true
        tampil(el)
        timerSembunyi = setTimeout(sembunyi, LAMA_TAMPIL_SENTUH)
        if (navigator.vibrate) navigator.vibrate(10)
      }, JEDA_TEKAN_LAMA)
    }
    const geser = (e) => {
      if (e.pointerType !== 'touch' || !awal) return
      if (Math.hypot(e.clientX - awal.x, e.clientY - awal.y) > GESER_MAKS) clearTimeout(timerTekan)
    }
    const lepas = (e) => {
      if (e.pointerType !== 'touch') return
      clearTimeout(timerTekan)
      awal = null
      // klik yang menyusul setelah tekan lama diabaikan; bila tidak ada klik, penanda dibersihkan.
      if (tahanKlik) setTimeout(() => (tahanKlik = false), 500)
    }
    const batal = (e) => {
      if (e.pointerType !== 'touch') return
      clearTimeout(timerTekan)
      awal = null
    }
    const klik = (e) => {
      if (tahanKlik && cari(e.target)) {
        e.preventDefault()
        e.stopPropagation()
        tahanKlik = false
      }
    }
    const menuKonteks = (e) => {
      // Tekan lama di layar sentuh memicu menu konteks bawaan; tidak dibutuhkan pada tombol ikon.
      if (cari(e.target) && (tahanKlik || timerTekan)) e.preventDefault()
    }
    const tombol = (e) => {
      if (e.key === 'Escape') sembunyi()
    }

    document.addEventListener('pointerover', masuk)
    document.addEventListener('pointerout', keluar)
    document.addEventListener('focusin', fokus)
    document.addEventListener('focusout', sembunyi)
    document.addEventListener('pointerdown', turunPointer, true)
    document.addEventListener('pointermove', geser, true)
    document.addEventListener('pointerup', lepas, true)
    document.addEventListener('pointercancel', batal, true)
    document.addEventListener('click', klik, true)
    document.addEventListener('contextmenu', menuKonteks)
    document.addEventListener('keydown', tombol)
    window.addEventListener('scroll', sembunyi, true)
    window.addEventListener('resize', sembunyi)
    return () => {
      sembunyi()
      document.removeEventListener('pointerover', masuk)
      document.removeEventListener('pointerout', keluar)
      document.removeEventListener('focusin', fokus)
      document.removeEventListener('focusout', sembunyi)
      document.removeEventListener('pointerdown', turunPointer, true)
      document.removeEventListener('pointermove', geser, true)
      document.removeEventListener('pointerup', lepas, true)
      document.removeEventListener('pointercancel', batal, true)
      document.removeEventListener('click', klik, true)
      document.removeEventListener('contextmenu', menuKonteks)
      document.removeEventListener('keydown', tombol)
      window.removeEventListener('scroll', sembunyi, true)
      window.removeEventListener('resize', sembunyi)
    }
  }, [])

  return tip ? (
    <div ref={kotak} className="tooltip" role="tooltip">
      {tip.teks}
    </div>
  ) : null
}