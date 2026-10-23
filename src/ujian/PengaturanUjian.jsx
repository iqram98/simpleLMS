import { useState } from 'react'
import { KotakGalat, Memuat } from '../components/ui.jsx'
import { useAksi, useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'
import { ATURAN_NILAI, PEMBAHASAN } from './konstanta.js'

// ISO (UTC) <-> nilai input datetime-local (waktu setempat peramban).
const keLokal = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const dua = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}T${dua(d.getHours())}:${dua(d.getMinutes())}`
}
const keIso = (lokal) => (lokal ? new Date(lokal).toISOString() : null)

export default function PengaturanUjian({ pelajaranId }) {
  const { data, error, memuat } = useMuat(
    async () =>
      ambil(
        await supabase
          .from('ujian_pengaturan')
          .select(
            'durasi_menit,maks_percobaan,kkm,aturan_nilai,wajib_lulus,acak_soal,acak_pilihan,buka_pada,tutup_pada,pembahasan',
          )
          .eq('lesson_id', pelajaranId)
          .single(),
      ),
    [pelajaranId],
  )
  if (memuat && !data) return <Memuat />
  if (error) return <KotakGalat galat={pesanError(error)} />
  return <Formulir key={pelajaranId} awal={data} pelajaranId={pelajaranId} />
}

function Formulir({ awal, pelajaranId }) {
  const { sibuk, galat, setGalat, jalankan } = useAksi()
  const [tersimpan, setTersimpan] = useState(false)
  const [f, setF] = useState({
    batas: awal.durasi_menit != null,
    durasi: String(awal.durasi_menit ?? 60),
    maks: String(awal.maks_percobaan),
    kkm: String(Number(awal.kkm)),
    aturan: awal.aturan_nilai,
    wajib: awal.wajib_lulus,
    acakSoal: awal.acak_soal,
    acakPilihan: awal.acak_pilihan,
    buka: keLokal(awal.buka_pada),
    tutup: keLokal(awal.tutup_pada),
    bahas: awal.pembahasan,
  })
  const set = (k) => (e) => {
    setTersimpan(false)
    setF({
      ...f,
      [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    })
  }

  const simpan = (e) => {
    e.preventDefault()
    const durasi = f.batas ? Number(f.durasi) : null
    const kkm = Number(String(f.kkm).replace(',', '.'))
    if (f.batas && (!Number.isInteger(durasi) || durasi < 1 || durasi > 600)) return setGalat('Durasi harus 1 sampai 600 menit.')
    if (!Number.isFinite(kkm) || kkm < 0 || kkm > 100) return setGalat('KKM harus antara 0 dan 100.')
    if (f.buka && f.tutup && new Date(f.tutup) <= new Date(f.buka)) return setGalat('Waktu tutup harus setelah waktu buka.')
    return jalankan(async () => {
      ambil(
        await supabase
          .from('ujian_pengaturan')
          .update({
            durasi_menit: durasi,
            maks_percobaan: Number(f.maks),
            kkm,
            aturan_nilai: f.aturan,
            wajib_lulus: f.wajib,
            acak_soal: f.acakSoal,
            acak_pilihan: f.acakPilihan,
            buka_pada: keIso(f.buka),
            tutup_pada: keIso(f.tutup),
            pembahasan: f.bahas,
          })
          .eq('lesson_id', pelajaranId)
          .select('lesson_id'),
      )
      setTersimpan(true)
    })
  }

  const aturan = ATURAN_NILAI.find((a) => a.nilai === f.aturan)
  return (
    <form className="blok-editor" onSubmit={simpan}>
      <h3>Pengaturan ujian</h3>
      <div className="form-baris">
        <div className="kolom">
          <label htmlFor="uj-maks">Jumlah percobaan</label>
          <select id="uj-maks" value={f.maks} onChange={set('maks')}>
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n} kali
              </option>
            ))}
          </select>
        </div>
        <div className="kolom">
          <label htmlFor="uj-kkm">KKM (0 sampai 100)</label>
          <input id="uj-kkm" inputMode="decimal" value={f.kkm} onChange={set('kkm')} />
        </div>
      </div>

      <div className="kolom">
        <label className="baris rapat">
          <input type="checkbox" checked={f.batas} onChange={set('batas')} style={{ width: 'auto', minHeight: 0 }} />
          Batasi waktu mengerjakan
        </label>
        {f.batas && (
          <>
            <label htmlFor="uj-durasi">Durasi (menit)</label>
            <input id="uj-durasi" type="number" inputMode="numeric" min={1} max={600} value={f.durasi} onChange={set('durasi')} />
          </>
        )}
      </div>

      <div className="kolom">
        <label htmlFor="uj-aturan">Cara menentukan nilai akhir bila mengulang</label>
        <select id="uj-aturan" value={f.aturan} onChange={set('aturan')}>
          {ATURAN_NILAI.map((a) => (
            <option key={a.nilai} value={a.nilai}>
              {a.label}
            </option>
          ))}
        </select>
        <span className="petunjuk">{aturan?.ket}</span>
      </div>

      <div className="form-baris">
        <div className="kolom">
          <label htmlFor="uj-buka">Dibuka pada (boleh kosong)</label>
          <input id="uj-buka" type="datetime-local" value={f.buka} onChange={set('buka')} />
        </div>
        <div className="kolom">
          <label htmlFor="uj-tutup">Ditutup pada (boleh kosong)</label>
          <input id="uj-tutup" type="datetime-local" value={f.tutup} onChange={set('tutup')} />
        </div>
      </div>
      <span className="petunjuk">Waktu mengikuti zona waktu perangkat Anda.</span>

      <fieldset className="pilihan-soal">
        <legend>Pilihan lain</legend>
        <label className="baris rapat">
          <input type="checkbox" checked={f.wajib} onChange={set('wajib')} style={{ width: 'auto', minHeight: 0 }} />
          Siswa harus lulus (mencapai KKM) agar pelajaran ini dianggap selesai
        </label>
        <label className="baris rapat">
          <input type="checkbox" checked={f.acakSoal} onChange={set('acakSoal')} style={{ width: 'auto', minHeight: 0 }} />
          Acak urutan soal
        </label>
        <label className="baris rapat">
          <input type="checkbox" checked={f.acakPilihan} onChange={set('acakPilihan')} style={{ width: 'auto', minHeight: 0 }} />
          Acak urutan pilihan jawaban
        </label>
      </fieldset>

      <div className="kolom">
        <label htmlFor="uj-bahas">Kunci dan pembahasan untuk siswa</label>
        <select id="uj-bahas" value={f.bahas} onChange={set('bahas')}>
          {PEMBAHASAN.map((p) => (
            <option key={p.nilai} value={p.nilai}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <KotakGalat galat={galat} onTutup={() => setGalat('')} />
      <div className="baris">
        <button type="submit" className="btn utama" disabled={sibuk}>
          Simpan pengaturan
        </button>
        {tersimpan && (
          <span role="status" className="petunjuk">
            Tersimpan.
          </span>
        )}
      </div>
    </form>
  )
}