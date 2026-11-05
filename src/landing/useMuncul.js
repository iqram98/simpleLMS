import { useLayoutEffect } from 'react'

// Animasi muncul saat digulir: elemen ber-kelas "muncul" memudar naik ketika masuk layar, sekali saja.
// Tanpa JS, tanpa IntersectionObserver, atau bila pengguna memilih "kurangi gerakan", semuanya langsung tampil.
export function bolehAnimasi(win = window) {
  if (typeof win.IntersectionObserver !== 'function') return false
  if (typeof win.matchMedia === 'function' && win.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return true
}

export function useMuncul(akarRef) {
  useLayoutEffect(() => {
    const akar = akarRef.current
    if (!akar || !bolehAnimasi()) return undefined
    akar.classList.add('lp-anim')
    const io = new IntersectionObserver(
      (daftar) => {
        for (const e of daftar) {
          if (e.isIntersecting) {
            e.target.classList.add('tampil')
            io.unobserve(e.target)
          }
        }
      },
      { threshold: 0, rootMargin: '0px 0px -8% 0px' },
    )
    akar.querySelectorAll('.muncul').forEach((n) => io.observe(n))
    return () => {
      io.disconnect()
      akar.classList.remove('lp-anim')
    }
  }, [akarRef])
}