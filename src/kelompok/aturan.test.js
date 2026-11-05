import test from 'node:test'
import assert from 'node:assert/strict'
import {
  adalahTugasKelompok,
  periksaJumlahAcak,
  periksaNama,
  pratinjauAcak,
  teksAnggota,
  teksUkuran,
  tujuanPindah,
} from './aturan.js'

test('periksaNama', () => {
  assert.match(periksaNama(''), /kosong/)
  assert.match(periksaNama('   '), /kosong/)
  assert.equal(periksaNama('Kelompok A'), null)
  assert.equal(periksaNama('a'.repeat(80)), null)
  assert.match(periksaNama('a'.repeat(81)), /80/)
  assert.match(periksaNama(null), /kosong/)
})

test('periksaJumlahAcak', () => {
  assert.match(periksaJumlahAcak(3, 0), /sudah punya kelompok/)
  for (const j of [0, -1, 51, 2.5, NaN, null]) assert.match(periksaJumlahAcak(j, 10), /1 sampai 50/)
  assert.equal(periksaJumlahAcak(1, 10), null)
  assert.equal(periksaJumlahAcak(50, 10), null)
})

test('pratinjauAcak: dibatasi jumlah siswa dan dibagi merata', () => {
  assert.deepEqual(pratinjauAcak(3, 10), { kelompok: 3, kecil: 3, besar: 4 })
  assert.deepEqual(pratinjauAcak(5, 10), { kelompok: 5, kecil: 2, besar: 2 })
  assert.deepEqual(pratinjauAcak(20, 4), { kelompok: 4, kecil: 1, besar: 1 })
  assert.deepEqual(pratinjauAcak(3, 0), { kelompok: 0, kecil: 0, besar: 0 })
  assert.deepEqual(pratinjauAcak(0, 5), { kelompok: 0, kecil: 0, besar: 0 })
})

test('teksUkuran', () => {
  assert.equal(teksUkuran(pratinjauAcak(5, 10)), '5 kelompok, masing-masing 2 siswa')
  assert.equal(teksUkuran(pratinjauAcak(3, 10)), '3 kelompok, masing-masing 3 sampai 4 siswa')
  assert.equal(teksUkuran(pratinjauAcak(3, 0)), '')
})

test('teksAnggota, adalahTugasKelompok, tujuanPindah', () => {
  assert.equal(teksAnggota([{ nama: 'Ani' }, { nama: 'Budi' }]), 'Ani, Budi')
  assert.equal(teksAnggota(null), '')
  assert.equal(adalahTugasKelompok({ kelompok_set_id: 'x' }), true)
  assert.equal(adalahTugasKelompok({ kelompok_set_id: null }), false)
  assert.equal(adalahTugasKelompok(undefined), false)
  assert.deepEqual(tujuanPindah([{ id: 'a' }, { id: 'b' }], 'a'), [{ id: 'b' }])
})