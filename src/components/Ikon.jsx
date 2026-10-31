// Ikon garis sederhana (24x24). Dekoratif: arti tombol diberikan lewat label.
const JALUR = {
  rumah: ['M3 11.5 12 4l9 7.5', 'M5 10v10h5v-6h4v6h5V10'],
  lipatPanel: ['M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'M9 4v16', 'm16 9-3 3 3 3'],
  bukaPanel: ['M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'M9 4v16', 'm14 9 3 3-3 3'],
  tambah: ['M12 5v14', 'M5 12h14'],
  mata: ['M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'],
  pensil: ['M4 20h4L19 9l-4-4L4 16v4Z', 'm13.5 6.5 4 4'],
  muat: ['M21 12a9 9 0 1 1-3-6.7', 'M21 4v5h-5'],
  salin: ['M11 9h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z', 'M5 15V6a2 2 0 0 1 2-2h9'],
  buku: ['M4 19.5V5a2 2 0 0 1 2-2h14v15H6.5A2.5 2.5 0 0 0 4 20.5', 'M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-4'],
  forum: ['M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z'],
  cek: ['m5 12 5 5 9-10'],
  bukaSemua: ['m7 15 5 5 5-5', 'm7 9 5-5 5 5'],
  tutupSemua: ['m7 20 5-5 5 5', 'm7 4 5 5 5-5'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  tutup: ['M6 6l12 12', 'M18 6 6 18'],
}

export default function Ikon({ nama, ukuran = 18 }) {
  return (
    <svg
      className="ikon-svg"
      width={ukuran}
      height={ukuran}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {(JALUR[nama] ?? []).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

// Tombol hanya ikon. `label` wajib: dipakai sebagai nama untuk pembaca layar dan tooltip.
export function TombolIkon({ ikon, label, kelas = '', ...sisa }) {
  return (
    <button type="button" className={`btn kecil ikon ${kelas}`.trim()} aria-label={label} title={label} {...sisa}>
      <Ikon nama={ikon} />
    </button>
  )
}

// Tautan hanya ikon (misalnya "Beranda").
export function TautanIkon({ ikon, label, kelas = '', komponen: Komponen, ...sisa }) {
  return (
    <Komponen className={`btn kecil ikon ${kelas}`.trim()} aria-label={label} title={label} {...sisa}>
      <Ikon nama={ikon} />
    </Komponen>
  )
}