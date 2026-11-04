import { useEffect, useState } from 'react'
import { TombolIkon } from '../components/Ikon.jsx'
import { useNavigate } from 'react-router-dom'
import { Kosong, KotakGalat, Memuat, MenuTitik } from '../components/ui.jsx'
import { useAksi, useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'
import FormLapor from './FormLapor.jsx'
import FormTopik from './FormTopik.jsx'
import { JEDA_MUAT_ULANG, MAKS_ISI, waktuForum, waktuRelatif } from './tampil.js'

function Penulis({ nama, guru }) {
  return (
    <span className="penulis">
      <strong>{nama}</strong>
      {guru && <span className="lencana">Guru</span>}
    </span>
  )
}

export default function DetailTopik({ topikId, kelasId, kursusId, uid, kelola }) {
  const navigate = useNavigate()
  const { sibuk, galat, setGalat, jalankan } = useAksi()
  const [info, setInfo] = useState('')
  const [ubah, setUbah] = useState(null) // 'topik' | id balasan
  const [lapor, setLapor] = useState(null) // { topik_id } | { balasan_id }
  const [isiBalasan, setIsiBalasan] = useState('')

  const { data, error, memuat, muatUlang } = useMuat(async () => {
    const [t, b] = await Promise.all([
      supabase.from('forum_topik_lihat').select('*').eq('id', topikId).maybeSingle(),
      supabase
        .from('forum_balasan_lihat')
        .select('id,penulis_id,penulis_nama,penulis_guru,isi,jawaban,dibuat_pada,diubah_pada')
        .eq('topik_id', topikId)
        .order('dibuat_pada')
        .limit(500),
    ])
    const topik = ambil(t)
    if (!topik) return null
    return { topik, balasan: ambil(b) }
  }, [topikId])

  // Pembaruan berkala lewat HTTP: hanya saat tab terlihat dan tidak sedang mengubah sesuatu.
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') muatUlang()
    }, JEDA_MUAT_ULANG)
    return () => clearInterval(t)
  }, [muatUlang])

  const daftarPelajaran = useMuat(async () => {
    if (!ubah) return []
    const modul = ambil(
      await supabase
        .from('modules')
        .select('title,position,lessons(id,title,position,kind,is_published)')
        .eq('course_id', kursusId)
        .order('position')
        .order('position', { referencedTable: 'lessons' }),
    )
    return modul.flatMap((m) =>
      m.lessons.filter((l) => l.kind !== 'ujian' && l.is_published).map((l) => ({ id: l.id, title: l.title, modul: m.title })),
    )
  }, [ubah === 'topik'])

  if (memuat && !data) return <Memuat bentuk="halaman" />
  if (error) return <KotakGalat galat={pesanError(error)} />
  if (!data) return <Kosong>Topik tidak ditemukan atau sudah dihapus.</Kosong>

  const { topik, balasan } = data
  const punyaSaya = topik.penulis_id === uid
  const bisaBalas = !topik.ditutup || kelola
  const dibalasOrang = balasan.some((b) => b.penulis_id !== topik.penulis_id)

  const aksi = (fungsi, pesan) =>
    jalankan(async () => {
      await fungsi()
      setUbah(null)
      setLapor(null)
      setInfo(pesan ?? '')
      await muatUlang()
    })
  const ubahTopik = (patch) =>
    aksi(async () => ambil(await supabase.from('forum_topik').update(patch).eq('id', topikId).select('id')))
  const ubahBalasan = (id, patch) =>
    aksi(async () => ambil(await supabase.from('forum_balasan').update(patch).eq('id', id).select('id')))
  const hapusBalasan = (id) => aksi(async () => ambil(await supabase.from('forum_balasan').delete().eq('id', id).select('id')))
  const hapusTopik = () =>
    jalankan(async () => {
      ambil(await supabase.from('forum_topik').delete().eq('id', topikId).select('id'))
      navigate(`/kelas/${kelasId}/forum`)
    })
  const kirimBalasan = () =>
    aksi(async () => {
      ambil(await supabase.from('forum_balasan').insert({ topik_id: topikId, isi: isiBalasan.trim() }).select('id'))
      setIsiBalasan('')
    })
  const kirimLaporan = (alasan) =>
    aksi(async () => {
      const { error: e } = await supabase.from('forum_laporan').insert({ ...lapor, alasan })
      if (e && e.code !== '23505') throw e
    }, 'Laporan terkirim. Guru akan meninjaunya.')

  return (
    <>
      <KotakGalat galat={galat} onTutup={() => setGalat('')} />
      {info && (
        <p className="info" role="status">
          {info}
        </p>
      )}

      {ubah === 'topik' ? (
        <FormTopik
          awal={topik}
          pelajaran={daftarPelajaran.data ?? []}
          sibuk={sibuk}
          labelSimpan="Simpan perubahan"
          onSimpan={(v) => ubahTopik(v)}
          onBatal={() => setUbah(null)}
        />
      ) : (
        <article className="topik-detail">
          <div className="baris sebar">
            <h1>
              {topik.disematkan && (
                <span role="img" aria-label="Disematkan">
                  📌{' '}
                </span>
              )}
              {topik.judul}
            </h1>
            <MenuTitik
              label="Aksi untuk topik ini"
              disabled={sibuk}
              item={[
                { label: 'Ubah', sembunyi: !punyaSaya || (topik.ditutup && !kelola), onPilih: () => setUbah('topik') },
                {
                  label: topik.disematkan ? 'Lepas sematan' : 'Sematkan',
                  sembunyi: !kelola,
                  onPilih: () => ubahTopik({ disematkan: !topik.disematkan }),
                },
                {
                  label: topik.ditutup ? 'Buka kembali' : 'Tutup topik',
                  sembunyi: !kelola,
                  onPilih: () => ubahTopik({ ditutup: !topik.ditutup }),
                },
                { label: 'Laporkan', sembunyi: punyaSaya || kelola, onPilih: () => setLapor({ topik_id: topikId }) },
                {
                  label: 'Hapus topik',
                  bahaya: true,
                  sembunyi: !(kelola || (punyaSaya && !dibalasOrang)),
                  konfirmasi: 'Hapus topik ini beserta semua balasannya?',
                  onPilih: hapusTopik,
                },
              ]}
            />
          </div>
          <p className="topik-meta">
            <Penulis nama={topik.penulis_nama} guru={topik.penulis_guru} /> · {waktuForum(topik.dibuat_pada)}
            {new Date(topik.diubah_pada) - new Date(topik.dibuat_pada) > 60000 && ' · diubah'}
            {topik.ditutup && <span className="lencana">Ditutup</span>}
            {topik.pelajaran_judul && <span className="lencana">{topik.pelajaran_judul}</span>}
          </p>
          {topik.isi && <p className="isi-pengumuman">{topik.isi}</p>}
        </article>
      )}
      {lapor?.topik_id && <FormLapor sibuk={sibuk} onKirim={kirimLaporan} onBatal={() => setLapor(null)} />}

      <div className="baris sebar">
        <h2>Balasan ({balasan.length})</h2>
        <TombolIkon ikon="muat" label={memuat ? 'Memuat…' : 'Muat ulang'} onClick={muatUlang} disabled={memuat} />
      </div>
      {balasan.length === 0 && <Kosong>Belum ada balasan.</Kosong>}
      <ul className="daftar-balasan">
        {balasan.map((b) => {
          const milik = b.penulis_id === uid
          return (
            <li key={b.id} className={`balasan ${b.jawaban ? 'jawaban' : ''}`}>
              {ubah === b.id ? (
                <BalasanUbah
                  awal={b.isi}
                  sibuk={sibuk}
                  onSimpan={(isi) => ubahBalasan(b.id, { isi })}
                  onBatal={() => setUbah(null)}
                />
              ) : (
                <>
                  <div className="baris sebar">
                    <span className="topik-meta">
                      <Penulis nama={b.penulis_nama} guru={b.penulis_guru} /> · {waktuRelatif(b.dibuat_pada)}
                      {new Date(b.diubah_pada) - new Date(b.dibuat_pada) > 60000 && ' · diubah'}
                      {b.jawaban && <span className="lencana status-aktif">✓ Jawaban</span>}
                    </span>
                    <MenuTitik
                      label={`Aksi untuk balasan ${b.penulis_nama}`}
                      disabled={sibuk}
                      item={[
                        {
                          label: b.jawaban ? 'Batalkan tanda jawaban' : 'Tandai sebagai jawaban',
                          sembunyi: !kelola,
                          onPilih: () => ubahBalasan(b.id, { jawaban: !b.jawaban }),
                        },
                        { label: 'Ubah', sembunyi: !milik || (topik.ditutup && !kelola), onPilih: () => setUbah(b.id) },
                        { label: 'Laporkan', sembunyi: milik || kelola, onPilih: () => setLapor({ balasan_id: b.id }) },
                        {
                          label: 'Hapus',
                          bahaya: true,
                          sembunyi: !(kelola || milik),
                          konfirmasi: 'Hapus balasan ini?',
                          onPilih: () => hapusBalasan(b.id),
                        },
                      ]}
                    />
                  </div>
                  <p className="isi-pengumuman">{b.isi}</p>
                  {lapor?.balasan_id === b.id && (
                    <FormLapor sibuk={sibuk} onKirim={kirimLaporan} onBatal={() => setLapor(null)} />
                  )}
                </>
              )}
            </li>
          )
        })}
      </ul>

      {bisaBalas ? (
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault()
            if (isiBalasan.trim()) kirimBalasan()
          }}
        >
          <label>
            Tulis balasan
            <textarea rows={4} value={isiBalasan} maxLength={MAKS_ISI} onChange={(e) => setIsiBalasan(e.target.value)} />
          </label>
          <div>
            <button type="submit" className="btn utama" disabled={sibuk || !isiBalasan.trim()}>
              Kirim balasan
            </button>
          </div>
        </form>
      ) : (
        <p className="info">Topik ini ditutup oleh guru, jadi tidak bisa dibalas lagi.</p>
      )}
    </>
  )
}

function BalasanUbah({ awal, sibuk, onSimpan, onBatal }) {
  const [isi, setIsi] = useState(awal)
  return (
    <form
      className="bagian"
      onSubmit={(e) => {
        e.preventDefault()
        if (isi.trim()) onSimpan(isi.trim())
      }}
    >
      <textarea
        rows={4}
        aria-label="Isi balasan"
        value={isi}
        maxLength={MAKS_ISI}
        onChange={(e) => setIsi(e.target.value)}
        autoFocus
      />
      <div className="baris">
        <button type="submit" className="btn kecil utama" disabled={sibuk || !isi.trim()}>
          Simpan
        </button>
        <button type="button" className="btn kecil" onClick={onBatal} disabled={sibuk}>
          Batal
        </button>
      </div>
    </form>
  )
}