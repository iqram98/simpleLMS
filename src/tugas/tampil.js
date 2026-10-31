import { toEmbed } from '../lib/embed.js'

export const angka = (n) => (n == null ? '-' : String(Math.round(Number(n) * 100) / 100).replace('.', ','))
export const waktu = (iso) =>
  iso
    ? new Date(iso).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

// Tautan dari siswa ditanam hanya untuk host yang dikenal. Web app Apps Script
// buatan siswa tidak ditanam di halaman guru: cukup dibuka di tab baru.
export function embedTugas(url) {
  const e = toEmbed(url)
  return e && e.jenis !== 'Web app Apps Script' ? e : null
}

export const SANDBOX_TUGAS = 'allow-scripts allow-same-origin allow-popups allow-presentation'