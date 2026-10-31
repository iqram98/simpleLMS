import { useMemo } from 'react'
import { KotakGalat, Memuat } from '../components/ui.jsx'
import { useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'
import { soalSiswaDariBaris } from './payload.js'
import PengerjaanUjian from './PengerjaanUjian.jsx'

// Pratinjau guru: soal tampil persis seperti layar siswa, tanpa kunci,
// tanpa percobaan, dan tanpa menyimpan jawaban.
export default function PratinjauSoal({ pelajaranId, onTutup }) {
  const { data, error, memuat } = useMuat(
    async () =>
      ambil(
        await supabase
          .from('soal')
          .select('id,type,position,prompt_rich,options,points,config')
          .eq('lesson_id', pelajaranId)
          .order('position'),
      ),
    [pelajaranId],
  )
  const paket = useMemo(
    () =>
      data
        ? {
            percobaan_id: null,
            soal: data.map(soalSiswaDariBaris),
            jawaban: {},
            batas_pada: null,
            sekarang: new Date().toISOString(),
          }
        : null,
    [data],
  )
  if (memuat && !data) return <Memuat />
  if (error) return <KotakGalat galat={pesanError(error)} />
  if (paket.soal.length === 0) {
    return (
      <p className="info baris sebar">
        <span>Ujian ini belum punya soal.</span>
        <button type="button" className="btn kecil" onClick={onTutup}>
          Kembali
        </button>
      </p>
    )
  }
  return <PengerjaanUjian pratinjau data={paket} onSelesai={onTutup} />
}