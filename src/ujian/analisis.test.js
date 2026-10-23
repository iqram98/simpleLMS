import assert from 'node:assert/strict'
import test from 'node:test'
import { amanSel, buatCsv } from './csv.js'
import { analisisButir, barisSiswa, ringkasan, tingkat } from './analisis.js'

test('csv: rumus dinetralkan, koma dan kutip di-escape, angka negatif tetap', () => {
  assert.equal(amanSel('=1+1'), "'=1+1")
  assert.equal(amanSel('@x'), "'@x")
  assert.equal(amanSel('-5'), '-5')
  assert.equal(amanSel('a,b'), '"a,b"')
  assert.equal(amanSel('Si "Budi"'), '"Si ""Budi"""')
  assert.equal(amanSel(null), '')
  assert.ok(buatCsv([['a', 'b']]).startsWith('﻿'))
})

test('barisSiswa dan ringkasan', () => {
  const siswa = [{ user_id: 'a' }, { user_id: 'b' }, { user_id: 'c' }, { user_id: 'd' }]
  const percobaan = [
    { user_id: 'a', nomor: 1, status: 'selesai', nilai: 60 },
    { user_id: 'a', nomor: 2, status: 'selesai', nilai: 90 },
    { user_id: 'b', nomor: 1, status: 'selesai', nilai: 50 },
    { user_id: 'c', nomor: 1, status: 'berjalan', nilai: null },
  ]
  const baris = barisSiswa({ siswa, percobaan, nilaiAkhir: { a: 90, b: 50 }, kkm: 70, maks: 3 })
  assert.deepEqual(
    baris.map((b) => b.status),
    ['lulus', 'belum_lulus', 'berjalan', 'belum'],
  )
  assert.equal(baris[0].sisa, 1)
  const r = ringkasan(baris)
  assert.deepEqual(
    { j: r.jumlah, d: r.dikerjakan, l: r.lulus, rata: r.rata, maks: r.tertinggi, min: r.terendah },
    { j: 4, d: 2, l: 1, rata: 70, maks: 90, min: 50 },
  )
})

test('tingkat kesulitan', () => {
  assert.equal(tingkat(80), 'Mudah')
  assert.equal(tingkat(79), 'Sedang')
  assert.equal(tingkat(39), 'Sulit')
  assert.equal(tingkat(null), '-')
})

test('analisisButir: persen benar, sebaran pilihan, jawaban kosong', () => {
  const soal = [
    {
      id: 's1',
      type: 'pilihan_ganda',
      options: [
        { id: 'a', text: 'X' },
        { id: 'b', text: 'Y' },
      ],
      points: 1,
    },
    { id: 's2', type: 'isian_singkat', options: [], points: 2 },
  ]
  const kunci = { s1: { benar: ['b'] } }
  const percobaan = [
    { id: 'p1', jawaban: { s1: 'b', s2: '7' } },
    { id: 'p2', jawaban: { s1: 'a' } },
    { id: 'p3', jawaban: {} },
  ]
  const hasil = {
    p1: { s1: { poin: 1, benar: true }, s2: { poin: 2, benar: true } },
    p2: { s1: { poin: 0, benar: false }, s2: { poin: 0, benar: false } },
    p3: { s1: { poin: 0, benar: false }, s2: { poin: 0, benar: false } },
  }
  const [b1, b2] = analisisButir({ soal, kunci, percobaan, hasil })
  assert.equal(b1.n, 3)
  assert.equal(b1.persen, 33)
  assert.equal(b1.tingkat, 'Sulit')
  assert.equal(b1.kosong, 1)
  assert.deepEqual(
    b1.opsi.map((o) => [o.id, o.dipilih, o.kunci]),
    [
      ['a', 1, false],
      ['b', 1, true],
    ],
  )
  assert.equal(b2.rataPoin, 0.67)
  assert.equal(b2.kosong, 2)
})