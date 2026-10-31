import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { TombolIkon } from '../components/Ikon.jsx'
import { Kosong, KotakGalat, Memuat } from '../components/ui.jsx'
import { useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'
import { kelompokkan } from './logika.js'

const INDUK = 'lessons!inner(title,modules!inner(course_id,courses!inner(title,owner_id)))'

// Ringkasan hal yang menunggu guru: permintaan bergabung, tugas dan uraian yang belum dinilai, laporan forum.
export default function PerluTindakan() {
  const { uid } = useAuth()
  const { data, error, memuat, muatUlang } = useMuat(async () => {
    const [kursus, gabung, tugas, uraian, laporan] = await Promise.all([
      supabase.from('courses').select('id,title,classes(id,name,is_archived)').eq('owner_id', uid),
      supabase
        .from('enrollments')
        .select('id,class_id,classes!inner(name,course_id,courses!inner(title,owner_id))')
        .eq('status', 'menunggu')
        .eq('classes.courses.owner_id', uid)
        .limit(1000),
      supabase
        .from('pengumpulan_tugas')
        .select(`id,lesson_id,${INDUK}`)
        .eq('perlu_dinilai', true)
        .eq('lessons.modules.courses.owner_id', uid)
        .limit(1000),
      supabase
        .from('percobaan')
        .select(`id,lesson_id,${INDUK}`)
        .eq('perlu_dinilai', true)
        .eq('status', 'selesai')
        .eq('lessons.modules.courses.owner_id', uid)
        .limit(1000),
      supabase
        .from('forum_laporan')
        .select('id,forum_topik(course_id,courses(title,owner_id)),forum_balasan(forum_topik(course_id,courses(title,owner_id)))')
        .eq('ditinjau', false)
        .limit(1000),
    ])
    const daftarKursus = ambil(kursus)
    const kelasPertama = Object.fromEntries(
      daftarKursus.map((k) => [k.id, (k.classes.find((c) => !c.is_archived) ?? k.classes[0])?.id ?? null]),
    )
    const sayaPunya = (kurs) => kurs?.owner_id === uid
    const laporanSaya = ambil(laporan)
      .map((l) => {
        const t = l.forum_topik ?? l.forum_balasan?.forum_topik
        return t && sayaPunya(t.courses) ? { id: l.id, kursusId: t.course_id, judul: t.courses.title } : null
      })
      .filter(Boolean)

    const item = [
      ...kelompokkan(
        ambil(gabung),
        (b) => b.class_id,
        (b) => `${b.classes.courses.title} · kelas ${b.classes.name}`,
      ).map((g) => ({
        kunci: `gabung-${g.kunci}`,
        jenis: 'Permintaan bergabung',
        judul: g.judul,
        jumlah: g.jumlah,
        satuan: 'siswa menunggu persetujuan',
        ke: `/kelola/${g.kunci}`,
        aksi: 'Tinjau',
      })),
      ...kelompokkan(
        ambil(tugas),
        (b) => b.lesson_id,
        (b) => b.lessons.title,
      ).map((g) => ({
        kunci: `tugas-${g.kunci}`,
        jenis: 'Tugas menunggu nilai',
        judul: g.judul,
        jumlah: g.jumlah,
        satuan: 'kiriman belum dinilai',
        ke: `/kursus/${g.contoh.lessons.modules.course_id}/${g.kunci}?tab=hasil`,
        aksi: 'Nilai',
      })),
      ...kelompokkan(
        ambil(uraian),
        (b) => b.lesson_id,
        (b) => b.lessons.title,
      ).map((g) => ({
        kunci: `uraian-${g.kunci}`,
        jenis: 'Uraian menunggu nilai',
        judul: g.judul,
        jumlah: g.jumlah,
        satuan: 'percobaan belum dinilai',
        ke: `/kursus/${g.contoh.lessons.modules.course_id}/${g.kunci}?tab=hasil`,
        aksi: 'Nilai',
      })),
      ...kelompokkan(
        laporanSaya,
        (b) => b.kursusId,
        (b) => b.judul,
      )
        .filter((g) => kelasPertama[g.kunci])
        .map((g) => ({
          kunci: `laporan-${g.kunci}`,
          jenis: 'Laporan forum',
          judul: g.judul,
          jumlah: g.jumlah,
          satuan: 'laporan belum ditinjau',
          ke: `/kelas/${kelasPertama[g.kunci]}/forum`,
          aksi: 'Tinjau',
        })),
    ]
    return item
  }, [uid])

  return (
    <section className="bagian" aria-labelledby="judul-tindakan">
      <div className="baris sebar">
        <h2 id="judul-tindakan">
          Perlu ditindaklanjuti
          {data && data.length > 0 && <span className="lencana baru-hitung">{data.reduce((n, i) => n + i.jumlah, 0)}</span>}
        </h2>
        <TombolIkon ikon="muat" label="Muat ulang" onClick={muatUlang} disabled={memuat} />
      </div>
      {memuat && !data && <Memuat />}
      <KotakGalat galat={error && pesanError(error)} />
      {data && data.length === 0 && <Kosong>Semua beres. Tidak ada yang menunggu Anda.</Kosong>}
      {data && data.length > 0 && (
        <ul className="daftar-tindakan">
          {data.map((i) => (
            <li key={i.kunci}>
              <span className="jumlah-tindakan" aria-hidden="true">
                {i.jumlah}
              </span>
              <span className="isi-tindakan">
                <strong>{i.judul}</strong>
                <span className="petunjuk">
                  {i.jenis}: {i.jumlah} {i.satuan}
                </span>
              </span>
              <Link className="btn kecil utama" to={i.ke}>
                {i.aksi}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}