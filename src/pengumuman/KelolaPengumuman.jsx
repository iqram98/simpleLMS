import { useState } from 'react'
import { Kosong, KotakGalat, MenuTitik } from '../components/ui.jsx'
import { useAksi, useMuat } from '../lib/hooks.js'
import { ambil, supabase } from '../lib/supabase.js'
import { urutkanPengumuman, waktuPengumuman } from './tampil.js'

const MAKS_JUDUL = 150
const MAKS_ISI = 5000

function Formulir({ awal, sibuk, onSimpan, onBatal }) {
  const [judul, setJudul] = useState(awal?.judul ?? '')
  const [isi, setIsi] = useState(awal?.isi ?? '')
  const [sematkan, setSematkan] = useState(awal?.disematkan ?? false)
  const sah = judul.trim().length > 0 && judul.length <= MAKS_JUDUL && isi.length <= MAKS_ISI
  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault()
        if (sah) onSimpan({ judul: judul.trim(), isi: isi.trim(), disematkan: sematkan })
      }}
    >
      <label>
        Judul
        <input value={judul} maxLength={MAKS_JUDUL} onChange={(e) => setJudul(e.target.value)} autoFocus />
      </label>
      <label>
        Isi pengumuman
        <textarea rows={5} value={isi} maxLength={MAKS_ISI} onChange={(e) => setIsi(e.target.value)} />
        <span className="petunjuk">
          {isi.length} / {MAKS_ISI} karakter
        </span>
      </label>
      <label className="baris rapat">
        <input type="checkbox" checked={sematkan} onChange={(e) => setSematkan(e.target.checked)} />
        Sematkan di bagian atas
      </label>
      <div className="baris">
        <button type="submit" className="btn utama" disabled={!sah || sibuk}>
          {awal ? 'Simpan perubahan' : 'Terbitkan'}
        </button>
        <button type="button" className="btn" onClick={onBatal} disabled={sibuk}>
          Batal
        </button>
      </div>
    </form>
  )
}

// Kelola pengumuman satu kursus (berlaku untuk semua kelas pada kursus itu).
export default function KelolaPengumuman({ kursusId }) {
  const { sibuk, galat, setGalat, jalankan } = useAksi()
  const [mode, setMode] = useState(null) // null | 'baru' | id pengumuman yang diubah
  const { data, memuat, muatUlang } = useMuat(
    async () =>
      urutkanPengumuman(
        ambil(
          await supabase
            .from('pengumuman')
            .select('id,judul,isi,disematkan,dibuat_pada,diubah_pada')
            .eq('course_id', kursusId)
            .order('dibuat_pada', { ascending: false })
            .limit(200),
        ),
      ),
    [kursusId],
  )

  const ubah = (fungsi) =>
    jalankan(async () => {
      await fungsi()
      setMode(null)
      await muatUlang()
    })
  const tambah = (v) =>
    ubah(async () =>
      ambil(
        await supabase
          .from('pengumuman')
          .insert({ course_id: kursusId, ...v })
          .select('id'),
      ),
    )
  const simpan = (id, v) => ubah(async () => ambil(await supabase.from('pengumuman').update(v).eq('id', id).select('id')))
  const hapus = (id) => ubah(async () => ambil(await supabase.from('pengumuman').delete().eq('id', id).select('id')))

  return (
    <section className="bagian" aria-labelledby="judul-kelola-pengumuman">
      <div className="baris sebar">
        <h2 id="judul-kelola-pengumuman">Pengumuman ({data?.length ?? 0})</h2>
        {mode === null && (
          <button type="button" className="btn kecil utama" onClick={() => setMode('baru')}>
            + Pengumuman baru
          </button>
        )}
      </div>
      <p className="petunjuk">Tampil di halaman depan kelas untuk semua siswa pada kursus ini.</p>
      <KotakGalat galat={galat} onTutup={() => setGalat('')} />
      {mode === 'baru' && <Formulir sibuk={sibuk} onSimpan={tambah} onBatal={() => setMode(null)} />}
      {!memuat && data?.length === 0 && mode !== 'baru' && <Kosong>Belum ada pengumuman.</Kosong>}
      <div className="daftar-pengumuman">
        {data?.map((p) =>
          mode === p.id ? (
            <Formulir key={p.id} awal={p} sibuk={sibuk} onSimpan={(v) => simpan(p.id, v)} onBatal={() => setMode(null)} />
          ) : (
            <article key={p.id} className={`pengumuman${p.disematkan ? ' disematkan' : ''}`}>
              <div className="baris sebar">
                <h3>
                  {p.disematkan && (
                    <span className="pin" role="img" aria-label="Disematkan">
                      📌
                    </span>
                  )}
                  {p.judul}
                </h3>
                <MenuTitik
                  label={`Aksi untuk ${p.judul}`}
                  disabled={sibuk}
                  item={[
                    { label: 'Ubah', onPilih: () => setMode(p.id) },
                    {
                      label: p.disematkan ? 'Lepas sematan' : 'Sematkan',
                      onPilih: () => simpan(p.id, { disematkan: !p.disematkan }),
                    },
                    { label: 'Hapus', bahaya: true, konfirmasi: 'Hapus pengumuman ini?', onPilih: () => hapus(p.id) },
                  ]}
                />
              </div>
              <p className="sub-pengumuman">{waktuPengumuman(p.dibuat_pada)}</p>
              {p.isi && <p className="isi-pengumuman">{p.isi}</p>}
            </article>
          ),
        )}
      </div>
    </section>
  )
}