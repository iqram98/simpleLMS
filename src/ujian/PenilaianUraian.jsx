import { useState } from 'react'
import { KotakGalat, Memuat } from '../components/ui.jsx'
import { useAksi, useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'
import Teks from './Teks.jsx'

const angka = (n) => (n == null ? '-' : String(Math.round(Number(n) * 100) / 100).replace('.', ','))

// Guru menilai jawaban uraian: pilih percobaan, beri poin dan komentar per soal.
export default function PenilaianUraian({ pelajaranId, onUbah }) {
  const [pilih, setPilih] = useState(null)
  const [semua, setSemua] = useState(false)

  const { data, error, memuat, muatUlang } = useMuat(async () => {
    const [uraian, kunci, perc] = await Promise.all([
      supabase
        .from('soal')
        .select('id,position,prompt_rich,points')
        .eq('lesson_id', pelajaranId)
        .eq('type', 'uraian')
        .order('position'),
      supabase
        .from('soal_kunci')
        .select('soal_id,pembahasan_rich,soal!inner(lesson_id,type)')
        .eq('soal.lesson_id', pelajaranId)
        .eq('soal.type', 'uraian'),
      supabase
        .from('percobaan')
        .select('id,nomor,user_id,jawaban,perlu_dinilai,selesai_pada,profiles(full_name,email)')
        .eq('lesson_id', pelajaranId)
        .eq('status', 'selesai')
        .order('selesai_pada'),
    ])
    const percobaan = ambil(perc)
    const hasil = percobaan.length
      ? ambil(
          await supabase
            .from('percobaan_hasil')
            .select('percobaan_id,hasil')
            .in(
              'percobaan_id',
              percobaan.map((p) => p.id),
            ),
        )
      : []
    return {
      uraian: ambil(uraian),
      rubrik: Object.fromEntries(ambil(kunci).map((k) => [k.soal_id, k.pembahasan_rich])),
      percobaan,
      hasil: Object.fromEntries(hasil.map((h) => [h.percobaan_id, h.hasil])),
    }
  }, [pelajaranId])

  if (memuat && !data) return <Memuat />
  if (error) return <KotakGalat galat={pesanError(error)} />
  if (data.uraian.length === 0) return null

  const nama = (p) => p.profiles?.full_name || p.profiles?.email || 'Tanpa nama'
  const perlu = data.percobaan.filter((p) => p.perlu_dinilai)
  const daftar = semua ? data.percobaan : perlu
  const terpilih = data.percobaan.find((p) => p.id === pilih) ?? null
  const simpanSelesai = async () => {
    await muatUlang()
    onUbah?.()
  }

  return (
    <section className="panel" aria-labelledby="judul-nilai-uraian">
      <h3 id="judul-nilai-uraian">Penilaian uraian</h3>
      <p>
        {perlu.length === 0 ? 'Tidak ada jawaban uraian yang menunggu dinilai.' : `${perlu.length} percobaan menunggu dinilai.`}
      </p>
      <label className="baris rapat">
        <input
          type="checkbox"
          checked={semua}
          onChange={(e) => setSemua(e.target.checked)}
          style={{ width: 'auto', minHeight: 0 }}
        />
        Tampilkan juga yang sudah dinilai
      </label>
      {daftar.length > 0 && (
        <div className="baris rapat">
          {daftar.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`btn kecil ${pilih === p.id ? 'utama' : ''}`}
              aria-pressed={pilih === p.id}
              onClick={() => setPilih(pilih === p.id ? null : p.id)}
            >
              {nama(p)}, percobaan {p.nomor}
              {p.perlu_dinilai ? ' (perlu dinilai)' : ''}
            </button>
          ))}
        </div>
      )}
      {terpilih && (
        <div className="kolom">
          <h4>
            {nama(terpilih)}, percobaan {terpilih.nomor}
          </h4>
          {data.uraian.map((u, i) => (
            <NilaiSatu
              key={`${terpilih.id}-${u.id}-${data.hasil[terpilih.id]?.[u.id]?.manual ? 'd' : 'b'}`}
              nomor={i + 1}
              percobaan={terpilih}
              soal={u}
              rubrik={data.rubrik[u.id]}
              hasilAwal={data.hasil[terpilih.id]?.[u.id]}
              onSelesai={simpanSelesai}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function NilaiSatu({ nomor, percobaan, soal, rubrik, hasilAwal, onSelesai }) {
  const sudah = Boolean(hasilAwal?.manual)
  const [poin, setPoin] = useState(sudah ? String(hasilAwal.poin) : '')
  const [komentar, setKomentar] = useState(hasilAwal?.komentar ?? '')
  const { sibuk, galat, setGalat, jalankan } = useAksi()
  const maks = Number(soal.points)

  const simpan = (e) => {
    e.preventDefault()
    const p = Number(String(poin).replace(',', '.'))
    if (poin.trim() === '' || !Number.isFinite(p) || p < 0 || p > maks) return setGalat(`Poin harus antara 0 dan ${angka(maks)}.`)
    return jalankan(async () => {
      ambil(
        await supabase.rpc('nilai_uraian', {
          id_percobaan: percobaan.id,
          id_soal: soal.id,
          poin_baru: p,
          komentar_baru: komentar.trim() || null,
        }),
      )
      await onSelesai()
    })
  }

  return (
    <form className="soal-item" onSubmit={simpan}>
      <strong>Soal uraian {nomor}</strong>
      <Teks doc={soal.prompt_rich} />
      <p className="jawaban-teks">{percobaan.jawaban?.[soal.id] || '(tidak dijawab)'}</p>
      {rubrik && (
        <details>
          <summary>Contoh jawaban atau rubrik</summary>
          <Teks doc={rubrik} />
        </details>
      )}
      <div className="form-baris">
        <div className="kolom" style={{ flex: '0 0 160px' }}>
          <label htmlFor={`poin-${percobaan.id}-${soal.id}`}>Poin (maks {angka(maks)})</label>
          <input
            id={`poin-${percobaan.id}-${soal.id}`}
            inputMode="decimal"
            value={poin}
            onChange={(e) => setPoin(e.target.value)}
          />
        </div>
        <div className="kolom">
          <label htmlFor={`kom-${percobaan.id}-${soal.id}`}>Komentar untuk siswa (boleh kosong)</label>
          <textarea
            id={`kom-${percobaan.id}-${soal.id}`}
            rows={2}
            maxLength={2000}
            value={komentar}
            onChange={(e) => setKomentar(e.target.value)}
          />
        </div>
      </div>
      <KotakGalat galat={galat} onTutup={() => setGalat('')} />
      <div className="baris">
        <button type="submit" className="btn utama kecil" disabled={sibuk}>
          {sudah ? 'Perbarui penilaian' : 'Simpan penilaian'}
        </button>
        {sudah && <span className="petunjuk">Sudah dinilai: {angka(hasilAwal.poin)}</span>}
      </div>
    </form>
  )
}