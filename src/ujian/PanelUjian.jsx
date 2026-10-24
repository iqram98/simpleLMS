import { useCallback, useEffect, useState } from 'react'
import { KotakGalat, Memuat } from '../components/ui.jsx'
import { useAksi, useMuat } from '../lib/hooks.js'
import { ambil, pesanError, supabase } from '../lib/supabase.js'
import { ATURAN_NILAI, PEMBAHASAN } from './konstanta.js'
import HasilUjian from './HasilUjian.jsx'
import PengerjaanUjian from './PengerjaanUjian.jsx'

const angka = (n) => (n == null ? '-' : String(Math.round(Number(n) * 100) / 100).replace('.', ','))
const waktu = (iso) =>
  new Date(iso).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

// Bagian ujian di halaman siswa: ringkasan, riwayat percobaan, mulai/lanjutkan,
// mengerjakan, dan hasil. aktif=false untuk pratinjau guru (hanya ringkasan).
export default function PanelUjian({ pelajaranId, kelasId, uid, aktif, onNilaiBerubah, onKerja }) {
  const [layar, setLayar] = useState({ nama: 'ringkas' })
  const { sibuk, galat, setGalat, jalankan } = useAksi()
  const kerja = layar.nama === 'kerja'
  useEffect(() => {
    onKerja?.(kerja)
    return () => onKerja?.(false)
  }, [kerja, onKerja])

  const { data, error, memuat, muatUlang } = useMuat(async () => {
    const [st, jumlah, percobaan, nilai] = await Promise.all([
      supabase
        .from('ujian_pengaturan')
        .select('durasi_menit,maks_percobaan,kkm,aturan_nilai,wajib_lulus,buka_pada,tutup_pada,pembahasan')
        .eq('lesson_id', pelajaranId)
        .maybeSingle(),
      supabase.rpc('ringkasan_soal', { pelajaran: pelajaranId }),
      aktif
        ? supabase
            .from('percobaan')
            .select('id,nomor,status,nilai,skor,skor_maks,perlu_dinilai,mulai_pada,batas_pada,selesai_pada')
            .eq('lesson_id', pelajaranId)
            .eq('user_id', uid)
            .order('nomor')
        : Promise.resolve({ data: [], error: null }),
      aktif
        ? supabase
            .from('nilai_ujian_kelas')
            .select('nilai_akhir,jumlah_percobaan')
            .eq('class_id', kelasId)
            .eq('lesson_id', pelajaranId)
            .eq('user_id', uid)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])
    let riwayat = ambil(percobaan)
    // Percobaan yang waktunya sudah lewat dinilai dulu agar tampil sebagai selesai.
    const lewat = riwayat.find((p) => p.status === 'berjalan' && p.batas_pada && Date.parse(p.batas_pada) + 30000 < Date.now())
    if (lewat) {
      try {
        ambil(await supabase.rpc('kumpulkan_ujian', { id_percobaan: lewat.id }))
        riwayat = ambil(
          await supabase
            .from('percobaan')
            .select('id,nomor,status,nilai,skor,skor_maks,perlu_dinilai,mulai_pada,batas_pada,selesai_pada')
            .eq('lesson_id', pelajaranId)
            .eq('user_id', uid)
            .order('nomor'),
        )
        onNilaiBerubah?.()
      } catch {
        /* biarkan; akan dicoba lagi saat halaman dibuka */
      }
    }
    return {
      st: ambil(st),
      soal: ambil(jumlah)?.jumlah ?? 0,
      riwayat,
      nilaiAkhir: ambil(nilai)?.nilai_akhir ?? null,
    }
  }, [pelajaranId, kelasId, uid, aktif])

  const selesaiMengerjakan = useCallback(
    (id, otomatis) => {
      setLayar({ nama: 'hasil', id, otomatis })
      onNilaiBerubah?.()
      muatUlang()
    },
    [onNilaiBerubah, muatUlang],
  )

  const mulai = () =>
    jalankan(async () => {
      const d = ambil(await supabase.rpc('mulai_ujian', { pelajaran: pelajaranId }))
      setLayar({ nama: 'kerja', data: d })
    })

  if (memuat && !data) return <Memuat />
  if (error) return <KotakGalat galat={pesanError(error)} />
  const { st, soal, riwayat, nilaiAkhir } = data
  if (!st) return <p className="info">Pengaturan ujian belum tersedia.</p>

  if (layar.nama === 'kerja') {
    return (
      <PengerjaanUjian
        key={layar.data.percobaan_id}
        data={layar.data}
        onSelesai={(oto) => selesaiMengerjakan(layar.data.percobaan_id, oto)}
      />
    )
  }
  if (layar.nama === 'hasil') {
    return <HasilUjian idPercobaan={layar.id} otomatis={layar.otomatis} onTutup={() => setLayar({ nama: 'ringkas' })} />
  }

  const selesai = riwayat.filter((p) => p.status === 'selesai')
  const berjalan = riwayat.find((p) => p.status === 'berjalan')
  const sekarang = Date.now()
  const belumBuka = st.buka_pada && sekarang < Date.parse(st.buka_pada)
  const sudahTutup = st.tutup_pada && sekarang > Date.parse(st.tutup_pada)
  const habis = !berjalan && riwayat.length >= st.maks_percobaan
  let alasan = ''
  if (!berjalan) {
    if (soal === 0) alasan = 'Ujian ini belum punya soal.'
    else if (belumBuka) alasan = `Ujian dibuka pada ${waktu(st.buka_pada)}.`
    else if (sudahTutup) alasan = `Ujian ditutup sejak ${waktu(st.tutup_pada)}.`
    else if (habis) alasan = 'Semua kesempatan sudah dipakai.'
  }
  const aturan = ATURAN_NILAI.find((a) => a.nilai === st.aturan_nilai)
  const pembahasan = PEMBAHASAN.find((p) => p.nilai === st.pembahasan)
  const lulus = nilaiAkhir != null && Number(nilaiAkhir) >= Number(st.kkm)

  return (
    <section className="panel panel-ujian" aria-label="Informasi ujian">
      <h2>Tentang ujian ini</h2>
      <dl className="ringkas-ujian">
        <div>
          <dt>Soal</dt>
          <dd>{soal}</dd>
        </div>
        <div>
          <dt>Waktu</dt>
          <dd>{st.durasi_menit ? `${st.durasi_menit} menit` : 'Tanpa batas'}</dd>
        </div>
        <div>
          <dt>Kesempatan</dt>
          <dd>{st.maks_percobaan} kali</dd>
        </div>
        <div>
          <dt>KKM</dt>
          <dd>{angka(st.kkm)}</dd>
        </div>
        {st.buka_pada && (
          <div>
            <dt>Dibuka</dt>
            <dd>{waktu(st.buka_pada)}</dd>
          </div>
        )}
        {st.tutup_pada && (
          <div>
            <dt>Ditutup</dt>
            <dd>{waktu(st.tutup_pada)}</dd>
          </div>
        )}
      </dl>
      <p className="petunjuk">
        Nilai akhir: {aturan?.label.toLowerCase()}. {pembahasan?.label}.{' '}
        {st.wajib_lulus && 'Kamu harus mencapai KKM agar pelajaran ini dianggap selesai.'}
      </p>

      {!aktif && <p className="info">Pratinjau guru: tombol mengerjakan hanya muncul untuk siswa.</p>}

      {aktif && (
        <>
          {nilaiAkhir != null && (
            <p className="nilai-akhir">
              Nilai akhirmu: <strong>{angka(nilaiAkhir)}</strong> {lulus ? '✓ mencapai KKM' : '(belum mencapai KKM)'}
            </p>
          )}
          {nilaiAkhir == null && riwayat.some((p) => p.perlu_dinilai) && (
            <p className="nilai-akhir">Nilai akhirmu: menunggu penilaian guru.</p>
          )}
          <p>
            Percobaan terpakai: {riwayat.length} dari {st.maks_percobaan}
          </p>
          {selesai.length > 0 && (
            <ul className="riwayat-ujian">
              {selesai.map((p) => (
                <li key={p.id} className="baris">
                  <span>
                    Percobaan {p.nomor}:{' '}
                    <strong>{p.perlu_dinilai ? 'menunggu penilaian' : p.nilai == null ? 'terkirim' : angka(p.nilai)}</strong>
                    <span className="petunjuk"> ({waktu(p.selesai_pada)})</span>
                  </span>
                  <button type="button" className="btn kecil" onClick={() => setLayar({ nama: 'hasil', id: p.id })}>
                    Lihat hasil
                  </button>
                </li>
              ))}
            </ul>
          )}
          <KotakGalat galat={galat} onTutup={() => setGalat('')} />
          {alasan && <p className="info">{alasan}</p>}
          {!alasan && (
            <div>
              {!berjalan && st.durasi_menit && (
                <p className="petunjuk">
                  Waktu mulai berjalan begitu kamu menekan tombol dan tidak berhenti walau halaman ditutup.
                </p>
              )}
              <button type="button" className="btn utama" disabled={sibuk} onClick={mulai}>
                {berjalan ? 'Lanjutkan mengerjakan' : riwayat.length ? 'Ulangi ujian' : 'Mulai ujian'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}