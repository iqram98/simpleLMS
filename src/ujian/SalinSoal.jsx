import { useState } from 'react'
import { Kosong, KotakGalat, Memuat } from '../components/ui.jsx'
import { useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'
import { NAMA_TIPE } from './konstanta.js'
import { payloadDariSoal } from './payload.js'

// Menyalin soal dari ujian lain milik guru ke ujian ini.
export default function SalinSoal({ pelajaranId, onSelesai, onBatal }) {
  const [asal, setAsal] = useState('')
  const [dipilih, setDipilih] = useState(() => new Set())
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')

  const daftar = useMuat(async () => {
    const r = ambil(
      await supabase
        .from('lessons')
        .select('id,title,kind,modules!inner(title,courses!inner(title))')
        .eq('kind', 'ujian')
        .neq('id', pelajaranId)
        .order('title'),
    )
    return r
  }, [pelajaranId])

  const isi = useMuat(async () => {
    if (!asal) return { soal: [], kunci: {} }
    const [soal, kunci] = await Promise.all([
      supabase
        .from('soal')
        .select('id,type,position,prompt_rich,prompt_text,options,points,config')
        .eq('lesson_id', asal)
        .order('position'),
      supabase
        .from('soal_kunci')
        .select('soal_id,kunci,pembahasan_rich,pembahasan_text,soal!inner(lesson_id)')
        .eq('soal.lesson_id', asal),
    ])
    return { soal: ambil(soal), kunci: Object.fromEntries(ambil(kunci).map((k) => [k.soal_id, k])) }
  }, [asal])

  const ganti = (id) => {
    setAsal(id)
    setDipilih(new Set())
    setGalat('')
  }
  const soal = isi.data?.soal ?? []
  const semua = soal.length > 0 && dipilih.size === soal.length

  const salin = async () => {
    const urut = soal.filter((s) => dipilih.has(s.id))
    setSibuk(true)
    setGalat('')
    let jadi = 0
    try {
      for (const s of urut) {
        ambil(
          await supabase.rpc('simpan_soal', {
            pelajaran: pelajaranId,
            id_soal: null,
            data: payloadDariSoal(s, isi.data.kunci[s.id]),
          }),
        )
        jadi += 1
      }
      onSelesai(jadi)
    } catch (e) {
      setGalat(`${pesanError(e)} ${jadi} soal sudah tersalin sebelum berhenti.`)
      setSibuk(false)
      if (jadi > 0) onSelesai(jadi, true)
    }
  }

  return (
    <div className="blok-editor">
      <h3>Salin soal dari ujian lain</h3>
      {daftar.memuat && !daftar.data && <Memuat />}
      {daftar.error && <KotakGalat galat={pesanError(daftar.error)} />}
      {daftar.data && daftar.data.length === 0 && <Kosong>Belum ada ujian lain yang bisa dijadikan sumber.</Kosong>}
      {daftar.data && daftar.data.length > 0 && (
        <div className="kolom">
          <label htmlFor="salin-asal">Ujian sumber</label>
          <select id="salin-asal" value={asal} onChange={(e) => ganti(e.target.value)}>
            <option value="">Pilih ujian</option>
            {daftar.data.map((l) => (
              <option key={l.id} value={l.id}>
                {l.modules?.courses?.title} / {l.modules?.title} / {l.title}
              </option>
            ))}
          </select>
        </div>
      )}
      {asal && isi.memuat && !isi.data && <Memuat />}
      {asal && isi.data && soal.length === 0 && <Kosong>Ujian itu belum punya soal.</Kosong>}
      {soal.length > 0 && (
        <div className="kolom">
          <label className="baris rapat">
            <input
              type="checkbox"
              checked={semua}
              onChange={(e) => setDipilih(e.target.checked ? new Set(soal.map((s) => s.id)) : new Set())}
              style={{ width: 'auto', minHeight: 0 }}
            />
            <strong>Pilih semua ({soal.length} soal)</strong>
          </label>
          <ol className="daftar-soal">
            {soal.map((s, i) => (
              <li key={s.id} className="soal-item">
                <label className="baris rapat">
                  <input
                    type="checkbox"
                    checked={dipilih.has(s.id)}
                    onChange={(e) => {
                      const baru = new Set(dipilih)
                      if (e.target.checked) baru.add(s.id)
                      else baru.delete(s.id)
                      setDipilih(baru)
                    }}
                    style={{ width: 'auto', minHeight: 0 }}
                  />
                  <strong>{i + 1}.</strong>
                  <span className="lencana">{NAMA_TIPE[s.type] ?? s.type}</span>
                  <span className="petunjuk">{Number(s.points)} poin</span>
                </label>
                <div>{s.prompt_text.slice(0, 140)}</div>
              </li>
            ))}
          </ol>
        </div>
      )}
      <KotakGalat galat={galat} />
      <div className="baris">
        <button type="button" className="btn utama" disabled={sibuk || dipilih.size === 0} onClick={salin}>
          {dipilih.size ? `Salin ${dipilih.size} soal` : 'Salin soal'}
        </button>
        <button type="button" className="btn" disabled={sibuk} onClick={onBatal}>
          Batal
        </button>
      </div>
    </div>
  )
}