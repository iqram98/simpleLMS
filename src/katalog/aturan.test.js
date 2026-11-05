import test from 'node:test'
import assert from 'node:assert/strict'
import { adalahPublik, kelasKatalogBerlaku, modeEfektif, saringKatalog, tombolKatalog } from './aturan.js'

const k = (o = {}) => ({
  id: 'k1',
  title: 'Informatika',
  description: 'Dasar',
  nama_guru: 'Bu Sari',
  visibilitas: 'publik_langsung',
  harga_tipe: 'gratis',
  status_saya: null,
  milik_saya: false,
  ...o,
})

test('premium + langsung dinormalkan menjadi persetujuan', () => {
  assert.equal(modeEfektif('publik_langsung', 'premium'), 'publik_persetujuan')
  assert.equal(modeEfektif('publik_langsung', 'gratis'), 'publik_langsung')
  assert.equal(modeEfektif('privat', 'premium'), 'privat')
})

test('adalahPublik', () => {
  assert.equal(adalahPublik('privat'), false)
  assert.equal(adalahPublik('publik_langsung'), true)
  assert.equal(adalahPublik('publik_persetujuan'), true)
})

test('tombol: gratis langsung -> Gabung', () => {
  const t = tombolKatalog(k())
  assert.deepEqual([t.teks, t.aksi], ['Gabung', 'gabung'])
})

test('tombol: perlu persetujuan -> Ajukan bergabung', () => {
  const t = tombolKatalog(k({ visibilitas: 'publik_persetujuan' }))
  assert.deepEqual([t.teks, t.aksi], ['Ajukan bergabung', 'ajukan'])
})

test('tombol: premium selalu mengajukan, dengan info pembayaran', () => {
  const t = tombolKatalog(k({ harga_tipe: 'premium' }))
  assert.equal(t.aksi, 'ajukan')
  assert.match(t.info, /pembayaran/)
})

test('tombol: dikeluarkan atau ditolak mengajukan lagi walau mode langsung', () => {
  for (const s of ['dikeluarkan', 'ditolak']) {
    const t = tombolKatalog(k({ status_saya: s }))
    assert.deepEqual([t.teks, t.aksi], ['Ajukan lagi', 'ajukan'])
  }
})

test('tombol: aktif, menunggu, dan milik sendiri tidak bisa ditekan', () => {
  assert.equal(tombolKatalog(k({ status_saya: 'aktif' })).aksi, null)
  assert.equal(tombolKatalog(k({ status_saya: 'menunggu' })).aksi, null)
  assert.equal(tombolKatalog(k({ milik_saya: true })).aksi, null)
})

test('kelasKatalogBerlaku', () => {
  const kelas = [
    { id: 'a', is_archived: false },
    { id: 'b', is_archived: true },
  ]
  assert.equal(kelasKatalogBerlaku({ visibilitas: 'publik_langsung', kelas_publik_id: 'a' }, kelas), true)
  assert.equal(kelasKatalogBerlaku({ visibilitas: 'publik_langsung', kelas_publik_id: 'b' }, kelas), false)
  assert.equal(kelasKatalogBerlaku({ visibilitas: 'privat', kelas_publik_id: 'a' }, kelas), false)
  assert.equal(kelasKatalogBerlaku({ visibilitas: 'publik_langsung', kelas_publik_id: null }, kelas), false)
})

test('saringKatalog: kata kunci dan harga', () => {
  const d = [k(), k({ id: 'k2', title: 'Matematika', nama_guru: 'Pak Budi', harga_tipe: 'premium' })]
  assert.equal(saringKatalog(d, 'budi').length, 1)
  assert.equal(saringKatalog(d, 'INFO').length, 1)
  assert.equal(saringKatalog(d, '', 'premium').length, 1)
  assert.equal(saringKatalog(d, '').length, 2)
  assert.equal(saringKatalog(d, 'zzz').length, 0)
})