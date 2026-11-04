import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { kontras } from './warna.js'

// Warna makna aksi (hapus, terbit, draft, ubah) harus terbaca di tema terang dan gelap,
// apa pun warna utama yang dipilih admin: nilainya tidak bergantung pada warna utama.
// Daftar selektor boleh terbagi ke beberapa baris (hasil prettier), jadi diratakan dulu.
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8').replace(/,\s*\n\s*/g, ', ')
const blok = (selektor) => {
  const awal = css.indexOf(selektor)
  assert.ok(awal >= 0, `selektor ${selektor} tidak ditemukan`)
  return css.slice(awal, css.indexOf('}', awal))
}
const ambilVar = (b, nama) => b.match(new RegExp(`${nama}:\\s*(#[0-9a-fA-F]{6})`))[1]

const tema = {
  terang: { blok: blok(":root, [data-tema='terang']"), kartu: '#ffffff' },
  gelap: { blok: blok("[data-tema='gelap']"), kartu: '#171b24' },
}
const MAKNA = ['bahaya', 'sem-sukses', 'sem-peringatan', 'sem-info']

for (const [nama, t] of Object.entries(tema)) {
  for (const m of MAKNA) {
    test(`kontras ${m} pada tema ${nama}: ikon dan teks terbaca`, () => {
      const warna = ambilVar(t.blok, `--${m}`)
      assert.ok(kontras(warna, t.kartu) >= 4.5, `${m} ${warna} kontras ${kontras(warna, t.kartu).toFixed(2)} terhadap ${t.kartu}`)
      const lembut = ambilVar(t.blok, `--${m}-lembut`)
      assert.ok(kontras(warna, lembut) >= 4.5, `${m} pada latar lembut ${lembut}: ${kontras(warna, lembut).toFixed(2)}`)
    })
  }
}