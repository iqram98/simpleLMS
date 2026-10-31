import { useEffect, useState } from 'react'
import { useMuat } from '../lib/hooks.js'
import { ambil, supabase } from '../lib/supabase.js'
import { terakhirDilihat, tandaiDilihat, urutkanPengumuman, waktuPengumuman } from './tampil.js'

const AWAL = 3

// Pengumuman kelas untuk siswa: hanya baca. Yang terbit sejak kunjungan terakhir diberi tanda "Baru".
export default function PengumumanSiswa({ kursusId }) {
  const [dulu] = useState(() => terakhirDilihat(kursusId))
  const [semua, setSemua] = useState(false)
  const { data } = useMuat(
    async () =>
      urutkanPengumuman(
        ambil(
          await supabase
            .from('pengumuman')
            .select('id,judul,isi,disematkan,dibuat_pada,diubah_pada')
            .eq('course_id', kursusId)
            .order('dibuat_pada', { ascending: false })
            .limit(100),
        ),
      ),
    [kursusId],
  )

  // Ditandai saat dibuka (bukan saat ditutup), agar tetap tercatat walau tab langsung ditutup.
  useEffect(() => {
    tandaiDilihat(kursusId)
  }, [kursusId])

  if (!data || data.length === 0) return null
  const tampil = semua ? data : data.slice(0, AWAL)
  return (
    <section className="bagian" aria-labelledby="judul-pengumuman">
      <h2 id="judul-pengumuman">Pengumuman</h2>
      <div className="daftar-pengumuman">
        {tampil.map((p) => (
          <article key={p.id} className={`pengumuman${p.disematkan ? ' disematkan' : ''}`}>
            <h3>
              {p.disematkan && (
                <span className="pin" title="Disematkan" role="img" aria-label="Disematkan">
                  📌
                </span>
              )}
              {p.judul}
              {new Date(p.dibuat_pada).getTime() > dulu && <span className="lencana status-aktif baru">Baru</span>}
            </h3>
            <p className="sub-pengumuman">
              {waktuPengumuman(p.dibuat_pada)}
              {new Date(p.diubah_pada) - new Date(p.dibuat_pada) > 60000 && ' · diubah'}
            </p>
            {p.isi && <p className="isi-pengumuman">{p.isi}</p>}
          </article>
        ))}
      </div>
      {data.length > AWAL && (
        <div>
          <button type="button" className="btn kecil" onClick={() => setSemua((s) => !s)}>
            {semua ? 'Tampilkan lebih sedikit' : `Tampilkan semua (${data.length})`}
          </button>
        </div>
      )}
    </section>
  )
}