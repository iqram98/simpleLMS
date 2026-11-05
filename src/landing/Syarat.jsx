import { useTema } from '../tema/TemaProvider.jsx'
import HalamanInfo from './HalamanInfo.jsx'
import { KONTAK } from './isi.js'
import { tautanEmail } from './kontak.js'

// Templat syarat penggunaan. Periksa dan sesuaikan dengan keadaan lembaga Anda
// (ini bukan nasihat hukum). Ubah tanggal di bawah setiap kali isinya diperbarui.
const DIPERBARUI = '5 November 2026'

export default function Syarat() {
  const { situs } = useTema()
  const nama = situs.nama_situs
  const surel = tautanEmail(KONTAK.email)
  return (
    <HalamanInfo judul="Syarat Penggunaan" diperbarui={DIPERBARUI}>
      <p>Dengan masuk dan memakai {nama}, kamu menyetujui syarat berikut.</p>

      <h2>Akun</h2>
      <ul>
        <li>Akun dibuat lewat akun Google. Kamu bertanggung jawab atas keamanan akun Google-mu.</li>
        <li>Isi nama lengkap dengan benar agar guru dapat mengenalimu.</li>
        <li>Satu orang memakai satu akun, dan akun tidak dipinjamkan kepada orang lain.</li>
      </ul>

      <h2>Penggunaan yang wajar</h2>
      <ul>
        <li>Gunakan layanan hanya untuk belajar dan mengajar.</li>
        <li>Jangan mengunggah atau menulis konten yang melanggar hukum, menghina, melecehkan, atau melanggar hak orang lain.</li>
        <li>Jangan mencoba mengganggu, merusak, atau mengakses data yang bukan hakmu.</li>
      </ul>

      <h2>Konten</h2>
      <p>
        Guru bertanggung jawab atas materi yang dibagikan, termasuk hak ciptanya. Siswa bertanggung jawab atas jawaban, tugas, dan
        tulisan forum yang dikirimnya. Pengelola dapat menyembunyikan atau menghapus konten yang melanggar syarat ini.
      </p>

      <h2>Ujian dan kejujuran akademik</h2>
      <p>
        Kerjakan ujian dengan jujur. Bila pengawasan diaktifkan, aktivitas seperti meninggalkan layar penuh atau berpindah tab
        dicatat dan dapat dilihat oleh guru.
      </p>

      <h2>Kursus gratis dan premium</h2>
      <p>
        Tersedia kursus gratis dan kursus premium. Ketentuan kursus premium, seperti biaya dan cara akses, ditetapkan oleh
        pengelola dan dapat berbeda untuk setiap kursus.
      </p>

      <h2>Penangguhan akun</h2>
      <p>Pengelola dapat menonaktifkan akun yang melanggar syarat ini atau membahayakan pengguna lain.</p>

      <h2>Ketersediaan layanan</h2>
      <p>
        Layanan disediakan apa adanya. Kami berusaha menjaganya tetap berjalan, tetapi tidak menjamin layanan selalu tersedia
        tanpa gangguan.
      </p>

      <h2>Perubahan dan kontak</h2>
      <p>
        Syarat ini dapat diperbarui sewaktu-waktu. Pertanyaan dapat disampaikan kepada pengelola
        {surel ? (
          <>
            {' '}
            di <a href={surel}>{KONTAK.email.trim()}</a>.
          </>
        ) : (
          '.'
        )}
      </p>
    </HalamanInfo>
  )
}