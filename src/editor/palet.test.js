import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { kontras } from '../tema/warna.js'

// Palet materi: teks putih di atas warna kuat, dan teks sorotan di atas latar sorot,
// harus terbaca (kontras >= 4.5) di tema terang maupun gelap.
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')
const blok = (penanda) => {
  const awal = css.indexOf(penanda)
  assert.ok(awal >= 0, `${penanda} tidak ditemukan`)
  return css.slice(awal, css.indexOf('}', awal))
}
const ambil = (b, nama) => b.match(new RegExp(`${nama}:\\s*(#[0-9a-fA-F]{6})`))?.[1]

const KUAT = ['merah', 'biru', 'hijau', 'oranye', 'ungu', 'abu', 'kuning']
const SOROT = ['kuning', 'hijau', 'biru', 'merah', 'ungu']

for (const nama of KUAT) {
  test(`warna kuat ${nama}: teks putih terbaca`, () => {
    const w = ambil(blok('/* palet-terang */'), `--pal-${nama}`)
    assert.ok(w, `--pal-${nama} tidak ada`)
    assert.ok(kontras('#ffffff', w) >= 4.5, `${nama} ${w}: ${kontras('#ffffff', w).toFixed(2)}`)
  })
}
for (const [tema, penanda] of [
  ['terang', '/* palet-terang */'],
  ['gelap', '/* palet-gelap */'],
]) {
  const b = blok(penanda)
  const teks = ambil(blok(penanda), '--sorot-teks') ?? ambil(blok('/* palet-terang */'), '--sorot-teks')
  for (const nama of SOROT) {
    test(`sorot ${nama} pada tema ${tema}: teks terbaca`, () => {
      const l = ambil(b, `--sorot-${nama}`)
      assert.ok(l, `--sorot-${nama} tidak ada`)
      assert.ok(kontras(teks, l) >= 4.5, `${nama} ${l} vs ${teks}: ${kontras(teks, l).toFixed(2)}`)
    })
  }
}