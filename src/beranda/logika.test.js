import test from 'node:test'
import assert from 'node:assert/strict'
import { hitungPelajaran, kelompokkan, labelTenggat, pelajaranBerikut, susunTenggat } from './logika.js'

const modul = [
  {
    title: 'M1',
    lessons: [
      { id: 'a', title: 'A', is_published: true },
      { id: 'b', title: 'B', is_published: true },
    ],
  },
  {
    title: 'M2',
    lessons: [
      { id: 'c', title: 'C', is_published: false },
      { id: 'd', title: 'D', is_published: true },
    ],
  },
]

test('pelajaranBerikut: melewati yang selesai dan yang draft', () => {
  assert.equal(pelajaranBerikut(modul, new Set()).id, 'a')
  assert.equal(pelajaranBerikut(modul, new Set(['a'])).id, 'b')
  assert.equal(pelajaranBerikut(modul, new Set(['a', 'b'])).id, 'd')
  assert.equal(pelajaranBerikut(modul, new Set(['a', 'b'])).modul, 'M2')
  assert.equal(pelajaranBerikut(modul, new Set(['a', 'b', 'd'])), null)
})

test('hitungPelajaran: hanya yang terbit', () => assert.equal(hitungPelajaran(modul), 3))

const now = new Date('2026-11-02T08:00:00').getTime()
const di = (jam) => new Date(now + jam * 3600 * 1000).toISOString()

test('labelTenggat', () => {
  assert.deepEqual(labelTenggat(di(-30), now), { teks: 'lewat 1 hari', mendesak: true, lewat: true })
  assert.equal(labelTenggat(di(-3), now).teks, 'lewat 3 jam')
  assert.equal(labelTenggat(di(2), now).lewat, false)
  assert.match(labelTenggat(di(2), now).teks, /^hari ini/)
  assert.match(labelTenggat(di(20), now).teks, /^besok/)
  const jauh = labelTenggat(di(24 * 5 + 1), now)
  assert.equal(jauh.teks, '6 hari lagi')
  assert.equal(jauh.mendesak, false)
})

test('susunTenggat: saring, urut, dan sembunyikan yang selesai', () => {
  const pelajaran = new Map([
    ['t1', { title: 'Tugas 1', kursusId: 'k' }],
    ['t2', { title: 'Tugas 2', kursusId: 'k' }],
    ['t3', { title: 'Tugas 3', kursusId: 'k' }],
    ['t4', { title: 'Tugas 4', kursusId: 'k' }],
    ['u1', { title: 'Ujian 1', kursusId: 'k' }],
  ])
  const hasil = susunTenggat({
    sekarang: now,
    pelajaran,
    selesai: new Set(['t3']),
    tugas: [
      { lesson_id: 't1', tenggat: di(48), terima_terlambat: true },
      { lesson_id: 't2', tenggat: di(-5), terima_terlambat: true }, // lewat tapi masih diterima
      { lesson_id: 't3', tenggat: di(10), terima_terlambat: true }, // sudah dikirim
      { lesson_id: 't4', tenggat: di(-5), terima_terlambat: false }, // lewat dan ditutup
      { lesson_id: 'tidak-ada', tenggat: di(10), terima_terlambat: true },
    ],
    ujian: [{ lesson_id: 'u1', tutup_pada: di(24) }],
  })
  assert.deepEqual(
    hasil.map((h) => h.lessonId),
    ['t2', 'u1', 't1'],
  )
  assert.equal(hasil[1].jenis, 'ujian')
})

test('susunTenggat: tenggat sangat jauh atau sangat lama disembunyikan', () => {
  const pelajaran = new Map([
    ['a', { title: 'A', kursusId: 'k' }],
    ['b', { title: 'B', kursusId: 'k' }],
  ])
  const hasil = susunTenggat({
    sekarang: now,
    pelajaran,
    selesai: new Set(),
    tugas: [
      { lesson_id: 'a', tenggat: di(24 * 30), terima_terlambat: true },
      { lesson_id: 'b', tenggat: di(-24 * 20), terima_terlambat: true },
    ],
    ujian: [],
  })
  assert.equal(hasil.length, 0)
})

test('kelompokkan: menghitung per kunci, terbanyak dulu', () => {
  const baris = [
    { k: 'x', j: 'X' },
    { k: 'y', j: 'Y' },
    { k: 'y', j: 'Y' },
  ]
  const hasil = kelompokkan(
    baris,
    (b) => b.k,
    (b) => b.j,
  )
  assert.deepEqual(
    hasil.map((h) => [h.kunci, h.jumlah]),
    [
      ['y', 2],
      ['x', 1],
    ],
  )
})