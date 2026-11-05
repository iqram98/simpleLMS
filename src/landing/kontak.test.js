import test from 'node:test'
import assert from 'node:assert/strict'
import { daftarKontak, tautanEmail, tautanInstagram, tautanWhatsapp } from './kontak.js'

test('tautanWhatsapp: berbagai bentuk nomor Indonesia', () => {
  assert.equal(tautanWhatsapp('0812-3456-7890'), 'https://wa.me/6281234567890')
  assert.equal(tautanWhatsapp('+62 812 3456 7890'), 'https://wa.me/6281234567890')
  assert.equal(tautanWhatsapp('81234567890'), 'https://wa.me/6281234567890')
  assert.equal(tautanWhatsapp('123'), null)
  assert.equal(tautanWhatsapp(''), null)
})

test('tautanInstagram menerima @akun, akun, atau tautan penuh', () => {
  assert.equal(tautanInstagram('@kelas.online'), 'https://instagram.com/kelas.online')
  assert.equal(tautanInstagram('https://www.instagram.com/kelas.online/?hl=id'), 'https://instagram.com/kelas.online')
  assert.equal(tautanInstagram('bukan akun!'), null)
})

test('tautanEmail', () => {
  assert.equal(tautanEmail('a@b.id'), 'mailto:a@b.id')
  assert.equal(tautanEmail('a@b'), null)
})

test('daftarKontak: hanya yang terisi, tanpa tautan bila format salah', () => {
  assert.deepEqual(daftarKontak({ email: '', whatsapp: ' ', instagram: '', alamat: '' }), [])
  const d = daftarKontak({ email: 'a@b.id', whatsapp: 'xx', alamat: 'Makassar' })
  assert.deepEqual(
    d.map((x) => [x.kunci, x.href]),
    [
      ['email', 'mailto:a@b.id'],
      ['whatsapp', null],
      ['alamat', null],
    ],
  )
})