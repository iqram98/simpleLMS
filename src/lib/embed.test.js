import test from 'node:test'
import assert from 'node:assert/strict'
import { toEmbed, urlHttpsValid } from './embed.js'

const src = (u) => toEmbed(u)?.src ?? null

test('Google Drive: file diubah ke /preview', () => {
  assert.equal(
    src('https://drive.google.com/file/d/1QwErTy-UiOp_AsDf/view?usp=sharing'),
    'https://drive.google.com/file/d/1QwErTy-UiOp_AsDf/preview',
  )
})

test('Google Drive: folder', () => {
  assert.equal(
    src('https://drive.google.com/drive/folders/1AbCdEf?usp=sharing'),
    'https://drive.google.com/embeddedfolderview?id=1AbCdEf#list',
  )
  assert.equal(
    src('https://drive.google.com/drive/u/0/folders/1AbCdEf'),
    'https://drive.google.com/embeddedfolderview?id=1AbCdEf#list',
  )
})

test('Google Docs, Sheets, Slides biasa', () => {
  assert.equal(src('https://docs.google.com/document/d/1AbC/edit?tab=t.0'), 'https://docs.google.com/document/d/1AbC/preview')
  assert.equal(src('https://docs.google.com/spreadsheets/d/1AbC/edit#gid=0'), 'https://docs.google.com/spreadsheets/d/1AbC/preview')
  assert.equal(src('https://docs.google.com/presentation/d/1AbC/edit'), 'https://docs.google.com/presentation/d/1AbC/embed')
})

test('Google Docs, Sheets, Slides yang diterbitkan ke web', () => {
  assert.equal(src('https://docs.google.com/document/d/e/2PACX-1v/pub'), 'https://docs.google.com/document/d/e/2PACX-1v/pub?embedded=true')
  assert.equal(src('https://docs.google.com/spreadsheets/d/e/2PACX-1v/pubhtml'), 'https://docs.google.com/spreadsheets/d/e/2PACX-1v/pubhtml?widget=true&headers=false')
})

test('Google Docs akun domain sekolah (/a/domain/)', () => {
  assert.equal(src('https://docs.google.com/a/sekolah.sch.id/document/d/1AbC/edit'), 'https://docs.google.com/document/d/1AbC/preview')
})

test('Google Form: hanya tautan publik yang bisa di-embed', () => {
  assert.equal(src('https://docs.google.com/forms/d/e/1FAIpQLSf/viewform'), 'https://docs.google.com/forms/d/e/1FAIpQLSf/viewform?embedded=true')
  assert.equal(toEmbed('https://docs.google.com/forms/d/1AbC/edit'), null)
  assert.equal(toEmbed('https://forms.gle/abc123'), null)
})

test('Apps Script web app (LKPD)', () => {
  const r = toEmbed('https://script.google.com/macros/s/AKfycbxExample-123/exec')
  assert.equal(r.src, 'https://script.google.com/macros/s/AKfycbxExample-123/exec')
  assert.equal(r.rasio, 'tinggi')
  assert.equal(toEmbed('https://script.google.com/home/projects/abc/edit'), null)
})

test('YouTube: watch, youtu.be, shorts, daftar putar', () => {
  assert.equal(src('https://www.youtube.com/watch?v=aqz-KE-bpKQ&t=30s'), 'https://www.youtube.com/embed/aqz-KE-bpKQ')
  assert.equal(src('https://youtu.be/aqz-KE-bpKQ?si=xyz'), 'https://www.youtube.com/embed/aqz-KE-bpKQ')
  assert.equal(src('https://m.youtube.com/shorts/aqz-KE-bpKQ'), 'https://www.youtube.com/embed/aqz-KE-bpKQ')
  assert.equal(src('https://www.youtube.com/playlist?list=PLabc123'), 'https://www.youtube.com/embed/videoseries?list=PLabc123')
  assert.equal(toEmbed('https://www.youtube.com/watch?v=pendek'), null)
})

test('rasio: video dan slide lebar, dokumen tinggi', () => {
  assert.equal(toEmbed('https://youtu.be/aqz-KE-bpKQ').rasio, 'lebar')
  assert.equal(toEmbed('https://docs.google.com/presentation/d/1AbC/edit').rasio, 'lebar')
  assert.equal(toEmbed('https://docs.google.com/document/d/1AbC/edit').rasio, 'tinggi')
})

test('situs lain tidak di-embed', () => {
  assert.equal(toEmbed('https://example.com/belajar'), null)
  assert.equal(toEmbed('https://www.canva.com/design/abc/view'), null)
})

test('keamanan: bukan https, skema berbahaya, dan host palsu ditolak', () => {
  assert.equal(toEmbed('http://drive.google.com/file/d/1AbC/view'), null)
  assert.equal(toEmbed('javascript:alert(1)'), null)
  assert.equal(toEmbed('data:text/html,<script>alert(1)</script>'), null)
  assert.equal(toEmbed('https://drive.google.com.evil.com/file/d/1AbC/view'), null)
  assert.equal(toEmbed('https://evil.com/drive.google.com/file/d/1AbC/view'), null)
  assert.equal(toEmbed('https://docs.google.com@evil.com/document/d/1AbC/edit'), null)
  assert.equal(toEmbed('bukan url'), null)
  assert.equal(toEmbed(''), null)
  assert.equal(toEmbed(null), null)
})

test('urlHttpsValid', () => {
  assert.equal(urlHttpsValid('https://example.com'), true)
  assert.equal(urlHttpsValid('  https://example.com  '), true)
  assert.equal(urlHttpsValid('http://example.com'), false)
  assert.equal(urlHttpsValid('javascript:alert(1)'), false)
  assert.equal(urlHttpsValid('https://exa mple.com'), false)
  assert.equal(urlHttpsValid(''), false)
})

test('web app Apps Script milik domain Workspace', () => {
  const r = toEmbed('https://script.google.com/a/macros/guru.smp.belajar.id/s/AKfycbyKd_3pp-x/exec')
  assert.equal(r.jenis, 'Web app Apps Script')
  assert.equal(r.src, 'https://script.google.com/a/macros/guru.smp.belajar.id/s/AKfycbyKd_3pp-x/exec')
  assert.equal(toEmbed('https://script.google.com/a/macros/evil.com/s/abc/dev'), null)
})