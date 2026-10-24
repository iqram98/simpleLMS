import assert from 'node:assert/strict'
import test from 'node:test'
import { amanSel, buatCsv } from './csv.js'
import { analisisButir, barisSiswa, rekapSurvei, ringkasan, tingkat } from './analisis.js'

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

test('analisisButir: tipe non-pilihan tidak menghasilkan sebaran dan menghitung kosong', () => {
  const soal = [
    { id: 'm', type: 'menjodohkan', options: [{ id: 'a', text: 'x' }], points: 2 },
    { id: 'u', type: 'mengurutkan', options: [{ id: 'a', text: 'x' }], points: 2 },
    { id: 'r', type: 'rumpang', options: [], points: 2 },
  ]
  const percobaan = [
    { id: 'p1', jawaban: { m: { a: 'k1' }, u: ['a'], r: { 1: 'x' } } },
    { id: 'p2', jawaban: { m: {}, u: [], r: { 1: '  ' } } },
  ]
  const hasil = {
    p1: { m: { poin: 2, benar: true }, u: { poin: 2, benar: true }, r: { poin: 2, benar: true } },
    p2: { m: { poin: 0, benar: false }, u: { poin: 0, benar: false }, r: { poin: 0, benar: false } },
  }
  const [m, u, r] = analisisButir({ soal, kunci: {}, percobaan, hasil })
  for (const x of [m, u, r]) {
    assert.equal(x.opsi.length, 0)
    assert.equal(x.kosong, 1)
    assert.equal(x.persen, 50)
  }
})

test('barisSiswa: menunggu penilaian dan survei saja', () => {
  const siswa = [{ user_id: 'a' }, { user_id: 'b' }]
  const percobaan = [
    { user_id: 'a', nomor: 1, status: 'selesai', nilai: null, perlu_dinilai: true },
    { user_id: 'b', nomor: 1, status: 'selesai', nilai: null, perlu_dinilai: false },
  ]
  const baris = barisSiswa({ siswa, percobaan, nilaiAkhir: {}, kkm: 70, maks: 3 })
  assert.deepEqual(
    baris.map((b) => b.status),
    ['menunggu', 'terkirim'],
  )
  assert.equal(ringkasan(baris).menunggu, 1)
})

test('analisisButir mengabaikan uraian yang belum dinilai', () => {
  const soal = [{ id: 'u', type: 'uraian', options: [], points: 4 }]
  const percobaan = [
    { id: 'p1', jawaban: { u: 'x' } },
    { id: 'p2', jawaban: { u: 'y' } },
  ]
  const hasil = { p1: { u: { menunggu: true } }, p2: { u: { poin: 4, benar: true } } }
  const [b] = analisisButir({ soal, kunci: {}, percobaan, hasil })
  assert.equal(b.n, 1)
  assert.equal(b.persen, 100)
})

test('rekapSurvei: pilihan, skala, teks; memakai percobaan terakhir tiap siswa', () => {
  const soal = [
    {
      id: 'p',
      type: 'survei_pilihan',
      options: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
      ],
    },
    { id: 's', type: 'survei_skala', options: [] },
    { id: 't', type: 'survei_teks', options: [] },
    { id: 'x', type: 'isian_singkat', options: [] },
  ]
  const percobaan = [
    { user_id: 'u1', nomor: 1, status: 'selesai', jawaban: { p: 'a', s: 1, t: 'lama' } },
    { user_id: 'u1', nomor: 2, status: 'selesai', jawaban: { p: 'b', s: 5, t: 'baru' } },
    { user_id: 'u2', nomor: 1, status: 'selesai', jawaban: { p: 'b', s: 4, t: '  ' } },
    { user_id: 'u3', nomor: 1, status: 'berjalan', jawaban: { p: 'a' } },
  ]
  const [p, s, t] = rekapSurvei({ soal, percobaan, nama: { u1: 'Ani', u2: 'Budi' } })
  assert.deepEqual(
    p.opsi.map((o) => o.jumlah),
    [0, 2],
  )
  assert.equal(s.rata, 4.5)
  assert.deepEqual(s.sebaran, [0, 0, 0, 1, 1])
  assert.deepEqual(t.teks, [{ nama: 'Ani', teks: 'baru' }])
  assert.equal(p.tanggapan, 2)
})