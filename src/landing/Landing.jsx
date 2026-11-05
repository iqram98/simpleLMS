import { useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { KotakGalat } from '../components/ui.jsx'
import { pesanError } from '../lib/supabase.js'
import { useTema } from '../tema/TemaProvider.jsx'
import IlustrasiHero from './IlustrasiHero.jsx'
import Ik, { Bintang } from './ikon.jsx'
import { FITUR, LANGKAH, POIN_TENTANG, TANYA_JAWAB } from './isi.js'
import { Atas, Kaki } from './rangka.jsx'
import { useMuncul } from './useMuncul.js'
import './landing.css'

// Elemen yang muncul perlahan saat digulir. i = urutan dalam satu baris (jeda antar kartu).
function M({ as: Tag = 'div', i = 0, className = '', children, ...sisa }) {
  return (
    <Tag className={`muncul ${className}`.trim()} style={{ '--i': i }} {...sisa}>
      {children}
    </Tag>
  )
}

function TombolMasuk({ kelas, teks = 'Masuk dengan Google' }) {
  const { masukGoogle } = useAuth()
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')
  const masuk = async () => {
    setSibuk(true)
    setGalat('')
    const { error } = await masukGoogle()
    if (error) {
      setGalat(pesanError(error))
      setSibuk(false)
    }
  }
  return (
    <>
      <button type="button" className={`lp-btn ${kelas}`} onClick={masuk} disabled={sibuk}>
        {sibuk ? 'Membuka Google…' : teks}
      </button>
      {galat && <KotakGalat galat={galat} />}
    </>
  )
}

export default function Landing() {
  const { situs } = useTema()
  const nama = situs.nama_situs
  const akar = useRef(null)
  useMuncul(akar)

  return (
    <div className="lp" ref={akar}>
      <Atas />
      <main>
        <section className="lp-hero">
          <div className="lp-lebar lp-hero-isi">
            <div className="lp-hero-teks">
              <M as="span" className="lp-lencana">
                Kelas online untuk guru dan siswa
              </M>
              <M as="h1" i={1}>
                Belajar apa saja, <span className="lp-emas">di mana saja.</span>
              </M>
              <M as="p" i={2} className="lp-lead">
                {nama} adalah tempat guru membagikan materi, ujian, dan tugas, dan siswa belajar dengan tenang dari HP maupun
                komputer.
              </M>
              <M i={3} className="lp-aksi">
                <TombolMasuk kelas="lp-btn-putih lp-btn-besar" />
                <a href="#tentang" className="lp-btn lp-btn-garis lp-btn-besar">
                  Pelajari lebih lanjut
                </a>
              </M>
              <M as="p" i={4} className="lp-catatan">
                Cukup akun Google. Tidak perlu membuat kata sandi baru.
              </M>
            </div>
            <M i={2} className="lp-hero-gambar">
              <IlustrasiHero />
            </M>
          </div>
        </section>

        <section id="tentang" className="lp-bagian">
          <div className="lp-lebar lp-tentang">
            <div className="lp-tentang-teks">
              <M as="span" className="lp-label">
                Tentang {nama}
              </M>
              <M as="h2" i={1}>
                Kelas online yang sederhana, tanpa ribet.
              </M>
              <M as="p" i={2} className="lp-lead-gelap">
                Guru menyusun kursus berisi materi, ujian, dan tugas. Siswa membukanya kapan saja, mengerjakan, lalu melihat
                kemajuannya sendiri. Semua ada di satu tempat.
              </M>
              <M as="ul" i={3} className="lp-poin">
                {POIN_TENTANG.map((p) => (
                  <li key={p}>
                    <span className="lp-centang">
                      <Ik nama="cek" ukuran={14} tebal={3.5} />
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </M>
            </div>
            <M i={2} className="lp-contoh-bungkus">
              <div className="lp-contoh">
                <div className="lp-contoh-atas">
                  <strong>Contoh tampilan kursus</strong>
                  <span>20%</span>
                </div>
                <div className="lp-bar">
                  <div style={{ width: '20%' }} />
                </div>
                <ul className="lp-daftar-contoh">
                  <li className="aktif">
                    <span className="lp-bulat selesai">
                      <Ik nama="cek" ukuran={12} tebal={4} />
                    </span>
                    <b>Pengenalan modul</b>
                  </li>
                  <li>
                    <span className="lp-bulat selesai">
                      <Ik nama="cek" ukuran={12} tebal={4} />
                    </span>
                    Ringkasan pembelajaran
                  </li>
                  <li>
                    <span className="lp-bulat" />
                    Materi 1: Dasar-dasar
                  </li>
                  <li>
                    <span className="lp-bulat" />
                    Latihan soal
                  </li>
                </ul>
                <div className="lp-bingkai-video">
                  <div className="lp-bingkai-judul">Tonton video di bawah ini</div>
                  <div className="lp-bingkai-isi">
                    <div className="lp-video">
                      <span>
                        <Ik nama="main" ukuran={14} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </M>
          </div>
        </section>

        <section className="lp-bagian">
          <div className="lp-lebar">
            <div className="lp-kepala">
              <M as="span" className="lp-label">
                Untuk siapa
              </M>
              <M as="h2" i={1}>
                Siapa saja yang punya akun Google.
              </M>
              <M as="p" i={2} className="lp-lead-gelap">
                Tidak perlu undangan khusus. Masuk dengan akun Google, lalu pilih peran yang kamu butuhkan.
              </M>
            </div>
            <div className="lp-baris">
              <M i={0} className="lp-kartu">
                <span className="lp-tile lp-tile-aksen">
                  <Ik nama="siswa" ukuran={26} />
                </span>
                <h3>Siswa dan pelajar</h3>
                <p>Gabung ke kursus, belajar dari HP atau komputer, kerjakan ujian dan tugas, lalu ikuti diskusi kelas.</p>
              </M>
              <M i={1} className="lp-kartu">
                <span className="lp-tile lp-tile-peringatan">
                  <Ik nama="guru" ukuran={26} />
                </span>
                <h3>Guru dan pengajar</h3>
                <p>
                  Buat kursus sendiri: susun modul dan pelajaran, buat ujian dan tugas, pantau kemajuan siswa, dan simpan berkas
                  di Google Drive milik Anda.
                </p>
              </M>
              <M i={2} className="lp-kartu">
                <span className="lp-tile lp-tile-sukses">
                  <Ik nama="tag" ukuran={26} />
                </span>
                <h3>Kursus gratis dan premium</h3>
                <p>Tersedia kursus gratis dan kursus premium. Pilih yang sesuai kebutuhanmu.</p>
                <div className="lp-pil-baris">
                  <span className="lp-pil lp-pil-sukses">Gratis</span>
                  <span className="lp-pil lp-pil-peringatan">
                    <Bintang />
                    Premium
                  </span>
                </div>
              </M>
            </div>
          </div>
        </section>

        <section className="lp-bagian">
          <div className="lp-lebar">
            <div className="lp-kepala">
              <M as="span" className="lp-label">
                Fitur
              </M>
              <M as="h2" i={1}>
                Yang kamu butuhkan untuk belajar dan mengajar.
              </M>
            </div>
            <div className="lp-baris lp-fitur">
              {FITUR.map((f, n) => (
                <M key={f.judul} i={n % 2} className={`lp-fitur-kartu lp-w-${f.warna}`}>
                  <span className="lp-tile-lembut">
                    <Ik nama={f.ikon} />
                  </span>
                  <div>
                    <h3>{f.judul}</h3>
                    <p>{f.isi}</p>
                  </div>
                </M>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-bagian">
          <div className="lp-lebar">
            <M className="lp-langkah">
              <div className="lp-kepala">
                <span className="lp-label lp-label-emas">Cara mulai</span>
                <h2>Tiga langkah, langsung belajar.</h2>
              </div>
              <div className="lp-baris lp-baris-langkah">
                {LANGKAH.map((l, n) => (
                  <M key={l.judul} i={n} className="lp-langkah-item">
                    <span className="lp-nomor">{n + 1}</span>
                    <h3>{l.judul}</h3>
                    <p>{l.isi}</p>
                  </M>
                ))}
              </div>
            </M>
          </div>
        </section>

        <section className="lp-bagian">
          <div className="lp-lebar">
            <M as="h2" className="lp-judul-tunggal">
              Pertanyaan yang sering diajukan
            </M>
            <div className="lp-baris lp-tanya">
              {TANYA_JAWAB.map((q, n) => (
                <M key={q.t} i={n % 2} className="lp-tanya-kartu">
                  <h3>{q.t}</h3>
                  <p>{q.j}</p>
                </M>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-bagian lp-bagian-akhir">
          <div className="lp-lebar">
            <M className="lp-ajakan">
              <div>
                <h2>Siap mulai belajar?</h2>
                <p>Masuk sekarang dan temukan kursus pertamamu.</p>
              </div>
              <TombolMasuk kelas="lp-btn-kartu lp-btn-besar" />
            </M>
          </div>
        </section>
      </main>
      <Kaki />
    </div>
  )
}