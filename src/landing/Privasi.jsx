import { useTema } from '../tema/TemaProvider.jsx'
import HalamanInfo from './HalamanInfo.jsx'
import { KONTAK } from './isi.js'
import { tautanEmail } from './kontak.js'

// Templat kebijakan privasi yang mengikuti cara kerja aplikasi saat ini.
// Pengelola bertanggung jawab memeriksa dan menyesuaikannya dengan keadaan lembaganya
// (ini bukan nasihat hukum). Ubah tanggal di bawah setiap kali isinya diperbarui.
const DIPERBARUI = '5 November 2026'

export default function Privasi() {
  const { situs } = useTema()
  const nama = situs.nama_situs
  const surel = tautanEmail(KONTAK.email)
  return (
    <HalamanInfo judul="Kebijakan Privasi" diperbarui={DIPERBARUI}>
      <p>
        Halaman ini menjelaskan data apa yang dikumpulkan {nama}, untuk apa dipakai, dan siapa yang dapat melihatnya. Dengan
        memakai layanan ini, kamu menyetujui cara kerja yang dijelaskan di sini.
      </p>

      <h2>Data yang dikumpulkan</h2>
      <ul>
        <li>
          <b>Akun Google:</b> nama, alamat email, dan foto profil yang diberikan Google saat kamu masuk. Kami tidak menerima kata
          sandi Google-mu.
        </li>
        <li>
          <b>Profil:</b> nama lengkap yang kamu isi sendiri dan peranmu (siswa, guru, atau admin).
        </li>
        <li>
          <b>Aktivitas belajar:</b> kelas yang kamu ikuti, pelajaran yang diselesaikan, jawaban dan skor ujian, tugas yang
          dikumpulkan (tautan dan catatan), serta tulisan di forum dan pengumuman.
        </li>
        <li>
          <b>Catatan saat ujian:</b> bila ujian mengaktifkan pengawasan, aplikasi mencatat ketika layar penuh ditinggalkan atau
          tab berpindah, dan guru dapat melihat catatan itu.
        </li>
        <li>
          <b>Pengaturan tampilan</b> (misalnya mode terang atau gelap) disimpan di penyimpanan lokal browser perangkatmu.
        </li>
      </ul>
      <p>Aplikasi ini tidak memasang pelacak iklan dan tidak menjual data pengguna.</p>

      <h2>Untuk apa data dipakai</h2>
      <p>
        Data dipakai hanya untuk menjalankan layanan belajar: mengenali akunmu, menampilkan kelas dan materi, menyimpan progres
        dan nilai, serta memungkinkan guru memantau kemajuan siswanya.
      </p>

      <h2>Siapa yang dapat melihat data</h2>
      <ul>
        <li>Guru pemilik kursus melihat nama, progres, hasil ujian, dan tugas siswa di kursusnya.</li>
        <li>Anggota kelas yang sama dapat melihat nama dan isi kiriman forum di kelas itu.</li>
        <li>Admin situs dapat mengelola akun dan kelas.</li>
        <li>Siswa lain tidak dapat melihat nilai atau jawaban ujianmu.</li>
      </ul>

      <h2>Google Drive (untuk guru)</h2>
      <p>
        Guru dapat menghubungkan Google Drive miliknya untuk mengunggah atau memilih berkas materi. Aplikasi hanya meminta izin{' '}
        <b>drive.file</b>: aplikasi hanya dapat mengakses berkas yang dibuatnya sendiri atau yang dipilih guru lewat pemilih
        berkas, bukan seluruh isi Drive. Berkas tersimpan di Drive milik guru, bukan di server kami. Berkas yang diunggah diatur
        agar dapat dilihat oleh siapa saja yang memiliki tautannya supaya siswa bisa membukanya; jangan mengunggah data pribadi
        lewat fitur ini. Token akses Google hanya disimpan sementara di memori browser dan hilang saat halaman ditutup. Guru dapat
        mencabut izin kapan saja di{' '}
        <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
          pengaturan akun Google
        </a>
        .
      </p>
      <p>
        Penggunaan dan pengalihan informasi yang diterima dari Google API oleh {nama} mematuhi{' '}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
          Kebijakan Data Pengguna Layanan Google API
        </a>
        , termasuk persyaratan Penggunaan Terbatas.
      </p>

      <h2>Penyimpanan dan keamanan</h2>
      <p>
        Data disimpan pada layanan basis data dan autentikasi Supabase, dan aplikasi dilayani melalui Netlify. Seluruh sambungan
        memakai HTTPS, dan akses ke data dibatasi menurut peran (siswa, guru, admin). Tidak ada sistem yang sepenuhnya bebas
        risiko, tetapi kami berusaha menjaga data sebaik mungkin.
      </p>

      <h2>Hakmu</h2>
      <p>
        Kamu dapat meminta untuk melihat, memperbaiki, atau menghapus data akunmu dengan menghubungi pengelola.{' '}
        {surel ? (
          <>
            Email: <a href={surel}>{KONTAK.email.trim()}</a>.
          </>
        ) : (
          'Hubungi pengelola situs ini atau gurumu.'
        )}
      </p>

      <h2>Anak-anak</h2>
      <p>Siswa yang masih di bawah umur sebaiknya memakai layanan ini dengan sepengetahuan orang tua, wali, atau guru.</p>

      <h2>Perubahan kebijakan</h2>
      <p>Kebijakan ini dapat diperbarui. Tanggal pembaruan terakhir tertera di bagian atas halaman.</p>
    </HalamanInfo>
  )
}