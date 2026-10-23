// Perhitungan untuk halaman hasil guru. Murni (tanpa akses jaringan) agar mudah diuji.

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
    let status = 'belum'
    if (selesai.length > 0) status = Number(akhir) >= Number(kkm) ? 'lulus' : 'belum_lulus'
    else if (berjalan) status = 'berjalan'
    return {
      ...s,
      selesai,
      berjalan,
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
      if (!h) continue
      n += 1
      if (h.benar) benar += 1
      jumlahPoin += Number(h.poin) || 0
      const j = p.jawaban?.[s.id]
      const dipilih = Array.isArray(j) ? j : typeof j === 'string' && j.trim() !== '' && s.type !== 'isian_singkat' ? [j] : []
      if (s.type === 'isian_singkat') {
        if (typeof j !== 'string' || j.trim() === '') kosong += 1
      } else if (dipilih.length === 0) {
        kosong += 1
      }
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
      opsi: (s.options ?? []).map((o) => ({
        id: o.id,
        teks: o.text ?? '',
        dipilih: pilih[o.id] ?? 0,
        kunci: kunciBenar.has(o.id),
      })),
    }
  })
}