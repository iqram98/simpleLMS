// Bentuk data soal yang diterima fungsi simpan_soal, dari baris tabel soal dan soal_kunci.
export function payloadDariSoal(s, k) {
  return {
    type: s.type,
    prompt_rich: s.prompt_rich,
    prompt_text: s.prompt_text,
    options: s.options,
    points: s.points,
    config: s.config ?? {},
    kunci: k?.kunci,
    pembahasan_rich: k?.pembahasan_rich ?? null,
    pembahasan_text: k?.pembahasan_text ?? null,
  }
}

// Bentuk soal seperti yang diterima siswa dari mulai_ujian (tanpa kunci),
// dipakai untuk pratinjau guru. Daftar yang harus diacak ditampilkan terbalik.
export function soalSiswaDariBaris(s) {
  const opsi = (daftar) => (daftar ?? []).map((o) => ({ id: o.id, rich: o.rich }))
  const hasil = { id: s.id, type: s.type, prompt_rich: s.prompt_rich, points: s.points, options: opsi(s.options) }
  if (s.type === 'mengurutkan') hasil.options = hasil.options.slice().reverse()
  if (s.type === 'menjodohkan') hasil.kanan = opsi(s.config?.kanan).reverse()
  if (s.type === 'rumpang') hasil.rumpang = s.config?.rumpang
  if (s.type === 'survei_skala') {
    hasil.skala = { maks: 5, label_rendah: s.config?.label_rendah, label_tinggi: s.config?.label_tinggi }
  }
  return hasil
}