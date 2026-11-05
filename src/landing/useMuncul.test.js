import test from 'node:test'
import assert from 'node:assert/strict'
import { bolehAnimasi } from './useMuncul.js'

const IO = function () {}
test('bolehAnimasi: butuh IntersectionObserver', () => {
  assert.equal(bolehAnimasi({}), false)
  assert.equal(bolehAnimasi({ IntersectionObserver: IO }), true)
})

test('bolehAnimasi: mati bila pengguna memilih kurangi gerakan', () => {
  const win = (kurangi) => ({ IntersectionObserver: IO, matchMedia: () => ({ matches: kurangi }) })
  assert.equal(bolehAnimasi(win(true)), false)
  assert.equal(bolehAnimasi(win(false)), true)
})