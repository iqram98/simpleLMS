import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { DaftarBlok } from '../components/Isi.jsx'
import { KotakGalat, Memuat } from '../components/ui.jsx'
import { useAksi, useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'

// Tampilan belajar untuk siswa: sidebar modul, isi pelajaran, tombol sebelumnya
// dan berikutnya, penanda selesai, dan progres. Guru pemilik juga bisa membuka
// halaman ini sebagai pratinjau (tanpa tombol tandai selesai).
export default function KelasSiswa() {
  const { kelasId, pelajaranId } = useParams()
  const { uid } = useAuth()
  const navigate = useNavigate()
  const [sampingBuka, setSampingBuka] = useState(false)
  const [selesai, setSelesai] = useState(() => new Set())
  const { sibuk, galat, jalankan } = useAksi()

  const kelas = useMuat(async () => {
    const k = ambil(
      await supabase.from('classes').select('id,name,course_id,is_archived').eq('id', kelasId).maybeSingle(),
    )
    if (!k) return null
    const [kursus, modul, sudah, daftar] = await Promise.all([
      supabase.from('courses').select('id,title').eq('id', k.course_id).maybeSingle(),
      supabase
        .from('modules')
        .select('id,title,position,lessons(id,title,position,is_published)')
        .eq('course_id', k.course_id)
        .order('position')
        .order('position', { referencedTable: 'lessons' }),
      supabase.from('lesson_completions').select('lesson_id').eq('user_id', uid),
      supabase.from('enrollments').select('status').eq('class_id', kelasId).eq('user_id', uid).maybeSingle(),
    ])
    return {
      kelas: k,
      kursus: ambil(kursus),
      // Siswa hanya menampilkan pelajaran terbit, juga saat guru membuka sebagai pratinjau.
      modul: ambil(modul)
        .map((m) => ({ ...m, lessons: m.lessons.filter((l) => l.is_published) }))
        .filter((m) => m.lessons.length > 0),
      selesai: new Set(ambil(sudah).map((x) => x.lesson_id)),
      status: ambil(daftar)?.status ?? null,
    }
  }, [kelasId, uid])

  useEffect(() => {
    if (kelas.data) setSelesai(kelas.data.selesai)
  }, [kelas.data])

  const urut = kelas.data ? kelas.data.modul.flatMap((m) => m.lessons) : []
  const sekarang = urut.find((l) => l.id === pelajaranId) ?? urut[0] ?? null
  const indeks = sekarang ? urut.indexOf(sekarang) : -1
  const sebelumnya = indeks > 0 ? urut[indeks - 1] : null
  const berikutnya = indeks >= 0 && indeks < urut.length - 1 ? urut[indeks + 1] : null
  const modulSekarang = sekarang && kelas.data.modul.find((m) => m.lessons.some((l) => l.id === sekarang.id))

  const blok = useMuat(
    async () =>
      sekarang ? ambil(await supabase.from('blocks').select('*').eq('lesson_id', sekarang.id).order('position')) : [],
    [sekarang?.id],
  )

  useEffect(() => {
    window.scrollTo(0, 0)
    setSampingBuka(false)
  }, [sekarang?.id])

  if (kelas.memuat && !kelas.data) return <Memuat />
  if (kelas.error) {
    return (
      <main className="halaman">
        <KotakGalat galat={pesanError(kelas.error)} />
      </main>
    )
  }
  if (!kelas.data) {
    return (
      <main className="halaman">
        <h1>Kelas tidak tersedia</h1>
        <p>Kelas tidak ditemukan, atau kamu belum disetujui guru.</p>
        <div>
          <Link className="btn" to="/">
            Kembali ke beranda
          </Link>
        </div>
      </main>
    )
  }

  const { kelas: k, kursus, modul, status } = kelas.data
  const aktif = status === 'aktif'
  const total = urut.length
  const selesaiCount = urut.filter((l) => selesai.has(l.id)).length
  const persen = total ? Math.round((100 * selesaiCount) / total) : 0
  const sudahSelesai = sekarang ? selesai.has(sekarang.id) : false

  const tandai = (nilai) =>
    jalankan(async () => {
      ambil(await supabase.rpc('tandai_selesai', { pelajaran: sekarang.id, selesai: nilai }))
      setSelesai((lama) => {
        const baru = new Set(lama)
        if (nilai) baru.add(sekarang.id)
        else baru.delete(sekarang.id)
        return baru
      })
    })

  // Menekan "Berikutnya" otomatis menandai pelajaran ini selesai.
  // Bila gagal menyimpan, siswa tetap pindah halaman dan bisa menandai manual.
  const lanjut = async () => {
    if (!berikutnya) return
    if (aktif && !sudahSelesai) {
      try {
        ambil(await supabase.rpc('tandai_selesai', { pelajaran: sekarang.id, selesai: true }))
        setSelesai((lama) => new Set(lama).add(sekarang.id))
      } catch {
        /* abaikan */
      }
    }
    navigate(`/kelas/${kelasId}/${berikutnya.id}`)
  }

  return (
    <div className="kursus">
      <aside className={`samping jalur ${sampingBuka ? 'terbuka' : ''}`} aria-label="Daftar pelajaran">
        <div className="samping-kepala">
          <h2>{kursus?.title ?? k.name}</h2>
          <p className="petunjuk">{k.name}</p>
          {aktif && (
            <>
              <div className="persen">
                <span>Progres</span>
                <span>{persen}%</span>
              </div>
              <div className="bar" role="progressbar" aria-valuenow={persen} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${persen}%` }} />
              </div>
            </>
          )}
        </div>
        {modul.map((m) => (
          <div className="modul" key={m.id}>
            <p className="modul-judul">{m.title}</p>
            <ul>
              {m.lessons.map((l) => (
                <li key={l.id}>
                  <Link
                    to={`/kelas/${kelasId}/${l.id}`}
                    className={`pelajaran ${sekarang && l.id === sekarang.id ? 'sekarang' : ''}`}
                    aria-current={sekarang && l.id === sekarang.id ? 'page' : undefined}
                  >
                    {aktif && (
                      <span
                        className={`tanda ${selesai.has(l.id) ? 'selesai' : ''}`}
                        role="img"
                        aria-label={selesai.has(l.id) ? 'Selesai' : 'Belum selesai'}
                      >
                        {selesai.has(l.id) ? '✓' : ''}
                      </span>
                    )}
                    <span>{l.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>

      <div className="utama-isi">
        <div className="baris">
          <Link className="btn kecil" to="/">
            ← Beranda
          </Link>
          <button
            type="button"
            className="btn kecil tombol-samping"
            aria-expanded={sampingBuka}
            onClick={() => setSampingBuka((b) => !b)}
          >
            Daftar pelajaran
          </button>
        </div>

        {status === 'menunggu' && (
          <p className="info">Permintaanmu masih menunggu persetujuan guru. Isi kelas akan muncul setelah disetujui.</p>
        )}
        {!aktif && status !== 'menunggu' && (
          <p className="info">Mode pratinjau: begini tampilan kelas ini untuk siswa. Progres tidak dicatat.</p>
        )}

        {!sekarang ? (
          <p className="kosong">Guru belum menerbitkan pelajaran di kelas ini.</p>
        ) : (
          <>
            <div className="kepala-pelajaran">
              <p className="sub">{modulSekarang?.title}</p>
              <h1>{sekarang.title}</h1>
            </div>

            {blok.error && <KotakGalat galat={pesanError(blok.error)} />}
            {blok.memuat && !blok.data ? <Memuat /> : <DaftarBlok blok={blok.data ?? []} tampilkanCatatan={false} />}

            <KotakGalat galat={galat} />
            <nav className="pager" aria-label="Navigasi pelajaran">
              <button
                type="button"
                className="btn"
                disabled={!sebelumnya}
                onClick={() => sebelumnya && navigate(`/kelas/${kelasId}/${sebelumnya.id}`)}
              >
                ← Sebelumnya
              </button>
              {aktif && (
                <button
                  type="button"
                  className={`btn ${sudahSelesai ? '' : 'utama'}`}
                  disabled={sibuk}
                  aria-label={sudahSelesai ? 'Pelajaran selesai. Ketuk untuk membatalkan' : 'Tandai pelajaran selesai'}
                  onClick={() => tandai(!sudahSelesai)}
                >
                  {sudahSelesai ? '✓ Selesai' : 'Tandai selesai'}
                </button>
              )}
              <button
                type="button"
                className="btn"
                disabled={!berikutnya}
                onClick={lanjut}
              >
                Berikutnya →
              </button>
            </nav>
          </>
        )}
      </div>
    </div>
  )
}