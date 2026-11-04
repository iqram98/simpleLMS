import test from 'node:test'
import assert from 'node:assert/strict'
import { bagikanPublik, cariAtauBuatFolder, GalatDrive } from './api.js'

const jawab = (status, isi) => ({ ok: status < 300, status, json: async () => isi })

test('cariAtauBuatFolder memakai folder yang sudah ada', async () => {
  const panggilan = []
  const kirim = async (url, opsi) => {
    panggilan.push([url, opsi])
    return jawab(200, { files: [{ id: 'FOLDER1234567', name: 'x' }] })
  }
  assert.equal(await cariAtauBuatFolder('tok', "Kelas O'Brien – File Materi", kirim), 'FOLDER1234567')
  assert.equal(panggilan.length, 1)
  assert.ok(decodeURIComponent(panggilan[0][0]).includes("O\\'Brien"))
  assert.equal(panggilan[0][1].headers.Authorization, 'Bearer tok')
})

test('cariAtauBuatFolder membuat folder bila belum ada', async () => {
  const urutan = []
  const kirim = async (url, opsi) => {
    urutan.push(opsi?.method ?? 'GET')
    return urutan.length === 1 ? jawab(200, { files: [] }) : jawab(200, { id: 'BARU12345678' })
  }
  assert.equal(await cariAtauBuatFolder('tok', 'Folder', kirim), 'BARU12345678')
  assert.deepEqual(urutan, ['GET', 'POST'])
})

test('galat 401, kuota penuh, dan id tidak sah dikenali', async () => {
  await assert.rejects(
    () => cariAtauBuatFolder('tok', 'F', async () => jawab(401, {})),
    (e) => e instanceof GalatDrive && e.status === 401,
  )
  await assert.rejects(
    () => cariAtauBuatFolder('tok', 'F', async () => jawab(403, { error: { message: 'The user has exceeded storage quota' } })),
    /penuh/,
  )
  await assert.rejects(
    () =>
      cariAtauBuatFolder('tok', 'F', async (u, o) =>
        o?.method === 'POST' ? jawab(200, { id: "x'y" }) : jawab(200, { files: [] }),
      ),
    /tidak mengembalikan/,
  )
})

test('bagikanPublik: izin pembaca untuk siapa saja, tanpa masuk pencarian', async () => {
  let kirimanBody
  await bagikanPublik('tok', 'FILE1234567890', async (url, o) => {
    kirimanBody = JSON.parse(o.body)
    assert.ok(url.includes('/files/FILE1234567890/permissions'))
    return jawab(200, { id: 'p' })
  })
  assert.deepEqual(kirimanBody, { role: 'reader', type: 'anyone', allowFileDiscovery: false })
  await assert.rejects(() => bagikanPublik('tok', 'a b'), GalatDrive)
})