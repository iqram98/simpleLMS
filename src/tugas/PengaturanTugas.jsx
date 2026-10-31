import { useState } from 'react'
import { KotakGalat, Memuat } from '../components/ui.jsx'
import { useAksi, useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'

const keLokal = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const dua = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}T${dua(d.getHours())}:${dua(d.getMinutes())}`
}

export default function PengaturanTugas({ pelajaranId }) {
  const { data, error, memuat } = useMuat(
    async () =>
      ambil(
        await supabase
          .from('tugas_pengaturan')
          .select('tenggat,terima_terlambat,kirim_ulang,nilai_maks,maks_tautan')
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
    tenggat: keLokal(awal.tenggat),
    terlambat: awal.terima_terlambat,
    ulang: awal.kirim_ulang,
    nilaiMaks: String(awal.nilai_maks),
    maksTautan: String(awal.maks_tautan),
  })
  const set = (k) => (e) => {
    setTersimpan(false)
    setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  }
  const simpan = (e) => {
    e.preventDefault()
    const nilaiMaks = Number(f.nilaiMaks)
    const maksTautan = Number(f.maksTautan)
    if (!Number.isInteger(nilaiMaks) || nilaiMaks < 1 || nilaiMaks > 1000) return setGalat('Nilai maksimum harus 1 sampai 1000.')
    if (!Number.isInteger(maksTautan) || maksTautan < 1 || maksTautan > 10) return setGalat('Jumlah tautan harus 1 sampai 10.')
    return jalankan(async () => {
      ambil(
        await supabase
          .from('tugas_pengaturan')
          .update({
            tenggat: f.tenggat ? new Date(f.tenggat).toISOString() : null,
            terima_terlambat: f.terlambat,
            kirim_ulang: f.ulang,
            nilai_maks: nilaiMaks,
            maks_tautan: maksTautan,
          })
          .eq('lesson_id', pelajaranId)
          .select('lesson_id'),
      )
      setTersimpan(true)
    })
  }
  return (
    <form className="blok-editor" onSubmit={simpan}>
      <h3>Pengaturan tugas</h3>
      <div className="kolom">
        <label htmlFor="tg-tenggat">Tenggat (boleh kosong)</label>
        <input id="tg-tenggat" type="datetime-local" value={f.tenggat} onChange={set('tenggat')} />
        <span className="petunjuk">Waktu mengikuti zona waktu perangkat Anda.</span>
      </div>
      <div className="form-baris">
        <div className="kolom">
          <label htmlFor="tg-nilai">Nilai maksimum</label>
          <input
            id="tg-nilai"
            type="number"
            inputMode="numeric"
            min={1}
            max={1000}
            value={f.nilaiMaks}
            onChange={set('nilaiMaks')}
          />
        </div>
        <div className="kolom">
          <label htmlFor="tg-tautan">Jumlah tautan maksimum</label>
          <input
            id="tg-tautan"
            type="number"
            inputMode="numeric"
            min={1}
            max={10}
            value={f.maksTautan}
            onChange={set('maksTautan')}
          />
        </div>
      </div>
      <fieldset className="pilihan-soal">
        <legend>Pilihan lain</legend>
        <label>
          <input type="checkbox" checked={f.terlambat} onChange={set('terlambat')} />
          Terima kiriman setelah tenggat (ditandai terlambat)
        </label>
        <label>
          <input type="checkbox" checked={f.ulang} onChange={set('ulang')} />
          Siswa boleh mengirim ulang (kiriman baru menggantikan yang lama dan perlu dinilai ulang)
        </label>
      </fieldset>
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