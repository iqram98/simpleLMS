import test from 'node:test'
import assert from 'node:assert/strict'
import { atributGaya, bersihkanGaya } from './gayaBlok.js'

test('gaya kosong atau tak berguna menjadi null', () => {
  assert.equal(bersihkanGaya(null), null)
  assert.equal(bersihkanGaya([]), null)
  assert.equal(bersihkanGaya({ warna: 'biru' }), null)
  assert.equal(bersihkanGaya({ latar: false, bingkai: 'x' }), null)
})

test('nilai di luar daftar dibuang', () => {
  assert.deepEqual(bersihkanGaya({ warna: 'pink', latar: true, bingkai: 'css', lain: 1 }), { latar: true })
  assert.deepEqual(bersihkanGaya({ warna: 'hijau', bingkai: 'judul' }), { warna: 'hijau', bingkai: 'judul' })
})

test('atributGaya: warna bawaan biru', () => {
  assert.deepEqual(atributGaya({ latar: true }), { 'data-warna': 'biru', 'data-latar': 'ya' })
  assert.deepEqual(atributGaya(undefined), {})
  assert.deepEqual(atributGaya({ warna: 'merah', bingkai: 'tebal' }), { 'data-warna': 'merah', 'data-bingkai': 'tebal' })
})