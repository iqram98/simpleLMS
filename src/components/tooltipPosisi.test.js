import test from 'node:test'
import assert from 'node:assert/strict'
import { hitungPosisi } from './tooltipPosisi.js'

const rect = (l, t, w = 36, h = 36) => ({ left: l, top: t, width: w, height: h, bottom: t + h })

test('tooltip di bawah dan terpusat pada tombol', () => {
  const p = hitungPosisi(rect(200, 100), 100, 30, 1000, 800)
  assert.equal(p.diAtas, false)
  assert.equal(p.top, 144)
  assert.equal(p.left, 168)
})

test('tooltip dijaga di dalam tepi kiri dan kanan', () => {
  assert.equal(hitungPosisi(rect(0, 100), 120, 30, 1000, 800).left, 8)
  assert.equal(hitungPosisi(rect(980, 100), 120, 30, 1000, 800).left, 1000 - 120 - 8)
})

test('tooltip pindah ke atas bila tidak muat di bawah', () => {
  const p = hitungPosisi(rect(200, 770), 100, 30, 1000, 800)
  assert.equal(p.diAtas, true)
  assert.equal(p.top, 770 - 30 - 8)
})