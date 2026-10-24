import assert from 'node:assert/strict'
import test from 'node:test'
import { parseSoal } from './tempel.js'

const contoh = `1. Ibu kota Indonesia adalah
A. Bandung
B. Jakarta
C. Surabaya
Jawaban: B
Poin: 2
Pembahasan: Jakarta adalah ibu kota.
Lanjutan pembahasan.

2. Matahari terbit dari barat
Jawaban: Salah

Pilih bilangan genap
A. 2
B. 3
C. 4
Jawaban: A, C

Hasil 3 + 4 adalah
Jawaban: 7 | tujuh`

test('mengenali empat bentuk soal', () => {
  const r = parseSoal(contoh)
  assert.equal(r.length, 4)
  assert.deepEqual(
    r.map((x) => x.payload?.type),
    ['pilihan_ganda', 'benar_salah', 'pilihan_kompleks', 'isian_singkat'],
  )
  assert.deepEqual(r[0].payload.kunci, { benar: ['b'] })
  assert.equal(r[0].payload.points, 2)
  assert.equal(r[0].payload.prompt_text, 'Ibu kota Indonesia adalah')
  assert.equal(r[0].payload.options.length, 3)
  assert.equal(r[0].payload.pembahasan_text, 'Jakarta adalah ibu kota.\nLanjutan pembahasan.')
  assert.deepEqual(r[1].payload.kunci, { benar: ['salah'] })
  assert.deepEqual(r[2].payload.kunci, { benar: ['a', 'c'] })
  assert.deepEqual(r[3].payload.kunci, { jawaban: ['7', 'tujuh'] })
})

test('galat dilaporkan per soal tanpa menggagalkan yang lain', () => {
  const r = parseSoal(
    'Tanpa jawaban\nA. satu\nB. dua\n\nSoal bagus\nJawaban: ya\n\nPilih\nA. a\nB. b\nJawaban: Z\n\nPoin ngawur\nJawaban: x\nPoin: -1',
  )
  assert.match(r[0].galat, /Jawaban/)
  assert.ok(r[1].payload)
  assert.match(r[2].galat, /tidak cocok/)
  assert.match(r[3].galat, /Poin/)
})

test('teks kosong dan satu pilihan', () => {
  assert.deepEqual(parseSoal('  \n \n'), [])
  assert.match(parseSoal('x\nA. satu\nJawaban: A')[0].galat, /minimal dua/)
})

test('pilihan yang menyambung ke baris berikutnya digabung', () => {
  const [r] = parseSoal('x?\nA. satu\nlanjutan\nB. dua\nJawaban: A')
  assert.equal(r.payload.options[0].text, 'satu lanjutan')
})