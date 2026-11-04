import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import Ikon from '../components/Ikon.jsx'
import { KotakGalat, Memuat } from '../components/ui.jsx'
import { useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'
import { terakhirDilihat } from '../pengumuman/tampil.js'
import { angka } from '../tugas/tampil.js'
import { hitungPelajaran, labelTenggat, pelajaranBerikut, susunTenggat } from './logika.js'
import { sudahDilihatNilai } from './penanda.js'

// Bagian siswa di beranda: lanjutkan belajar per kelas, tenggat terdekat, dan nilai tugas yang baru keluar.
// `kelas`: daftar { class_id, nama } yang statusnya aktif.
export default function LanjutBelajar({ kelas }) {
  const { uid } = useAuth()
  const idKelas = kelas.map((k) => k.class_id)

  const { data, error, memuat } = useMuat(async () => {
    if (idKelas.length === 0) return { kartu: [], tenggat: [], nilaiBaru: [] }
    const info = ambil(await supabase.from('classes').select('id,name,course_id,courses(title)').in('id', idKelas))
    const idKursus = [...new Set(info.map((k) => k.course_id))]
    const [modul, selesai, progres, tugas, ujian, pengumuman, nilai] = await Promise.all([
      supabase
        .from('modules')
        .select('id,title,position,course_id,lessons(id,title,position,kind,is_published)')
        .in('course_id', idKursus)
        .order('position')
        .order('position', { referencedTable: 'lessons' }),
      supabase.from('lesson_completions').select('lesson_id').eq('user_id', uid).limit(2000),
      supabase
        .from('progres_kelas')
        .select('class_id,total_pelajaran,pelajaran_selesai,persen')
        .eq('user_id', uid)
        .in('class_id', idKelas),
      supabase.from('tugas_pengaturan').select('lesson_id,tenggat,terima_terlambat').not('tenggat', 'is', null).limit(500),
      supabase.from('ujian_pengaturan').select('lesson_id,tutup_pada').not('tutup_pada', 'is', null).limit(500),
      supabase
        .from('pengumuman')
        .select('course_id,dibuat_pada')
        .in('course_id', idKursus)
        .order('dibuat_pada', { ascending: false })
        .limit(300),
      supabase
        .from('pengumpulan_tugas')
        .select('lesson_id,nilai,dinilai_pada')
        .eq('user_id', uid)
        .not('nilai', 'is', null)
        .order('dinilai_pada', { ascending: false })
        .limit(50),
    ])
    const modulPerKursus = {}
    const pelajaran = new Map()
    for (const m of ambil(modul)) {
      ;(modulPerKursus[m.course_id] ??= []).push(m)
      for (const l of m.lessons) pelajaran.set(l.id, { ...l, kursusId: m.course_id })
    }
    const sudah = new Set(ambil(selesai).map((x) => x.lesson_id))
    const peta = Object.fromEntries(ambil(progres).map((p) => [p.class_id, p]))
    const kelasPerKursus = {}
    for (const k of info) kelasPerKursus[k.course_id] ??= k.id

    const kartu = info.map((k) => {
      const m = modulPerKursus[k.course_id] ?? []
      const p = peta[k.id]
      const baru = ambil(pengumuman).filter(
        (x) => x.course_id === k.course_id && new Date(x.dibuat_pada).getTime() > terakhirDilihat(k.course_id),
      ).length
      return {
        id: k.id,
        kelas: k.name,
        kursus: k.courses?.title ?? k.name,
        total: p?.total_pelajaran ?? hitungPelajaran(m),
        selesai: p?.pelajaran_selesai ?? 0,
        persen: p?.persen ?? 0,
        berikut: pelajaranBerikut(m, sudah),
        pengumumanBaru: baru,
      }
    })

    const tenggat = susunTenggat({ tugas: ambil(tugas), ujian: ambil(ujian), selesai: sudah, pelajaran }).map((t) => ({
      ...t,
      kelasId: kelasPerKursus[t.kursusId],
    }))
    const nilaiBaru = ambil(nilai)
      .filter((n) => pelajaran.has(n.lesson_id) && !sudahDilihatNilai(n.lesson_id, n.dinilai_pada))
      .map((n) => ({
        lessonId: n.lesson_id,
        judul: pelajaran.get(n.lesson_id).title,
        nilai: n.nilai,
        kelasId: kelasPerKursus[pelajaran.get(n.lesson_id).kursusId],
      }))
    return { kartu, tenggat: tenggat.filter((t) => t.kelasId), nilaiBaru: nilaiBaru.filter((n) => n.kelasId) }
  }, [uid, idKelas.join(',')])

  if (idKelas.length === 0) return null
  if (memuat && !data) return <Memuat />
  if (error) return <KotakGalat galat={pesanError(error)} />
  const { kartu, tenggat, nilaiBaru } = data

  return (
    <>
      <section className="bagian" aria-labelledby="judul-lanjut">
        <h2 id="judul-lanjut">Lanjutkan belajar</h2>
        <div className="kartu-grid">
          {kartu.map((k) => (
            <div className="kartu" key={k.id}>
              <p className="sub">{k.kelas}</p>
              <h3>{k.kursus}</h3>
              <div className="persen">
                <span>
                  {k.selesai} dari {k.total} selesai
                </span>
                <span>{k.persen}%</span>
              </div>
              <div className="bar" role="progressbar" aria-valuenow={k.persen} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${k.persen}%` }} />
              </div>
              {k.pengumumanBaru > 0 && (
                <p>
                  <Link to={`/kelas/${k.id}`} className="lencana status-aktif">
                    {k.pengumumanBaru} pengumuman baru
                  </Link>
                </p>
              )}
              <div className="baris">
                {k.berikut ? (
                  <Link className="btn utama" to={`/kelas/${k.id}/${k.berikut.id}`}>
                    {k.selesai === 0 ? 'Mulai' : 'Lanjutkan'}: {k.berikut.title}
                  </Link>
                ) : (
                  <Link className="btn" to={`/kelas/${k.id}`}>
                    {k.total > 0 ? 'Semua selesai. Buka kelas' : 'Buka kelas'}
                  </Link>
                )}
                <Link
                  className="btn kecil ikon"
                  to={`/kelas/${k.id}/forum`}
                  aria-label={`Forum ${k.kelas}`}
                  data-tip="Forum kelas"
                >
                  <Ikon nama="forum" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {nilaiBaru.length > 0 && (
        <section className="bagian" aria-labelledby="judul-nilai-baru">
          <h2 id="judul-nilai-baru">Nilai baru</h2>
          <ul className="daftar-tindakan">
            {nilaiBaru.map((n) => (
              <li key={n.lessonId}>
                <span className="jumlah-tindakan nilai" aria-hidden="true">
                  {angka(n.nilai)}
                </span>
                <span className="isi-tindakan">
                  <strong>{n.judul}</strong>
                  <span className="petunjuk">Tugas sudah dinilai guru</span>
                </span>
                <Link className="btn kecil" to={`/kelas/${n.kelasId}/${n.lessonId}`}>
                  Lihat
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tenggat.length > 0 && (
        <section className="bagian" aria-labelledby="judul-tenggat">
          <h2 id="judul-tenggat">Tenggat terdekat</h2>
          <ul className="daftar-tindakan">
            {tenggat.map((t) => {
              const l = labelTenggat(t.waktu)
              return (
                <li key={t.lessonId}>
                  <span className={`jumlah-tindakan tenggat ${l.mendesak ? 'mendesak' : ''}`} aria-hidden="true">
                    {t.jenis === 'ujian' ? 'U' : 'T'}
                  </span>
                  <span className="isi-tindakan">
                    <strong>{t.judul}</strong>
                    <span className="petunjuk">
                      {t.jenis === 'ujian' ? 'Ujian ditutup' : 'Tugas'}{' '}
                      <span className={l.mendesak ? 'teks-mendesak' : ''}>{l.teks}</span>
                    </span>
                  </span>
                  <Link className="btn kecil" to={`/kelas/${t.kelasId}/${t.lessonId}`}>
                    Buka
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </>
  )
}