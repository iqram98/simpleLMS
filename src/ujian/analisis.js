// Perhitungan untuk halaman hasil guru. Murni (tanpa akses jaringan) agar mudah diuji.

const SURVEI = ['survei_pilihan', 'survei_skala', 'survei_teks']
const BERPILIHAN = ['pilihan_ganda', 'benar_salah', 'pilihan_kompleks']

// Apakah jawaban (bentuk apa pun) berisi sesuatu.
export function terisi(j) {
  if (Array.isArray(j)) return j.length > 0
  if (typeof j === 'string') return j.trim() !== ''
  if (j && typeof j === 'object') return Object.values(j).some((x) => typeof x === 'string' && x.trim() !== '')
  return j != null
}

const bulat = (n) => Math.round(Number(n) * 100) / 100

// Satu baris per siswa aktif: nilai tiap percobaan, nilai akhir, dan status.
// percobaan: [{user_id, nomor, status, nilai}], nilaiAkhir: {user_id: angka|null}
export function barisSiswa({ siswa, percobaan, nilaiAkhir, kkm, maks }) {
  const per = new Map()
  for (const p of percobaan) {
    if (!per.has(p.user_id)) per.set(p.user_id, [])
    per.get(p.user_id).push(p)
  }
  return siswa.map((s) => {
    const daftar = (per.get(s.user_id) ?? []).slice().sort((a, b) => a.nomor - b.nomor)
    const selesai = daftar.filter((p) => p.status === 'selesai')
    const berjalan = daftar.some((p) => p.status === 'berjalan')
    const akhir = nilaiAkhir[s.user_id] ?? null
    const menunggu = selesai.some((p) => p.perlu_dinilai)
    let status = 'belum'
    if (selesai.length > 0) {
      if (akhir != null) status = Number(akhir) >= Number(kkm) ? 'lulus' : 'belum_lulus'
      else status = menunggu ? 'menunggu' : 'terkirim'
    } else if (berjalan) status = 'berjalan'
    return {
      ...s,
      selesai,
      berjalan,
      menunggu,
      nilai: akhir == null ? null : bulat(akhir),
      status,
      sisa: Math.max(0, maks - daftar.length),
    }
  })
}

export function ringkasan(baris) {
  const dikerjakan = baris.filter((b) => b.selesai.length > 0)
  const nilai = dikerjakan.map((b) => Number(b.nilai)).filter(Number.isFinite)
  return {
    jumlah: baris.length,
    dikerjakan: dikerjakan.length,
    belum: baris.length - dikerjakan.length,
    lulus: baris.filter((b) => b.status === 'lulus').length,
    menunggu: baris.filter((b) => b.menunggu).length,
    rata: nilai.length ? bulat(nilai.reduce((a, b) => a + b, 0) / nilai.length) : null,
    tertinggi: nilai.length ? Math.max(...nilai) : null,
    terendah: nilai.length ? Math.min(...nilai) : null,
  }
}

export function tingkat(persen) {
  if (persen == null) return '-'
  if (persen >= 80) return 'Mudah'
  if (persen >= 40) return 'Sedang'
  return 'Sulit'
}

// Analisis butir soal dari percobaan yang sudah dikumpulkan.
// soal: [{id,type,position,prompt_text,options,points}], kunci: {soalId: {benar:[...]|jawaban:[...]}}
// percobaan: [{id, jawaban}] (hanya yang selesai), hasil: {percobaanId: {soalId: {poin, benar}}}
export function analisisButir({ soal, kunci, percobaan, hasil }) {
  return soal.map((s) => {
    let n = 0
    let benar = 0
    let jumlahPoin = 0
    let kosong = 0
    const pilih = {}
    for (const p of percobaan) {
      const h = hasil[p.id]?.[s.id]
      if (!h || h.menunggu || h.survei) continue
      n += 1
      if (h.benar) benar += 1
      jumlahPoin += Number(h.poin) || 0
      const j = p.jawaban?.[s.id]
      if (!BERPILIHAN.includes(s.type)) {
        if (!terisi(j)) kosong += 1
        continue
      }
      const dipilih = Array.isArray(j) ? j : typeof j === 'string' && j.trim() !== '' ? [j] : []
      if (dipilih.length === 0) kosong += 1
      for (const id of dipilih) pilih[id] = (pilih[id] ?? 0) + 1
    }
    const persen = n ? Math.round((100 * benar) / n) : null
    const kunciBenar = new Set(kunci[s.id]?.benar ?? [])
    return {
      soal: s,
      n,
      benar,
      persen,
      tingkat: tingkat(persen),
      rataPoin: n ? bulat(jumlahPoin / n) : null,
      kosong,
      opsi: (BERPILIHAN.includes(s.type) ? (s.options ?? []) : []).map((o) => ({
        id: o.id,
        teks: o.text ?? '',
        dipilih: pilih[o.id] ?? 0,
        kunci: kunciBenar.has(o.id),
      })),
    }
  })
}

// Rekap soal survei dari jawaban terakhir tiap siswa.
// percobaan: [{user_id, nomor, status, jawaban}], nama: {user_id: nama}
export function rekapSurvei({ soal, percobaan, nama }) {
  const terakhir = new Map()
  for (const p of percobaan) {
    if (p.status !== 'selesai') continue
    const lama = terakhir.get(p.user_id)
    if (!lama || p.nomor > lama.nomor) terakhir.set(p.user_id, p)
  }
  const jawabanSiswa = [...terakhir.values()]
  return soal
    .filter((x) => SURVEI.includes(x.type))
    .map((x) => {
      const semua = jawabanSiswa.map((p) => ({ user_id: p.user_id, nilai: p.jawaban?.[x.id] }))
      if (x.type === 'survei_pilihan') {
        const hitung = {}
        let n = 0
        for (const j of semua) {
          if (typeof j.nilai !== 'string') continue
          hitung[j.nilai] = (hitung[j.nilai] ?? 0) + 1
          n += 1
        }
        return {
          soal: x,
          n,
          tanggapan: jawabanSiswa.length,
          opsi: (x.options ?? []).map((o) => ({ id: o.id, teks: o.text ?? '', jumlah: hitung[o.id] ?? 0 })),
        }
      }
      if (x.type === 'survei_skala') {
        const sebaran = [0, 0, 0, 0, 0]
        let jumlah = 0
        let n = 0
        for (const j of semua) {
          const v = Number(j.nilai)
          if (!Number.isInteger(v) || v < 1 || v > 5) continue
          sebaran[v - 1] += 1
          jumlah += v
          n += 1
        }
        return { soal: x, n, tanggapan: jawabanSiswa.length, sebaran, rata: n ? bulat(jumlah / n) : null }
      }
      const teks = semua
        .filter((j) => typeof j.nilai === 'string' && j.nilai.trim() !== '')
        .map((j) => ({ nama: nama[j.user_id] ?? '', teks: j.nilai.trim() }))
      return { soal: x, n: teks.length, tanggapan: jawabanSiswa.length, teks }
    })
}

export const adalahJenisSurvei = (t) => SURVEI.includes(t)