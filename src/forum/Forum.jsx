import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { KotakGalat, Memuat } from '../components/ui.jsx'
import { useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'
import DaftarTopik from './DaftarTopik.jsx'
import DetailTopik from './DetailTopik.jsx'

// Forum satu kursus. Satu halaman untuk daftar topik dan detail topik.
export default function Forum() {
  const { kelasId, topikId } = useParams()
  const { uid, adalahAdmin } = useAuth()

  const { data, error, memuat } = useMuat(async () => {
    const kelas = ambil(
      await supabase.from('classes').select('id,name,course_id,courses(id,title,owner_id)').eq('id', kelasId).maybeSingle(),
    )
    if (!kelas) return null
    return { kelas, kelola: adalahAdmin || kelas.courses?.owner_id === uid }
  }, [kelasId, uid, adalahAdmin])

  if (memuat && !data) return <Memuat />
  if (error) {
    return (
      <main className="halaman">
        <KotakGalat galat={pesanError(error)} />
      </main>
    )
  }
  if (!data) {
    return (
      <main className="halaman">
        <h1>Forum tidak tersedia</h1>
        <p>Kelas tidak ditemukan, atau kamu belum disetujui guru.</p>
        <div>
          <Link className="btn" to="/">
            Kembali ke beranda
          </Link>
        </div>
      </main>
    )
  }

  const { kelas, kelola } = data
  const kursusId = kelas.course_id
  return (
    <main className="halaman forum">
      <div className="baris">
        <Link className="btn kecil" to={topikId ? `/kelas/${kelasId}/forum` : `/kelas/${kelasId}`}>
          {topikId ? '← Semua topik' : `← ${kelas.courses?.title ?? kelas.name}`}
        </Link>
      </div>
      {topikId ? (
        <DetailTopik key={topikId} topikId={topikId} kelasId={kelasId} kursusId={kursusId} uid={uid} kelola={kelola} />
      ) : (
        <DaftarTopik kelasId={kelasId} kursusId={kursusId} uid={uid} kelola={kelola} judulKursus={kelas.courses?.title} />
      )}
    </main>
  )
}