import { useMemo, useState } from 'react'
import { Kosong, KotakGalat, Memuat } from '../components/ui.jsx'
import { useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'
import { analisisButir, barisSiswa, ringkasan } from './analisis.js'
import { unduhCsv } from './csv.js'
import { NAMA_TIPE } from './konstanta.js'
import HasilUjian from './HasilUjian.jsx'

const angka = (n) => (n == null ? '-' : String(Math.round(Number(n) * 100) / 100).replace('.', ','))
const LABEL = { lulus: 'Lulus', belum_lulus: 'Belum lulus', berjalan: 'Sedang mengerjakan', belum: 'Belum mengerjakan' }
const KELAS_LENCANA = { lulus: 'status-aktif', belum_lulus: 'status-ditolak', berjalan: '', belum: '' }

// Hasil satu ujian untuk guru: ringkasan, nilai per siswa, rincian percobaan, analisis butir, unduh CSV.
export default function HasilUjianGuru({ pelajaranId, kursusId, judul }) {
  const [kelasId, setKelasId] = useState(null)
  const [lihat, setLihat] = useState(null)

  const { data, error, memuat, muatUlang } = useMuat(async () => {
    const kelas = ambil(await supabase.from('classes').select('id,name').eq('course_id', kursusId).order('created_at'))
    const ids = kelas.map((k) => k.id)
    const [st, soal, kunci, perc, hasil, nilai, daftar] = await Promise.all([
      supabase.from('ujian_pengaturan').select('kkm,maks_percobaan').eq('lesson_id', pelajaranId).single(),
      supabase.from('soal').select('id,type,position,prompt_text,options,points').eq('lesson_id', pelajaranId).order('position'),
      supabase.from('soal_kunci').select('soal_id,kunci,soal!inner(lesson_id)').eq('soal.lesson_id', pelajaranId),
      supabase
        .from('percobaan')
        .select('id,user_id,nomor,status,nilai,skor,skor_maks,selesai_pada,jawaban')
        .eq('lesson_id', pelajaranId)
        .order('nomor'),
      supabase
        .from('percobaan_hasil')
        .select('percobaan_id,hasil,percobaan!inner(lesson_id)')
        .eq('percobaan.lesson_id', pelajaranId),
      supabase.from('nilai_ujian_kelas').select('class_id,user_id,nilai_akhir').eq('lesson_id', pelajaranId),
      ids.length
        ? supabase
            .from('enrollments')
            .select('class_id,user_id,profiles(full_name,email,nisn)')
            .in('class_id', ids)
            .eq('status', 'aktif')
        : Promise.resolve({ data: [], error: null }),
    ])
    return {
      kelas,
      st: ambil(st),
      soal: ambil(soal),
      kunci: Object.fromEntries(ambil(kunci).map((k) => [k.soal_id, k.kunci])),
      percobaan: ambil(perc),
      hasil: Object.fromEntries(ambil(hasil).map((h) => [h.percobaan_id, h.hasil])),
      nilai: ambil(nilai),
      siswa: ambil(daftar),
    }
  }, [pelajaranId, kursusId])

  const pilih = kelasId ?? data?.kelas[0]?.id ?? null

  const tampil = useMemo(() => {
    if (!data || !pilih) return null
    const siswa = data.siswa
      .filter((s) => s.class_id === pilih)
      .map((s) => ({
        user_id: s.user_id,
        nama: s.profiles?.full_name || s.profiles?.email || 'Tanpa nama',
        email: s.profiles?.email ?? '',
        nisn: s.profiles?.nisn ?? '',
      }))
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
    const dipakai = new Set(siswa.map((s) => s.user_id))
    const percobaan = data.percobaan.filter((p) => dipakai.has(p.user_id))
    const nilaiAkhir = Object.fromEntries(data.nilai.filter((n) => n.class_id === pilih).map((n) => [n.user_id, n.nilai_akhir]))
    const baris = barisSiswa({ siswa, percobaan, nilaiAkhir, kkm: data.st.kkm, maks: data.st.maks_percobaan })
    const selesai = percobaan.filter((p) => p.status === 'selesai')
    return {
      baris,
      ring: ringkasan(baris),
      butir: analisisButir({ soal: data.soal, kunci: data.kunci, percobaan: selesai, hasil: data.hasil }),
      namaPer: Object.fromEntries(siswa.map((s) => [s.user_id, s.nama])),
    }
  }, [data, pilih])

  if (memuat && !data) return <Memuat />
  if (error) return <KotakGalat galat={pesanError(error)} />
  if (data.kelas.length === 0) return <Kosong>Belum ada kelas yang memakai kursus ini, jadi belum ada hasil.</Kosong>

  const { baris, ring, butir } = tampil
  const maks = data.st.maks_percobaan
  const namaKelas = data.kelas.find((k) => k.id === pilih)?.name ?? ''

  const unduh = () => {
    const kepala = [
      'Nama',
      'NISN',
      'Email',
      ...Array.from({ length: maks }, (_, i) => `Percobaan ${i + 1}`),
      'Nilai akhir',
      'Status',
    ]
    const isi = baris.map((b) => [
      b.nama,
      b.nisn,
      b.email,
      ...Array.from({ length: maks }, (_, i) => {
        const p = b.selesai.find((x) => x.nomor === i + 1)
        return p ? angka(p.nilai) : ''
      }),
      b.nilai == null ? '' : angka(b.nilai),
      LABEL[b.status],
    ])
    unduhCsv(`Nilai ${judul ?? 'ujian'} ${namaKelas}.csv`, [kepala, ...isi])
  }

  return (
    <div className="kolom hasil-guru">
      {data.kelas.length > 1 && (
        <div className="kolom">
          <label htmlFor="hasil-kelas">Kelas</label>
          <select
            id="hasil-kelas"
            value={pilih}
            onChange={(e) => {
              setKelasId(e.target.value)
              setLihat(null)
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
          <dd>{ring.jumlah}</dd>
        </div>
        <div>
          <dt>Sudah mengerjakan</dt>
          <dd>{ring.dikerjakan}</dd>
        </div>
        <div>
          <dt>Belum</dt>
          <dd>{ring.belum}</dd>
        </div>
        <div>
          <dt>Lulus (KKM {angka(data.st.kkm)})</dt>
          <dd>{ring.lulus}</dd>
        </div>
        <div>
          <dt>Rata-rata</dt>
          <dd>{angka(ring.rata)}</dd>
        </div>
        <div>
          <dt>Tertinggi / terendah</dt>
          <dd>
            {angka(ring.tertinggi)} / {angka(ring.terendah)}
          </dd>
        </div>
      </dl>

      <div className="baris">
        <h3 style={{ margin: 0 }}>Nilai siswa</h3>
        <button type="button" className="btn kecil" onClick={unduh} disabled={baris.length === 0}>
          Unduh CSV
        </button>
        <button type="button" className="btn kecil" onClick={muatUlang}>
          Muat ulang
        </button>
      </div>

      {baris.length === 0 ? (
        <Kosong>Belum ada siswa aktif di kelas ini.</Kosong>
      ) : (
        <div className="tabel-bungkus">
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>NISN</th>
                <th>Percobaan</th>
                <th>Nilai akhir</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((b) => (
                <tr key={b.user_id}>
                  <td>{b.nama}</td>
                  <td>{b.nisn || '-'}</td>
                  <td>
                    <div className="baris rapat">
                      {b.selesai.length === 0 && <span className="petunjuk">-</span>}
                      {b.selesai.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="btn kecil"
                          aria-label={`Rincian percobaan ${p.nomor} ${b.nama}, nilai ${angka(p.nilai)}`}
                          aria-pressed={lihat === p.id}
                          onClick={() => setLihat(lihat === p.id ? null : p.id)}
                        >
                          {p.nomor}: {angka(p.nilai)}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td>
                    <strong>{angka(b.nilai)}</strong>
                  </td>
                  <td>
                    <span className={`lencana ${KELAS_LENCANA[b.status]}`}>{LABEL[b.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {lihat && (
        <section className="panel" aria-label="Rincian percobaan">
          <p className="petunjuk">Jawaban {tampil.namaPer[data.percobaan.find((p) => p.id === lihat)?.user_id] ?? ''}</p>
          <HasilUjian key={lihat} idPercobaan={lihat} onTutup={() => setLihat(null)} />
        </section>
      )}

      <h3>Analisis butir soal</h3>
      <p className="petunjuk">
        Dihitung dari semua percobaan yang sudah dikumpulkan siswa kelas ini. Soal dengan persen benar rendah mungkin sulit, atau
        kuncinya perlu diperiksa.
      </p>
      {butir.length === 0 || butir.every((x) => x.n === 0) ? (
        <Kosong>Belum ada percobaan yang dikumpulkan.</Kosong>
      ) : (
        <div className="tabel-bungkus">
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Soal</th>
                <th>Benar</th>
                <th>Tingkat</th>
                <th>Rata-rata poin</th>
                <th>Sebaran jawaban</th>
              </tr>
            </thead>
            <tbody>
              {butir.map((x, i) => (
                <tr key={x.soal.id}>
                  <td>{i + 1}</td>
                  <td>
                    <span className="petunjuk">{NAMA_TIPE[x.soal.type]}</span>
                    <br />
                    {(x.soal.prompt_text ?? '').slice(0, 90)}
                  </td>
                  <td>
                    {x.persen == null ? '-' : `${x.persen}%`}
                    <span className="petunjuk">
                      {' '}
                      ({x.benar}/{x.n})
                    </span>
                  </td>
                  <td>{x.tingkat}</td>
                  <td>
                    {angka(x.rataPoin)} / {angka(x.soal.points)}
                  </td>
                  <td>
                    {x.soal.type === 'isian_singkat' ? (
                      <span className="petunjuk">Kosong: {x.kosong}</span>
                    ) : (
                      <span>
                        {x.opsi.map((o, n) => (
                          <span key={o.id} className="sebaran">
                            {x.soal.type === 'benar_salah' ? o.teks : String.fromCharCode(65 + n)}: {o.dipilih}
                            {o.kunci ? ' ✓' : ''}
                          </span>
                        ))}
                        <span className="sebaran petunjuk">Kosong: {x.kosong}</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}