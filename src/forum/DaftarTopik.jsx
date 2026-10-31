import { useState } from 'react'
import { TombolIkon } from '../components/Ikon.jsx'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Kosong, KotakGalat, Memuat } from '../components/ui.jsx'
import { useAksi, useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'
import FormTopik from './FormTopik.jsx'
import LaporanForum from './LaporanForum.jsx'
import { urutkanTopik, waktuRelatif } from './tampil.js'

export default function DaftarTopik({ kelasId, kursusId, kelola, judulKursus }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const awalPelajaran = params.get('pelajaran')
  const [baru, setBaru] = useState(Boolean(awalPelajaran))
  const [saring, setSaring] = useState('semua')
  const { sibuk, galat, setGalat, jalankan } = useAksi()

  const { data, error, memuat, muatUlang } = useMuat(async () => {
    const [topik, modul] = await Promise.all([
      supabase
        .from('forum_topik_lihat')
        .select(
          'id,judul,disematkan,ditutup,penulis_nama,penulis_guru,pelajaran_judul,jumlah_balasan,terjawab,aktivitas_terakhir',
        )
        .eq('course_id', kursusId)
        .order('aktivitas_terakhir', { ascending: false })
        .limit(300),
      supabase
        .from('modules')
        .select('title,position,lessons(id,title,position,kind,is_published)')
        .eq('course_id', kursusId)
        .order('position')
        .order('position', { referencedTable: 'lessons' }),
    ])
    return {
      topik: urutkanTopik(ambil(topik)),
      pelajaran: ambil(modul).flatMap((m) =>
        m.lessons.filter((l) => l.kind !== 'ujian' && l.is_published).map((l) => ({ id: l.id, title: l.title, modul: m.title })),
      ),
    }
  }, [kursusId])

  const buat = (v) =>
    jalankan(async () => {
      const baris = ambil(
        await supabase
          .from('forum_topik')
          .insert({ course_id: kursusId, ...v })
          .select('id')
          .single(),
      )
      navigate(`/kelas/${kelasId}/forum/${baris.id}`)
    })

  const tampil = (data?.topik ?? []).filter((t) =>
    saring === 'belum' ? !t.terjawab && !t.ditutup : saring === 'terjawab' ? t.terjawab : true,
  )

  return (
    <>
      <div className="baris sebar">
        <h1>Forum</h1>
        {!baru && (
          <button type="button" className="btn utama" onClick={() => setBaru(true)}>
            + Topik baru
          </button>
        )}
      </div>
      <p className="petunjuk">
        Tanya jawab untuk {judulKursus ?? 'kursus ini'}. Semua siswa dan guru pada kursus ini bisa melihatnya. Pakai bahasa yang
        sopan.
      </p>
      <KotakGalat galat={galat || (error ? pesanError(error) : '')} onTutup={() => setGalat('')} />
      {baru && (
        <FormTopik
          awal={awalPelajaran ? { lesson_id: awalPelajaran } : undefined}
          pelajaran={data?.pelajaran ?? []}
          sibuk={sibuk}
          onSimpan={buat}
          onBatal={() => setBaru(false)}
        />
      )}

      <div className="baris" role="group" aria-label="Saring topik">
        {[
          ['semua', 'Semua'],
          ['belum', 'Belum terjawab'],
          ['terjawab', 'Terjawab'],
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={`btn kecil ${saring === k ? 'utama' : ''}`}
            aria-pressed={saring === k}
            onClick={() => setSaring(k)}
          >
            {label}
          </button>
        ))}
        <TombolIkon ikon="muat" label="Muat ulang" onClick={muatUlang} disabled={memuat} />
      </div>

      {memuat && !data ? (
        <Memuat />
      ) : tampil.length === 0 ? (
        <Kosong>
          {data?.topik.length ? 'Tidak ada topik pada saringan ini.' : 'Belum ada topik. Jadilah yang pertama bertanya.'}
        </Kosong>
      ) : (
        <ul className="daftar-topik">
          {tampil.map((t) => (
            <li key={t.id} className={t.disematkan ? 'disematkan' : ''}>
              <Link to={`/kelas/${kelasId}/forum/${t.id}`} className="topik-tautan">
                <span className="topik-judul">
                  {t.disematkan && (
                    <span role="img" aria-label="Disematkan">
                      📌{' '}
                    </span>
                  )}
                  {t.judul}
                </span>
                <span className="topik-meta">
                  {t.penulis_nama}
                  {t.penulis_guru && <span className="lencana">Guru</span>}
                  {' · '}
                  {waktuRelatif(t.aktivitas_terakhir)}
                  {' · '}
                  {t.jumlah_balasan} balasan
                </span>
                <span className="topik-lencana">
                  {t.terjawab && <span className="lencana status-aktif">Terjawab</span>}
                  {t.ditutup && <span className="lencana">Ditutup</span>}
                  {t.pelajaran_judul && <span className="lencana">{t.pelajaran_judul}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {kelola && <LaporanForum kelasId={kelasId} kursusId={kursusId} onBerubah={muatUlang} />}
    </>
  )
}