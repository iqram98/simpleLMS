import test from 'node:test'
import assert from 'node:assert/strict'
import { atributTerima, escapeKueri, idValid, namaFolder, periksaFile, tanpaEkstensi, urlBuka, urlGambar } from './aturan.js'

const f = (type, size) => ({ type, size, name: 'a' })

test('periksaFile: gambar sah, terlalu besar, dan format asing', () => {
  assert.deepEqual(periksaFile(f('image/png', 1000), 'gambar'), { ok: true, jenis: 'gambar' })
  assert.equal(periksaFile(f('image/png', 11 * 1024 * 1024)).ok, false)
  assert.equal(periksaFile(f('image/svg+xml', 100)).ok, false) // SVG dapat memuat skrip
  assert.equal(periksaFile(f('application/x-msdownload', 100)).ok, false)
  assert.equal(periksaFile(f('image/png', 0)).ok, false)
  assert.equal(periksaFile(null).ok, false)
})

test('periksaFile: dokumen hanya bila terima semua', () => {
  assert.deepEqual(periksaFile(f('application/pdf', 5000)), { ok: true, jenis: 'dokumen' })
  assert.equal(periksaFile(f('application/pdf', 5000), 'gambar').ok, false)
  assert.equal(periksaFile(f('application/pdf', 26 * 1024 * 1024)).ok, false)
  assert.equal(periksaFile(f('video/mp4', 5000)).ok, false)
})

test('atributTerima dan namaFolder', () => {
  assert.ok(!atributTerima('gambar').includes('pdf'))
  assert.ok(atributTerima('semua').includes('pdf'))
  assert.equal(namaFolder('Kelas Bu Sari'), 'Kelas Bu Sari – File Materi')
  assert.equal(namaFolder('  '), 'Kelas Online – File Materi')
})

test('escapeKueri melindungi tanda petik dan garis miring', () => {
  assert.equal(escapeKueri("Kelas O'Brien"), "Kelas O\\'Brien")
  assert.equal(escapeKueri('a\\b'), 'a\\\\b')
})

test('idValid, urlGambar, urlBuka, tanpaEkstensi', () => {
  assert.ok(idValid('1AbCdEfGhIjKlMnOp_-'))
  assert.ok(!idValid('a b'))
  assert.ok(!idValid("x'y"))
  assert.ok(!idValid(undefined))
  assert.equal(urlGambar('ID1234567890'), 'https://drive.google.com/thumbnail?id=ID1234567890&sz=w1600')
  assert.equal(urlBuka('ID1234567890'), 'https://drive.google.com/file/d/ID1234567890/view')
  assert.equal(tanpaEkstensi('foto kelas.final.jpg'), 'foto kelas.final')
  assert.equal(tanpaEkstensi('tanpa'), 'tanpa')
})