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

export default function PengaturanTugas({ pelajaranId, kursusId }) {
  const { data, error, memuat } = useMuat(async () => {
    const [st, sets, kiriman] = await Promise.all([
      supabase
        .from('tugas_pengaturan')
        .select('tenggat,terima_terlambat,kirim_ulang,nilai_maks,maks_tautan,kelompok_set_id')
        .eq('lesson_id', pelajaranId)
        .single(),
      supabase.rpc('daftar_set_kelompok', { kursus: kursusId }),
      supabase.from('pengumpulan_tugas').select('id', { count: 'exact', head: true }).eq('lesson_id', pelajaranId),
    ])
    return { ...ambil(st), sets: ambil(sets) ?? [], adaKiriman: (kiriman.count ?? 0) > 0 }
  }, [pelajaranId, kursusId])
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
    kelompok: awal.kelompok_set_id ?? '',
    mode: awal.kelompok_set_id ? 'kelompok' : 'individu',
  })
  const set = (k) => (e) => {
    setTersimpan(false)
    setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  }
  const jenis = f.mode
  const simpan = (e) => {
    e.preventDefault()
    const nilaiMaks = Number(f.nilaiMaks)
    const maksTautan = Number(f.maksTautan)
    if (!Number.isInteger(nilaiMaks) || nilaiMaks < 1 || nilaiMaks > 1000) return setGalat('Nilai maksimum harus 1 sampai 1000.')
    if (!Number.isInteger(maksTautan) || maksTautan < 1 || maksTautan > 10) return setGalat('Jumlah tautan harus 1 sampai 10.')
    if (jenis === 'kelompok' && !f.kelompok) return setGalat('Pilih set kelompok untuk tugas ini.')
    return jalankan(async () => {
      if ((f.kelompok || null) !== (awal.kelompok_set_id ?? null)) {
        ambil(await supabase.rpc('atur_tugas_kelompok', { pelajaran: pelajaranId, id_set: f.kelompok || null }))
      }
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
      <fieldset className="pilihan-soal" disabled={awal.adaKiriman}>
        <legend>Jenis tugas</legend>
        <label>
          <input
            type="radio"
            name="tg-jenis"
            checked={f.mode === 'individu'}
            onChange={() => {
              setTersimpan(false)
              setF({ ...f, mode: 'individu', kelompok: '' })
            }}
          />
          Individu (setiap siswa mengumpulkan sendiri)
        </label>
        <label>
          <input
            type="radio"
            name="tg-jenis"
            checked={f.mode === 'kelompok'}
            onChange={() => {
              setTersimpan(false)
              setF({ ...f, mode: 'kelompok' })
            }}
          />
          Kelompok (satu perwakilan mengumpulkan untuk seluruh anggota)
        </label>
        {f.mode === 'kelompok' && (
          <div className="kolom">
            <label htmlFor="tg-set">Set kelompok</label>
            <select id="tg-set" value={f.kelompok} onChange={set('kelompok')}>
              <option value="">Pilih set…</option>
              {awal.sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} ({s.jumlah_kelompok} kelompok)
                </option>
              ))}
            </select>
            {awal.sets.length === 0 && <span className="petunjuk">Belum ada set. Buat dulu di halaman Ringkasan kursus.</span>}
          </div>
        )}
        {awal.adaKiriman && <span className="petunjuk">Jenis tugas dikunci karena sudah ada kiriman.</span>}
      </fieldset>
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