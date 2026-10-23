import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { DaftarBlok } from '../components/Isi.jsx'
import { KotakGalat, Memuat } from '../components/ui.jsx'
import { useAksi, useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'
import PanelUjian from '../ujian/PanelUjian.jsx'

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
  const [mengerjakan, setMengerjakan] = useState(false)

  const kelas = useMuat(async () => {
    const k = ambil(await supabase.from('classes').select('id,name,course_id,is_archived').eq('id', kelasId).maybeSingle())
    if (!k) return null
    const [kursus, modul, sudah, daftar] = await Promise.all([
      supabase.from('courses').select('id,title').eq('id', k.course_id).maybeSingle(),
      supabase
        .from('modules')
        .select('id,title,position,lessons(id,title,position,is_published,kind)')
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
        .map((m) => ({
          ...m,
          lessons: m.lessons.filter((l) => l.is_published),
        }))
        .filter((m) => m.lessons.length > 0),
      selesai: new Set(ambil(sudah).map((x) => x.lesson_id)),
      status: ambil(daftar)?.status ?? null,
    }
  }, [kelasId, uid])

  useEffect(() => {
    if (kelas.data) setSelesai(kelas.data.selesai)
  }, [kelas.data])

  const muatSelesai = useCallback(async () => {
    try {
      const r = ambil(await supabase.from('lesson_completions').select('lesson_id').eq('user_id', uid))
      setSelesai(new Set(r.map((x) => x.lesson_id)))
    } catch {
      /* abaikan */
    }
  }, [uid])

  const urut = kelas.data ? kelas.data.modul.flatMap((m) => m.lessons) : []
  const sekarang = urut.find((l) => l.id === pelajaranId) ?? null
  const indeks = sekarang ? urut.indexOf(sekarang) : -1
  const sebelumnya = indeks > 0 ? urut[indeks - 1] : null
  const berikutnya = indeks >= 0 && indeks < urut.length - 1 ? urut[indeks + 1] : null
  const modulSekarang = sekarang && kelas.data.modul.find((m) => m.lessons.some((l) => l.id === sekarang.id))

  const blok = useMuat(
    async () => (sekarang ? ambil(await supabase.from('blocks').select('*').eq('lesson_id', sekarang.id).order('position')) : []),
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
  const ujian = sekarang?.kind === 'ujian'

  const tandai = (nilai) =>
    jalankan(async () => {
      ambil(
        await supabase.rpc('tandai_selesai', {
          pelajaran: sekarang.id,
          selesai: nilai,
        }),
      )
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
    if (aktif && !sudahSelesai && !ujian) {
      try {
        ambil(
          await supabase.rpc('tandai_selesai', {
            pelajaran: sekarang.id,
            selesai: true,
          }),
        )
        setSelesai((lama) => new Set(lama).add(sekarang.id))
      } catch {
        /* abaikan */
      }
    }
    navigate(`/kelas/${kelasId}/${berikutnya.id}`)
  }

  if (!sekarang) {
    const lanjutan = urut.find((l) => !selesai.has(l.id)) ?? urut[0]
    return (
      <main className="halaman">
        <div className="baris">
          <Link className="btn kecil" to="/">
            ← Beranda
          </Link>
        </div>
        <div className="kepala-pelajaran">
          <p className="sub">{k.name}</p>
          <h1>{kursus?.title ?? k.name}</h1>
        </div>
        {status === 'menunggu' && (
          <p className="info">Permintaanmu masih menunggu persetujuan guru. Isi kelas akan muncul setelah disetujui.</p>
        )}
        {!aktif && status !== 'menunggu' && (
          <p className="info">Mode pratinjau: begini tampilan kelas ini untuk siswa. Progres tidak dicatat.</p>
        )}
        {aktif && total > 0 && (
          <div className="panel">
            <div className="persen">
              <span>Progres keseluruhan</span>
              <span>
                {selesaiCount} dari {total} selesai ({persen}%)
              </span>
            </div>
            <div className="bar" role="progressbar" aria-valuenow={persen} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${persen}%` }} />
            </div>
            {lanjutan && (
              <div>
                <Link className="btn utama" to={`/kelas/${kelasId}/${lanjutan.id}`}>
                  {selesaiCount === 0 ? 'Mulai belajar' : selesaiCount === total ? 'Buka dari awal' : 'Lanjutkan belajar'}
                </Link>
              </div>
            )}
          </div>
        )}
        {modul.length === 0 ? (
          <p className="kosong">Guru belum menerbitkan pelajaran di kelas ini.</p>
        ) : (
          <section aria-label="Daftar modul">
            <h2>Modul</h2>
            <div className="kartu-grid">
              {modul.map((m, n) => {
                const hitung = m.lessons.filter((l) => selesai.has(l.id)).length
                const pm = Math.round((100 * hitung) / m.lessons.length)
                const pertama = m.lessons.find((l) => !selesai.has(l.id)) ?? m.lessons[0]
                const sudahSemua = hitung === m.lessons.length
                return (
                  <article className="kartu" key={m.id}>
                    <p className="sub">Modul {n + 1}</p>
                    <h3>{m.title}</h3>
                    <p className="petunjuk">
                      {m.lessons.length} item
                      {m.lessons.some((l) => l.kind === 'ujian')
                        ? `, termasuk ${m.lessons.filter((l) => l.kind === 'ujian').length} ujian`
                        : ''}
                    </p>
                    {aktif && (
                      <>
                        <div
                          className="bar"
                          role="progressbar"
                          aria-label={`Progres ${m.title}`}
                          aria-valuenow={pm}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <span style={{ width: `${pm}%` }} />
                        </div>
                        <p className="petunjuk">
                          {hitung} dari {m.lessons.length} selesai
                        </p>
                      </>
                    )}
                    <div>
                      <Link className={`btn ${hitung > 0 && !sudahSemua ? 'utama' : ''}`} to={`/kelas/${kelasId}/${pertama.id}`}>
                        {!aktif || sudahSemua ? 'Buka modul' : hitung === 0 ? 'Mulai' : 'Lanjutkan'}
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}
      </main>
    )
  }

  return (
    <div className="kursus">
      <aside className={`samping jalur ${sampingBuka ? 'terbuka' : ''}`} aria-label="Daftar pelajaran">
        <div className="samping-kepala">
          <Link className="btn kecil" to={`/kelas/${kelasId}`}>
            ← Semua modul
          </Link>
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
        {[modulSekarang].filter(Boolean).map((m) => (
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
                    {l.kind === 'ujian' && <span className="lencana">Ujian</span>}
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
            Daftar modul ini
          </button>
        </div>

        {status === 'menunggu' && (
          <p className="info">Permintaanmu masih menunggu persetujuan guru. Isi kelas akan muncul setelah disetujui.</p>
        )}
        {!aktif && status !== 'menunggu' && (
          <p className="info">Mode pratinjau: begini tampilan kelas ini untuk siswa. Progres tidak dicatat.</p>
        )}

        {
          <>
            <div className="kepala-pelajaran">
              <p className="sub">{modulSekarang?.title}</p>
              <h1>{sekarang.title}</h1>
            </div>

            {blok.error && <KotakGalat galat={pesanError(blok.error)} />}
            {blok.memuat && !blok.data ? (
              <Memuat />
            ) : (
              !(ujian && (blok.data ?? []).length === 0) && <DaftarBlok blok={blok.data ?? []} tampilkanCatatan={false} />
            )}

            {ujian && (
              <PanelUjian
                key={sekarang.id}
                pelajaranId={sekarang.id}
                kelasId={kelasId}
                uid={uid}
                aktif={aktif}
                onNilaiBerubah={muatSelesai}
                onKerja={setMengerjakan}
              />
            )}

            <KotakGalat galat={galat} />
            {!mengerjakan && (
              <nav className="pager" aria-label="Navigasi pelajaran">
                <button
                  type="button"
                  className="btn"
                  disabled={!sebelumnya}
                  onClick={() => sebelumnya && navigate(`/kelas/${kelasId}/${sebelumnya.id}`)}
                >
                  ← Sebelumnya
                </button>
                {aktif && !ujian && (
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
                <button type="button" className="btn" disabled={!berikutnya} onClick={lanjut}>
                  {berikutnya && !modulSekarang.lessons.includes(berikutnya) ? 'Modul berikutnya →' : 'Berikutnya →'}
                </button>
              </nav>
            )}
          </>
        }
      </div>
    </div>
  )
}