import { lazy, Suspense, useState } from 'react'
import { Kosong, KotakGalat, Memuat, TombolKonfirmasi } from '../components/ui.jsx'
import { useAksi, useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'
import { adalahSurvei, NAMA_TIPE } from './konstanta.js'
import SoalForm from './SoalForm.jsx'
import SalinSoal from './SalinSoal.jsx'
import TempelSoal from './TempelSoal.jsx'
import { payloadDariSoal } from './payload.js'

const TeksKaya = lazy(() => import('../editor/TeksKaya.jsx'))

// Daftar soal satu ujian untuk guru: tambah, ubah, urutkan, hapus.
export default function DaftarSoal({ pelajaranId }) {
  const { sibuk, galat, setGalat, jalankan } = useAksi()
  const [form, setForm] = useState(null) // null | 'baru' | { soal, kunci }
  const [info, setInfo] = useState('')

  const { data, error, memuat, muatUlang } = useMuat(async () => {
    const [soal, kunci, selesai] = await Promise.all([
      supabase
        .from('soal')
        .select('id,type,position,prompt_rich,prompt_text,options,points,config')
        .eq('lesson_id', pelajaranId)
        .order('position'),
      supabase
        .from('soal_kunci')
        .select('soal_id,kunci,pembahasan_rich,pembahasan_text,soal!inner(lesson_id)')
        .eq('soal.lesson_id', pelajaranId),
      supabase
        .from('percobaan')
        .select('id', { count: 'exact', head: true })
        .eq('lesson_id', pelajaranId)
        .eq('status', 'selesai'),
    ])
    return {
      soal: ambil(soal),
      kunci: Object.fromEntries(ambil(kunci).map((k) => [k.soal_id, k])),
      sudah: (selesai.count ?? 0) > 0,
    }
  }, [pelajaranId])

  if (memuat && !data) return <Memuat />
  if (error) return <KotakGalat galat={pesanError(error)} />

  const { soal, kunci, sudah } = data
  const total = soal.reduce((n, s) => n + Number(s.points), 0)
  const ubah = (f) =>
    jalankan(async () => {
      await f()
      setInfo('')
      await muatUlang()
    })

  const simpan = (payload) =>
    jalankan(async () => {
      const id = form !== 'baru' ? form.soal.id : null
      ambil(
        await supabase.rpc('simpan_soal', {
          pelajaran: pelajaranId,
          id_soal: id,
          data: payload,
        }),
      )
      setForm(null)
      if (id && sudah)
        setInfo('Soal diubah setelah ada siswa yang mengerjakan. Pakai "Hitung ulang nilai" bila kunci jawaban berubah.')
      await muatUlang()
    })

  const geser = (i, arah) => {
    const urutan = soal.map((s) => s.id)
    const j = i + arah
    if (j < 0 || j >= urutan.length) return
    ;[urutan[i], urutan[j]] = [urutan[j], urutan[i]]
    return ubah(async () =>
      ambil(
        await supabase.rpc('atur_urutan_soal', {
          pelajaran: pelajaranId,
          urutan,
        }),
      ),
    )
  }
  const duplikat = (s) =>
    ubah(async () =>
      ambil(await supabase.rpc('simpan_soal', { pelajaran: pelajaranId, id_soal: null, data: payloadDariSoal(s, kunci[s.id]) })),
    )
  const hitungUlang = () =>
    jalankan(async () => {
      const n = ambil(await supabase.rpc('nilai_ulang_ujian', { pelajaran: pelajaranId }))
      setInfo(`${n} percobaan dinilai ulang.`)
      await muatUlang()
    })

  const selesaiMasal = (n, sebagian = false) => {
    if (!sebagian) setForm(null)
    setInfo(`${n} soal ditambahkan.`)
    muatUlang()
  }
  if (form === 'tempel') {
    return <TempelSoal pelajaranId={pelajaranId} onSelesai={selesaiMasal} onBatal={() => setForm(null)} />
  }
  if (form === 'salin') {
    return <SalinSoal pelajaranId={pelajaranId} onSelesai={selesaiMasal} onBatal={() => setForm(null)} />
  }
  if (form) {
    return (
      <SoalForm
        key={form === 'baru' ? 'baru' : form.soal.id}
        awal={form === 'baru' ? null : form}
        kunciTipe={sudah}
        sibuk={sibuk}
        onSimpan={simpan}
        onBatal={() => {
          setForm(null)
          setGalat('')
        }}
      />
    )
  }

  return (
    <div className="kolom">
      <KotakGalat galat={galat} onTutup={() => setGalat('')} />
      {info && (
        <p className="petunjuk" role="status">
          {info}
        </p>
      )}
      {sudah && (
        <p className="peringatan">
          Sudah ada siswa yang mengumpulkan ujian ini. Soal tidak bisa ditambah atau dihapus lagi. Teks dan kunci masih bisa
          diperbaiki.
        </p>
      )}
      <div className="baris">
        <strong>
          {soal.length} soal, total {total} poin
        </strong>
        {!sudah && (
          <button type="button" className="btn utama kecil" onClick={() => setForm('baru')}>
            + Tambah soal
          </button>
        )}
        {!sudah && (
          <>
            <button type="button" className="btn kecil" onClick={() => setForm('tempel')}>
              Tempel banyak soal
            </button>
            <button type="button" className="btn kecil" onClick={() => setForm('salin')}>
              Salin dari ujian lain
            </button>
          </>
        )}
        {sudah && (
          <button type="button" className="btn kecil" disabled={sibuk} onClick={hitungUlang}>
            Hitung ulang nilai
          </button>
        )}
      </div>
      {soal.length === 0 ? (
        <Kosong>Belum ada soal. Ujian baru bisa dikerjakan setelah ada soal.</Kosong>
      ) : (
        <ol className="daftar-soal">
          {soal.map((s, i) => (
            <li key={s.id} className="soal-item">
              <div className="baris rapat">
                <strong>{i + 1}.</strong>
                <span className="lencana">{NAMA_TIPE[s.type] ?? s.type}</span>
                <span className="petunjuk">{adalahSurvei(s.type) ? 'tanpa nilai' : `${Number(s.points)} poin`}</span>
              </div>
              <div className="soal-teks">
                <Suspense fallback={null}>
                  <TeksKaya doc={s.prompt_rich} />
                </Suspense>
              </div>
              <div className="baris rapat">
                <button
                  type="button"
                  className="btn kecil"
                  disabled={sibuk}
                  onClick={() => setForm({ soal: s, kunci: kunci[s.id] })}
                >
                  Ubah
                </button>
                <button
                  type="button"
                  className="btn kecil"
                  disabled={sibuk || i === 0}
                  onClick={() => geser(i, -1)}
                  aria-label={`Naikkan soal ${i + 1}`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn kecil"
                  disabled={sibuk || i === soal.length - 1}
                  onClick={() => geser(i, 1)}
                  aria-label={`Turunkan soal ${i + 1}`}
                >
                  ↓
                </button>
                {!sudah && (
                  <>
                    <button type="button" className="btn kecil" disabled={sibuk} onClick={() => duplikat(s)}>
                      Duplikat
                    </button>
                    <TombolKonfirmasi
                      label="Hapus"
                      tanya="Hapus soal ini?"
                      disabled={sibuk}
                      onYakin={() => ubah(async () => ambil(await supabase.rpc('hapus_soal', { id_soal: s.id })))}
                    />
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}