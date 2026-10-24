// Mengubah teks yang ditempel guru menjadi daftar soal siap simpan.
//
// Format (soal dipisah baris kosong, nomor di awal boleh ada atau tidak):
//   1. Ibu kota Indonesia adalah
//   A. Bandung
//   B. Jakarta
//   Jawaban: B
//   Poin: 2                 (boleh dihilangkan, bawaan 1)
//   Pembahasan: ...          (boleh dihilangkan)
// Satu huruf jawaban = pilihan ganda, beberapa huruf (A, C) = pilihan ganda kompleks.
// Tanpa pilihan: jawaban Benar/Salah = benar atau salah, selain itu isian singkat
// (beberapa jawaban diterima dipisah tanda |).

export const MAKS_TEMPEL = 100

const dokDariTeks = (teks) => ({
  type: 'doc',
  content: teks
    .split('\n')
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => ({ type: 'paragraph', content: [{ type: 'text', text: b }] })),
})

const RE_OPSI = /^([A-Ha-h])[.)]\s+(.+)$/
const RE_JAWABAN = /^(?:jawaban|kunci)\s*:\s*(.*)$/i
const RE_POIN = /^poin\s*:\s*(.*)$/i
const RE_BAHAS = /^pembahasan\s*:\s*(.*)$/i
const RE_NOMOR = /^\d{1,3}[.)]\s+/

function ubahBlok(baris) {
  const soal = []
  const opsi = []
  const bahas = []
  let jawaban = null
  let poinTeks = null
  let mode = 'soal'
  for (const b of baris) {
    let m
    if ((m = RE_JAWABAN.exec(b))) {
      jawaban = m[1].trim()
      mode = 'jawaban'
    } else if ((m = RE_POIN.exec(b))) {
      poinTeks = m[1].trim()
      mode = 'poin'
    } else if ((m = RE_BAHAS.exec(b))) {
      bahas.push(m[1].trim())
      mode = 'bahas'
    } else if (mode !== 'bahas' && (m = RE_OPSI.exec(b))) {
      opsi.push({ huruf: m[1].toLowerCase(), teks: m[2].trim() })
      mode = 'opsi'
    } else if (mode === 'soal') {
      soal.push(b)
    } else if (mode === 'bahas') {
      bahas.push(b)
    } else if (mode === 'opsi' && opsi.length) {
      opsi[opsi.length - 1].teks += ` ${b}`
    } else {
      return { galat: `Baris tidak dikenali: "${b.slice(0, 40)}"` }
    }
  }
  if (soal.length) soal[0] = soal[0].replace(RE_NOMOR, '')
  const teksSoal = soal.join('\n').trim()
  if (!teksSoal) return { galat: 'Teks soal kosong.' }
  if (jawaban == null || jawaban === '') return { galat: 'Baris "Jawaban:" tidak ada.' }

  let poin = 1
  if (poinTeks != null) {
    poin = Number(poinTeks.replace(',', '.'))
    if (!Number.isFinite(poin) || poin <= 0 || poin > 1000) return { galat: 'Poin harus lebih dari 0 dan paling banyak 1000.' }
  }

  const payload = {
    prompt_rich: dokDariTeks(teksSoal),
    prompt_text: teksSoal,
    points: poin,
    options: [],
    config: {},
    pembahasan_rich: bahas.join('\n').trim() ? dokDariTeks(bahas.join('\n')) : null,
    pembahasan_text: bahas.join('\n').trim() || null,
  }

  if (opsi.length) {
    if (opsi.length < 2) return { galat: 'Pilihan jawaban minimal dua.' }
    const huruf = opsi.map((o) => o.huruf)
    if (new Set(huruf).size !== huruf.length) return { galat: 'Huruf pilihan ganda berulang.' }
    const kunci = [
      ...new Set(
        jawaban
          .toLowerCase()
          .split(/[\s,;]+/)
          .filter(Boolean),
      ),
    ]
    if (!kunci.length || kunci.some((k) => !huruf.includes(k)))
      return { galat: `Jawaban "${jawaban}" tidak cocok dengan pilihan yang ada.` }
    payload.options = opsi.map((o) => ({ id: o.huruf, rich: dokDariTeks(o.teks), text: o.teks }))
    payload.kunci = { benar: kunci }
    if (kunci.length > 1) {
      payload.type = 'pilihan_kompleks'
      payload.config = { nilai_sebagian: false }
    } else {
      payload.type = 'pilihan_ganda'
    }
  } else if (/^(benar|salah)$/i.test(jawaban)) {
    payload.type = 'benar_salah'
    payload.kunci = { benar: [jawaban.toLowerCase()] }
  } else {
    const diterima = [
      ...new Set(
        jawaban
          .split('|')
          .map((x) => x.trim())
          .filter(Boolean),
      ),
    ]
    if (!diterima.length || diterima.some((x) => x.length > 200)) return { galat: 'Jawaban isian tidak valid.' }
    payload.type = 'isian_singkat'
    payload.kunci = { jawaban: diterima.slice(0, 20) }
  }
  return { payload }
}

// Hasil: [{ nomor, ringkas, payload } | { nomor, ringkas, galat }]
export function parseSoal(teks) {
  const baris = String(teks ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((b) => b.trim())
  const blok = []
  let sekarang = []
  for (const b of baris) {
    if (b === '') {
      if (sekarang.length) blok.push(sekarang)
      sekarang = []
    } else {
      sekarang.push(b)
    }
  }
  if (sekarang.length) blok.push(sekarang)
  return blok.map((isi, i) => ({
    nomor: i + 1,
    ringkas: isi[0].replace(RE_NOMOR, '').slice(0, 80),
    ...ubahBlok(isi),
  }))
}