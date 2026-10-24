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