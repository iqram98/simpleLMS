import { Link } from 'react-router-dom'
import { Kosong, KotakGalat, TombolKonfirmasi } from '../components/ui.jsx'
import { useAksi, useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'
import { waktuRelatif } from './tampil.js'

const potong = (s, n = 160) => (s.length > n ? `${s.slice(0, n)}…` : s)

// Laporan yang belum ditinjau untuk satu kursus (hanya pengelola).
export default function LaporanForum({ kelasId, kursusId, onBerubah }) {
  const { sibuk, galat, setGalat, jalankan } = useAksi()
  const { data, error, muatUlang } = useMuat(async () => {
    const laporan = ambil(
      await supabase
        .from('forum_laporan')
        .select('id,alasan,dibuat_pada,topik_id,balasan_id')
        .eq('ditinjau', false)
        .order('dibuat_pada', { ascending: false })
        .limit(200),
    )
    const idBalasan = laporan.map((l) => l.balasan_id).filter(Boolean)
    const balasan = idBalasan.length
      ? ambil(await supabase.from('forum_balasan_lihat').select('id,topik_id,isi,penulis_nama').in('id', idBalasan))
      : []
    const idTopik = [...new Set([...laporan.map((l) => l.topik_id), ...balasan.map((b) => b.topik_id)].filter(Boolean))]
    const topik = idTopik.length
      ? ambil(await supabase.from('forum_topik_lihat').select('id,course_id,judul,isi,penulis_nama').in('id', idTopik))
      : []
    const petaB = Object.fromEntries(balasan.map((b) => [b.id, b]))
    const petaT = Object.fromEntries(topik.map((t) => [t.id, t]))
    return laporan
      .map((l) => {
        const b = l.balasan_id ? petaB[l.balasan_id] : null
        const t = petaT[l.topik_id ?? b?.topik_id]
        return t && t.course_id === kursusId
          ? {
              ...l,
              topikId: t.id,
              jenis: b ? 'Balasan' : 'Topik',
              penulis: (b ?? t).penulis_nama,
              teks: b ? b.isi : `${t.judul}: ${t.isi}`,
            }
          : null
      })
      .filter(Boolean)
  }, [kursusId])

  const jalan = (fungsi) =>
    jalankan(async () => {
      await fungsi()
      await muatUlang()
      onBerubah?.()
    })
  const tinjau = (id) =>
    jalan(async () => ambil(await supabase.from('forum_laporan').update({ ditinjau: true }).eq('id', id).select('id')))
  const hapus = (l) =>
    jalan(async () =>
      l.balasan_id
        ? ambil(await supabase.from('forum_balasan').delete().eq('id', l.balasan_id).select('id'))
        : ambil(await supabase.from('forum_topik').delete().eq('id', l.topik_id).select('id')),
    )

  return (
    <section className="bagian" aria-labelledby="judul-laporan-forum">
      <h2 id="judul-laporan-forum">Laporan siswa ({data?.length ?? 0})</h2>
      <KotakGalat galat={galat || (error ? pesanError(error) : '')} onTutup={() => setGalat('')} />
      {data?.length === 0 && <Kosong>Tidak ada laporan yang perlu ditinjau.</Kosong>}
      <ul className="daftar-balasan">
        {data?.map((l) => (
          <li key={l.id} className="balasan">
            <p className="topik-meta">
              {l.jenis} oleh <strong>{l.penulis}</strong> · dilaporkan {waktuRelatif(l.dibuat_pada)}
              {l.alasan && <> · alasan: “{l.alasan}”</>}
            </p>
            <p className="isi-pengumuman">{potong(l.teks)}</p>
            <div className="baris">
              <Link className="btn kecil" to={`/kelas/${kelasId}/forum/${l.topikId}`}>
                Buka topik
              </Link>
              <button type="button" className="btn kecil" disabled={sibuk} onClick={() => tinjau(l.id)}>
                Tandai ditinjau
              </button>
              <TombolKonfirmasi label="Hapus kiriman" tanya="Hapus kiriman ini?" disabled={sibuk} onYakin={() => hapus(l)} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}