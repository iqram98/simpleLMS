import test from 'node:test'
import assert from 'node:assert/strict'
import { urutkanTopik, waktuRelatif } from './tampil.js'

const t0 = new Date('2026-10-27T10:00:00Z').getTime()
const lalu = (detik) => new Date(t0 - detik * 1000).toISOString()

test('waktuRelatif: satuan waktu', () => {
  assert.equal(waktuRelatif(lalu(10), t0), 'baru saja')
  assert.equal(waktuRelatif(lalu(300), t0), '5 menit lalu')
  assert.equal(waktuRelatif(lalu(7200), t0), '2 jam lalu')
  assert.equal(waktuRelatif(lalu(100000), t0), 'kemarin')
  assert.equal(waktuRelatif(lalu(3 * 86400), t0), '3 hari lalu')
})

test('urutkanTopik: disematkan dulu, lalu aktivitas terbaru', () => {
  const daftar = [
    { id: 'a', disematkan: false, aktivitas_terakhir: lalu(100) },
    { id: 'b', disematkan: true, aktivitas_terakhir: lalu(900) },
    { id: 'c', disematkan: false, aktivitas_terakhir: lalu(10) },
  ]
  assert.deepEqual(
    urutkanTopik(daftar).map((t) => t.id),
    ['b', 'c', 'a'],
  )
})