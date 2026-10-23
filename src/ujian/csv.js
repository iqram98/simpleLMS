// Membuat dan mengunduh berkas CSV yang aman dibuka di Excel dan Google Sheets.

// Sel yang diawali = + - @ dianggap rumus oleh Excel. Awali dengan tanda petik
// agar nama atau isian siswa tidak dijalankan sebagai rumus.
export function amanSel(nilai) {
  if (nilai == null) return ''
  let t = String(nilai)
  if (/^[=+\-@\t\r]/.test(t) && !/^-?\d+([.,]\d+)?$/.test(t)) t = `'${t}`
  return /[",\n\r;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

export function buatCsv(baris) {
  // BOM agar huruf non-ASCII terbaca benar di Excel.
  return '﻿' + baris.map((b) => b.map(amanSel).join(',')).join('\r\n') + '\r\n'
}

export function unduhCsv(namaFile, baris) {
  const blob = new Blob([buatCsv(baris)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = namaFile.replace(/[^\w.\- ]+/g, '_')
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}