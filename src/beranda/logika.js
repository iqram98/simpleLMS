// Logika murni untuk beranda: pelajaran berikutnya, tenggat, dan pengelompokan tindakan guru.

// Pelajaran terbit pertama yang belum selesai (urut modul lalu pelajaran). Null bila semua selesai.
export function pelajaranBerikut(modul, selesai) {
  for (const m of modul) {
    for (const l of m.lessons ?? []) {
      if (l.is_published && !selesai.has(l.id)) return { ...l, modul: m.title }
    }
  }
  return null
}

export function hitungPelajaran(modul) {
  return modul.reduce((n, m) => n + (m.lessons ?? []).filter((l) => l.is_published).length, 0)
}

const JAM = 3600 * 1000
const HARI = 24 * JAM

// Label tenggat: "Terlewat 2 hari", "Hari ini 14.00", "Besok", "5 hari lagi". `mendesak` bila kurang dari 48 jam atau lewat.
export function labelTenggat(iso, sekarang = Date.now()) {
  const t = new Date(iso).getTime()
  const selisih = t - sekarang
  const jam = new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  if (selisih < 0) {
    const lalu = -selisih
    const teks =
      lalu < JAM
        ? 'baru saja lewat'
        : lalu < HARI
          ? `lewat ${Math.floor(lalu / JAM)} jam`
          : `lewat ${Math.floor(lalu / HARI)} hari`
    return { teks, mendesak: true, lewat: true }
  }
  const hariIni = new Date(sekarang).toDateString() === new Date(t).toDateString()
  const besok = new Date(sekarang + HARI).toDateString() === new Date(t).toDateString()
  if (hariIni) return { teks: `hari ini ${jam}`, mendesak: true, lewat: false }
  if (besok) return { teks: `besok ${jam}`, mendesak: true, lewat: false }
  const hari = Math.ceil(selisih / HARI)
  return { teks: `${hari} hari lagi`, mendesak: selisih < 2 * HARI, lewat: false }
}

// Item tenggat siswa: tugas yang belum dikirim dan ujian yang belum selesai. Tenggat yang sudah lewat lebih dari
// `maksLewatHari` hari dan sudah tidak menerima kiriman disembunyikan. Urut dari yang paling dekat.
export function susunTenggat({ tugas, ujian, selesai, pelajaran, sekarang = Date.now(), batasHari = 14, maksLewatHari = 7 }) {
  const item = []
  for (const t of tugas) {
    const l = pelajaran.get(t.lesson_id)
    if (!l || !t.tenggat || selesai.has(t.lesson_id)) continue
    const waktu = new Date(t.tenggat).getTime()
    const lewat = waktu < sekarang
    if (lewat && !t.terima_terlambat) continue
    if (lewat && sekarang - waktu > maksLewatHari * HARI) continue
    if (!lewat && waktu - sekarang > batasHari * HARI) continue
    item.push({ jenis: 'tugas', lessonId: t.lesson_id, judul: l.title, kursusId: l.kursusId, waktu: t.tenggat })
  }
  for (const u of ujian) {
    const l = pelajaran.get(u.lesson_id)
    if (!l || !u.tutup_pada || selesai.has(u.lesson_id)) continue
    const waktu = new Date(u.tutup_pada).getTime()
    if (waktu < sekarang) continue
    if (waktu - sekarang > batasHari * HARI) continue
    item.push({ jenis: 'ujian', lessonId: u.lesson_id, judul: l.title, kursusId: l.kursusId, waktu: u.tutup_pada })
  }
  return item.sort((a, b) => new Date(a.waktu) - new Date(b.waktu))
}

// Mengelompokkan baris menjadi { kunci, judul, jumlah } untuk panel "perlu ditindaklanjuti".
export function kelompokkan(baris, kunciDari, judulDari) {
  const peta = new Map()
  for (const b of baris) {
    const k = kunciDari(b)
    if (!peta.has(k)) peta.set(k, { kunci: k, judul: judulDari(b), jumlah: 0, contoh: b })
    peta.get(k).jumlah += 1
  }
  return [...peta.values()].sort((a, b) => b.jumlah - a.jumlah || a.judul.localeCompare(b.judul, 'id'))
}