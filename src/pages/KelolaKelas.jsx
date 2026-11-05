import { Link, useNavigate, useParams } from 'react-router-dom'
import Ikon from '../components/Ikon.jsx'
import { Kosong, KotakGalat, LencanaStatus, Memuat, TombolKonfirmasi, TombolSalin, UbahDiTempat } from '../components/ui.jsx'
import { useAksi, useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'
import KelolaPengumuman from '../pengumuman/KelolaPengumuman.jsx'
import { unduhCsv } from '../ujian/csv.js'

// Kelola satu kelas: kode kelas, permintaan bergabung, daftar siswa dan progres.
export default function KelolaKelas() {
  const { kelasId } = useParams()
  const navigate = useNavigate()
  const { sibuk, galat, setGalat, jalankan } = useAksi()

  const { data, error, memuat, muatUlang } = useMuat(async () => {
    const kelas = ambil(
      await supabase
        .from('classes')
        .select('id,name,join_code,is_archived,course_id,courses!course_id(id,title)')
        .eq('id', kelasId)
        .maybeSingle(),
    )
    if (!kelas) return null
    const [daftar, progres, modul, nilai, nilaiTugas] = await Promise.all([
      supabase
        .from('enrollments')
        .select('id,user_id,status,requested_at,profiles(full_name,email,nisn,jenis_kelamin,no_hp)')
        .eq('class_id', kelasId)
        .order('requested_at'),
      supabase.from('progres_kelas').select('user_id,total_pelajaran,pelajaran_selesai,persen').eq('class_id', kelasId),
      supabase
        .from('modules')
        .select('position,lessons(id,title,position,kind,is_published)')
        .eq('course_id', kelas.course_id)
        .order('position')
        .order('position', { referencedTable: 'lessons' }),
      supabase.from('nilai_ujian_kelas').select('user_id,lesson_id,nilai_akhir,jumlah_percobaan').eq('class_id', kelasId),
      supabase
        .from('nilai_tugas_kelas')
        .select('user_id,lesson_id,nilai_maks,nilai,perlu_dinilai,terlambat')
        .eq('class_id', kelasId),
    ])
    return {
      kelas,
      pendaftar: ambil(daftar),
      progres: Object.fromEntries(ambil(progres).map((p) => [p.user_id, p])),
      ujian: ambil(modul).flatMap((m) => m.lessons.filter((l) => l.kind === 'ujian' && l.is_published)),
      tugas: ambil(modul).flatMap((m) => m.lessons.filter((l) => l.kind === 'tugas' && l.is_published)),
      nilai: Object.fromEntries(ambil(nilai).map((n) => [`${n.user_id}|${n.lesson_id}`, n])),
      nilaiTugas: Object.fromEntries(ambil(nilaiTugas).map((n) => [`${n.user_id}|${n.lesson_id}`, n])),
    }
  }, [kelasId])

  if (memuat && !data) return <Memuat bentuk="halaman" />
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
        <h1>Kelas tidak tersedia</h1>
        <p>Kelas tidak ditemukan atau bukan milik Anda.</p>
        <div>
          <Link className="btn" to="/">
            Kembali ke beranda
          </Link>
        </div>
      </main>
    )
  }

  const { kelas, pendaftar, progres, ujian, tugas, nilai, nilaiTugas } = data
  const menunggu = pendaftar.filter((p) => p.status === 'menunggu')
  const aktif = pendaftar.filter((p) => p.status === 'aktif')
  const lainnya = pendaftar.filter((p) => p.status === 'ditolak' || p.status === 'dikeluarkan')
  const nama = (p) => p.profiles?.full_name || p.profiles?.email || 'Tanpa nama'

  // Tugas: nilai bila sudah dinilai, 'menunggu' bila perlu dinilai, kosong bila belum kirim.
  const teksTugas = (n) => (!n || n.perlu_dinilai == null ? '' : n.perlu_dinilai ? 'menunggu' : fmt(n.nilai))
  const fmt = (n) => (n == null ? '' : String(Math.round(Number(n) * 100) / 100).replace('.', ','))
  const unduhNilai = () => {
    const kepala = [
      'Nama',
      'NISN',
      'Email',
      'Progres (%)',
      ...ujian.map((u) => u.title),
      ...tugas.map((t) => `${t.title} (tugas)`),
    ]
    const isi = aktif.map((p) => [
      nama(p),
      p.profiles?.nisn ?? '',
      p.profiles?.email ?? '',
      progres[p.user_id]?.persen ?? 0,
      ...ujian.map((u) => fmt(nilai[`${p.user_id}|${u.id}`]?.nilai_akhir)),
      ...tugas.map((t) => teksTugas(nilaiTugas[`${p.user_id}|${t.id}`])),
    ])
    unduhCsv(`Nilai ${kelas.name}.csv`, [kepala, ...isi])
  }

  const ubah = (fungsi) =>
    jalankan(async () => {
      await fungsi()
      await muatUlang()
    })
  const putuskan = (id, status) =>
    ubah(async () => ambil(await supabase.rpc('putuskan_pendaftaran', { pendaftaran: id, status_baru: status })))
  const ubahKelas = (patch) =>
    ubah(async () => ambil(await supabase.from('classes').update(patch).eq('id', kelasId).select('id')))
  const kodeBaru = () => ubah(async () => ambil(await supabase.rpc('buat_ulang_kode', { kelas: kelasId })))
  const hapusKelas = () =>
    jalankan(async () => {
      ambil(await supabase.from('classes').delete().eq('id', kelasId).select('id'))
      navigate(`/kursus/${kelas.course_id}`)
    })

  return (
    <main className="halaman">
      <div className="baris">
        <Link className="btn kecil" to="/">
          ← Beranda
        </Link>
        <Link className="btn kecil" to={`/kursus/${kelas.course_id}`}>
          Isi kursus: {kelas.courses?.title}
        </Link>
        <Link className="btn kecil" to={`/kelas/${kelasId}`}>
          Lihat sebagai siswa
        </Link>
        <Link className="btn kecil" to={`/kelas/${kelasId}/forum`}>
          <Ikon nama="forum" /> Forum
        </Link>
      </div>

      <UbahDiTempat tag="h1" nilai={kelas.name} label="nama kelas" onSimpan={(v) => ubahKelas({ name: v })} />
      <KotakGalat galat={galat} onTutup={() => setGalat('')} />

      <section className="panel" aria-labelledby="judul-kode">
        <h2 id="judul-kode">Kode kelas</h2>
        <p>
          <span className="kode">{kelas.join_code}</span> <TombolSalin teks={kelas.join_code} ikon label="Salin kode kelas" />
        </p>
        <p className="petunjuk">
          Bagikan kode ini ke siswa.{' '}
          {kelas.is_archived
            ? 'Kelas diarsipkan, jadi kode tidak bisa dipakai.'
            : 'Siswa yang memasukkan kode menunggu persetujuan Anda.'}
        </p>
      </section>

      <KelolaPengumuman kursusId={kelas.course_id} />

      <section className="bagian" aria-labelledby="judul-menunggu">
        <h2 id="judul-menunggu">Menunggu persetujuan ({menunggu.length})</h2>
        {menunggu.length === 0 ? (
          <Kosong>Tidak ada permintaan baru.</Kosong>
        ) : (
          <div className="tabel-bungkus">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {menunggu.map((p) => (
                  <tr key={p.id}>
                    <td>{nama(p)}</td>
                    <td>{p.profiles?.email}</td>
                    <td>
                      <div className="baris rapat">
                        <button
                          type="button"
                          className="btn kecil utama"
                          disabled={sibuk}
                          onClick={() => putuskan(p.id, 'aktif')}
                        >
                          Setujui
                        </button>
                        <button type="button" className="btn kecil" disabled={sibuk} onClick={() => putuskan(p.id, 'ditolak')}>
                          Tolak
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {menunggu.length > 1 && (
          <div>
            <button
              type="button"
              className="btn"
              disabled={sibuk}
              onClick={() =>
                ubah(async () => {
                  for (const p of menunggu) {
                    ambil(await supabase.rpc('putuskan_pendaftaran', { pendaftaran: p.id, status_baru: 'aktif' }))
                  }
                })
              }
            >
              Setujui semua
            </button>
          </div>
        )}
      </section>

      <section className="bagian" aria-labelledby="judul-siswa">
        <h2 id="judul-siswa">Siswa aktif ({aktif.length})</h2>
        {aktif.length === 0 ? (
          <Kosong>Belum ada siswa aktif.</Kosong>
        ) : (
          <div className="tabel-bungkus">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>NISN</th>
                  <th>L/P</th>
                  <th>No. HP</th>
                  <th>Email</th>
                  <th>Progres</th>
                  <th>
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {aktif.map((p) => {
                  const g = progres[p.user_id]
                  return (
                    <tr key={p.id}>
                      <td>{nama(p)}</td>
                      <td>{p.profiles?.nisn ?? '-'}</td>
                      <td>{p.profiles?.jenis_kelamin ?? '-'}</td>
                      <td>{p.profiles?.no_hp ?? '-'}</td>
                      <td>{p.profiles?.email}</td>
                      <td>{g ? `${g.pelajaran_selesai}/${g.total_pelajaran} (${g.persen}%)` : '0%'}</td>
                      <td>
                        <TombolKonfirmasi
                          label="Keluarkan"
                          tanya="Keluarkan siswa dari kelas?"
                          disabled={sibuk}
                          onYakin={() => putuskan(p.id, 'dikeluarkan')}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {aktif.length > 0 && (
        <section className="bagian" aria-labelledby="judul-nilai">
          <h2 id="judul-nilai">Nilai ujian dan tugas</h2>
          {ujian.length + tugas.length === 0 ? (
            <Kosong>Belum ada ujian atau tugas yang diterbitkan di kursus ini.</Kosong>
          ) : (
            <>
              <div className="tabel-geser">
                <table>
                  <thead>
                    <tr>
                      <th>Nama</th>
                      {ujian.map((u) => (
                        <th key={u.id}>{u.title}</th>
                      ))}
                      {tugas.map((t) => (
                        <th key={t.id}>{t.title} (tugas)</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {aktif.map((p) => (
                      <tr key={p.id}>
                        <td>{nama(p)}</td>
                        {ujian.map((u) => {
                          const n = nilai[`${p.user_id}|${u.id}`]
                          return <td key={u.id}>{n?.nilai_akhir == null ? '-' : fmt(n.nilai_akhir)}</td>
                        })}
                        {tugas.map((t) => {
                          const n = nilaiTugas[`${p.user_id}|${t.id}`]
                          const teks = teksTugas(n)
                          return (
                            <td key={t.id}>
                              {teks === '' ? '-' : n?.nilai_maks && teks !== 'menunggu' ? `${teks} / ${fmt(n.nilai_maks)}` : teks}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="baris">
                <button type="button" className="btn" onClick={unduhNilai}>
                  Unduh CSV nilai dan progres
                </button>
                <span className="petunjuk">Rincian per soal ada di tab Hasil pada setiap ujian.</span>
              </div>
            </>
          )}
        </section>
      )}

      {lainnya.length > 0 && (
        <section className="bagian" aria-labelledby="judul-lain">
          <h2 id="judul-lain">Ditolak atau dikeluarkan ({lainnya.length})</h2>
          <div className="tabel-bungkus">
            <table>
              <tbody>
                {lainnya.map((p) => (
                  <tr key={p.id}>
                    <td>{nama(p)}</td>
                    <td>
                      <LencanaStatus status={p.status} />
                    </td>
                    <td>
                      <button type="button" className="btn kecil" disabled={sibuk} onClick={() => putuskan(p.id, 'aktif')}>
                        Setujui kembali
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="panel zona-bahaya" aria-labelledby="judul-hapus-kelas">
        <h3 id="judul-hapus-kelas">Pengaturan lanjutan</h3>
        <div className="zona-baris">
          <p className="petunjuk">
            {kelas.is_archived
              ? 'Kelas diarsipkan. Buka arsip agar kode kelas bisa dipakai lagi.'
              : 'Arsipkan kelas bila sudah selesai. Kode kelas tidak bisa dipakai lagi, data tetap tersimpan.'}
          </p>
          <button
            type="button"
            className="btn kecil"
            disabled={sibuk}
            onClick={() => ubahKelas({ is_archived: !kelas.is_archived })}
          >
            {kelas.is_archived ? 'Buka arsip kelas' : 'Arsipkan kelas'}
          </button>
        </div>
        <div className="zona-baris">
          <p className="petunjuk">Buat kode baru jika kode lama bocor. Kode lama langsung tidak berlaku.</p>
          <TombolKonfirmasi
            label="Buat kode baru"
            tanya="Kode lama tidak berlaku lagi. Lanjut?"
            disabled={sibuk}
            onYakin={kodeBaru}
          />
        </div>
        <div className="zona-baris">
          <p className="petunjuk">Daftar siswa dan progres kelas ini ikut terhapus. Isi kursus tidak terpengaruh.</p>
          <TombolKonfirmasi
            label="Hapus kelas ini"
            tanya="Hapus kelas dan daftar siswanya?"
            disabled={sibuk}
            onYakin={hapusKelas}
          />
        </div>
      </section>
    </main>
  )
}