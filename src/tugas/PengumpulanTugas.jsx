import { useMemo, useState } from 'react'
import { TombolIkon } from '../components/Ikon.jsx'
import { Kosong, KotakGalat, Memuat } from '../components/ui.jsx'
import { unduhCsv } from '../ujian/csv.js'
import { useAksi, useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'
import { angka, embedTugas, SANDBOX_TUGAS, waktu } from './tampil.js'

const STATUS = { belum: 'Belum kirim', perlu: 'Perlu dinilai', dinilai: 'Sudah dinilai' }

// Guru melihat kiriman per siswa, membuka tautan sebagai embed, lalu menilai.
export default function PengumpulanTugas({ pelajaranId, kursusId, judul }) {
  const [kelasId, setKelasId] = useState(null)
  const [pilih, setPilih] = useState(null)

  const { data, error, memuat, muatUlang } = useMuat(async () => {
    const kelas = ambil(await supabase.from('classes').select('id,name').eq('course_id', kursusId).order('created_at'))
    const ids = kelas.map((k) => k.id)
    const [st, kiriman, daftar] = await Promise.all([
      supabase.from('tugas_pengaturan').select('nilai_maks,tenggat').eq('lesson_id', pelajaranId).single(),
      supabase
        .from('pengumpulan_tugas')
        .select('id,user_id,tautan,catatan,dikirim_pada,terlambat,perlu_dinilai,nilai,nilai_sebelumnya,komentar')
        .eq('lesson_id', pelajaranId),
      ids.length
        ? supabase
            .from('enrollments')
            .select('class_id,user_id,profiles(full_name,email,nisn)')
            .in('class_id', ids)
            .eq('status', 'aktif')
        : Promise.resolve({ data: [], error: null }),
    ])
    return { kelas, st: ambil(st), kiriman: ambil(kiriman), siswa: ambil(daftar) }
  }, [pelajaranId, kursusId])

  const kelasAktif = kelasId ?? data?.kelas[0]?.id ?? null
  const baris = useMemo(() => {
    if (!data) return []
    const per = Object.fromEntries(data.kiriman.map((k) => [k.user_id, k]))
    return data.siswa
      .filter((s) => s.class_id === kelasAktif)
      .map((s) => {
        const k = per[s.user_id] ?? null
        return {
          user_id: s.user_id,
          nama: s.profiles?.full_name || s.profiles?.email || 'Tanpa nama',
          nisn: s.profiles?.nisn ?? '',
          email: s.profiles?.email ?? '',
          k,
          status: !k ? 'belum' : k.perlu_dinilai ? 'perlu' : 'dinilai',
        }
      })
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
  }, [data, kelasAktif])

  if (memuat && !data) return <Memuat />
  if (error) return <KotakGalat galat={pesanError(error)} />
  if (data.kelas.length === 0) return <Kosong>Belum ada kelas yang memakai kursus ini, jadi belum ada kiriman.</Kosong>

  const maks = data.st.nilai_maks
  const terpilih = baris.find((b) => b.user_id === pilih) ?? null
  const perlu = baris.filter((b) => b.status === 'perlu')
  const hitung = (s) => baris.filter((b) => b.status === s).length
  const namaKelas = data.kelas.find((k) => k.id === kelasAktif)?.name ?? ''

  const unduh = () =>
    unduhCsv(`Tugas ${judul ?? ''} ${namaKelas}.csv`, [
      ['Nama', 'NISN', 'Email', 'Status', 'Dikirim', 'Terlambat', `Nilai (maks ${maks})`, 'Komentar'],
      ...baris.map((b) => [
        b.nama,
        b.nisn,
        b.email,
        STATUS[b.status],
        b.k ? waktu(b.k.dikirim_pada) : '',
        b.k?.terlambat ? 'Ya' : '',
        b.k?.nilai == null ? '' : angka(b.k.nilai),
        b.k?.komentar ?? '',
      ]),
    ])

  return (
    <div className="kolom hasil-guru">
      {data.kelas.length > 1 && (
        <div className="kolom">
          <label htmlFor="tg-kelas">Kelas</label>
          <select
            id="tg-kelas"
            value={kelasAktif ?? ''}
            onChange={(e) => {
              setKelasId(e.target.value)
              setPilih(null)
            }}
          >
            {data.kelas.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <dl className="ringkas-ujian">
        <div>
          <dt>Siswa aktif</dt>
          <dd>{baris.length}</dd>
        </div>
        <div>
          <dt>Belum kirim</dt>
          <dd>{hitung('belum')}</dd>
        </div>
        <div>
          <dt>Perlu dinilai</dt>
          <dd>{hitung('perlu')}</dd>
        </div>
        <div>
          <dt>Sudah dinilai</dt>
          <dd>{hitung('dinilai')}</dd>
        </div>
      </dl>

      <div className="baris">
        <h3 style={{ margin: 0 }}>Kiriman siswa</h3>
        <button type="button" className="btn kecil" onClick={unduh}>
          Unduh CSV
        </button>
        <TombolIkon ikon="muat" label="Muat ulang" onClick={muatUlang} />
        {perlu.length > 0 && (
          <button type="button" className="btn kecil utama" onClick={() => setPilih(perlu[0].user_id)}>
            Nilai berikutnya ({perlu.length})
          </button>
        )}
      </div>

      {baris.length === 0 ? (
        <Kosong>Belum ada siswa aktif di kelas ini.</Kosong>
      ) : (
        <div className="tabel-bungkus">
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Status</th>
                <th>Dikirim</th>
                <th>Nilai</th>
                <th>
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {baris.map((b) => (
                <tr key={b.user_id}>
                  <td data-label="Nama">{b.nama}</td>
                  <td data-label="Status">
                    <span className={`lencana ${b.status === 'dinilai' ? 'status-aktif' : ''}`}>{STATUS[b.status]}</span>
                    {b.k?.terlambat && <span className="lencana"> Terlambat</span>}
                  </td>
                  <td data-label="Dikirim">{b.k ? waktu(b.k.dikirim_pada) : '-'}</td>
                  <td data-label="Nilai">{b.k?.nilai == null ? '-' : `${angka(b.k.nilai)} / ${angka(maks)}`}</td>
                  <td>
                    {b.k && (
                      <button
                        type="button"
                        className="btn kecil"
                        aria-pressed={pilih === b.user_id}
                        aria-label={`${pilih === b.user_id ? 'Tutup' : 'Buka'} kiriman ${b.nama}`}
                        onClick={() => setPilih(pilih === b.user_id ? null : b.user_id)}
                      >
                        {pilih === b.user_id ? 'Tutup' : b.status === 'perlu' ? 'Buka dan nilai' : 'Buka'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {terpilih?.k && (
        <Penilaian
          key={`${terpilih.k.id}-${terpilih.k.dikirim_pada}`}
          baris={terpilih}
          maks={maks}
          onSelesai={() => {
            muatUlang()
          }}
        />
      )}
    </div>
  )
}

function Penilaian({ baris, maks, onSelesai }) {
  const k = baris.k
  const { sibuk, galat, setGalat, jalankan } = useAksi()
  const [nilai, setNilai] = useState(k.nilai == null ? '' : String(k.nilai))
  const [komentar, setKomentar] = useState(k.komentar ?? '')
  const [tersimpan, setTersimpan] = useState(false)

  const simpan = (e) => {
    e.preventDefault()
    const n = Number(String(nilai).replace(',', '.'))
    if (String(nilai).trim() === '' || !Number.isFinite(n) || n < 0 || n > maks)
      return setGalat(`Nilai harus antara 0 dan ${angka(maks)}.`)
    return jalankan(async () => {
      ambil(await supabase.rpc('nilai_tugas', { id_pengumpulan: k.id, nilai_baru: n, komentar_baru: komentar.trim() || null }))
      setTersimpan(true)
      onSelesai()
    })
  }

  return (
    <section className="panel" aria-label={`Kiriman ${baris.nama}`}>
      <h3>{baris.nama}</h3>
      <p className="petunjuk">
        Dikirim {waktu(k.dikirim_pada)}
        {k.terlambat ? ' · terlambat' : ''}
      </p>
      {k.nilai == null && k.nilai_sebelumnya != null && (
        <p className="info">
          Siswa mengirim ulang. Nilai sebelumnya: {angka(k.nilai_sebelumnya)} dari {angka(maks)}.
        </p>
      )}
      {k.catatan && <p className="catatan-siswa">Catatan siswa: {k.catatan}</p>}
      <div className="kolom">
        {k.tautan.map((t, n) => (
          <TautanKiriman key={n} tautan={t} />
        ))}
      </div>
      <form className="kolom" onSubmit={simpan}>
        <div className="form-baris">
          <div className="kolom" style={{ flex: '0 0 180px' }}>
            <label htmlFor="tg-nilai-isi">Nilai (maks {angka(maks)})</label>
            <input
              id="tg-nilai-isi"
              inputMode="decimal"
              value={nilai}
              onChange={(e) => {
                setNilai(e.target.value)
                setTersimpan(false)
              }}
            />
          </div>
          <div className="kolom">
            <label htmlFor="tg-komentar">Komentar untuk siswa (boleh kosong)</label>
            <textarea
              id="tg-komentar"
              rows={2}
              maxLength={2000}
              value={komentar}
              onChange={(e) => {
                setKomentar(e.target.value)
                setTersimpan(false)
              }}
            />
          </div>
        </div>
        <KotakGalat galat={galat} onTutup={() => setGalat('')} />
        <div className="baris">
          <button type="submit" className="btn utama" disabled={sibuk}>
            {k.nilai == null ? 'Simpan penilaian' : 'Perbarui penilaian'}
          </button>
          {tersimpan && (
            <span role="status" className="petunjuk">
              Tersimpan.
            </span>
          )}
        </div>
      </form>
    </section>
  )
}

function TautanKiriman({ tautan }) {
  const embed = embedTugas(tautan.url)
  return (
    <figure className="embed">
      <figcaption className="baris">
        <strong>{tautan.label || embed?.jenis || 'Tautan'}</strong>
        <a href={tautan.url} target="_blank" rel="noopener noreferrer" className="kecil-teks">
          Buka di tab baru ↗
        </a>
      </figcaption>
      {embed ? (
        <div className={`embed-kotak ${embed.rasio}`}>
          <iframe
            title={tautan.label || embed.jenis}
            src={embed.src}
            loading="lazy"
            allow="fullscreen"
            allowFullScreen
            sandbox={SANDBOX_TUGAS}
          />
        </div>
      ) : (
        <p className="petunjuk">Tautan ini tidak bisa ditampilkan di halaman. Buka di tab baru untuk memeriksanya.</p>
      )}
      <p className="kecil-teks tautan-teks">{tautan.url}</p>
    </figure>
  )
}