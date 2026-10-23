# LMS Kelas

Aplikasi kelas online sederhana: guru menyusun modul dan pelajaran dengan menempel link (Google Drive, Docs, Slides, YouTube, LKPD Apps Script), siswa belajar dan mencatat progres. Catatan/RPP guru tidak pernah terlihat siswa.

React + Vite + Supabase (login Google, Postgres, Row Level Security).

## 1. Siapkan database
Jalankan `../lms-db/001_skema.sql` di Supabase (SQL Editor). Jika perlu mengulang dari nol, jalankan `000_reset.sql` dulu (menghapus semua data).
Lalu ikuti langkah Google Cloud OAuth dan aktifkan provider Google di Supabase. Di Google Cloud, ubah audience ke "In production" agar semua siswa bisa masuk.

## 2. Jalankan lokal
```
npm install
cp .env.example .env.local   # isi VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev                  # http://localhost:5173
npm test                     # uji konverter embed
```
Jangan pernah memakai secret key atau service_role di aplikasi ini.

Tambahkan `http://localhost:5173` pada Supabase > Authentication > URL Configuration > Redirect URLs.

## 3. Jadikan akun Anda admin + guru
Masuk sekali dengan Google, lalu di SQL Editor:
```sql
update public.profiles set role = 'guru', is_admin = true where email = 'EMAIL-ANDA@gmail.com';
```
Bila akun sudah ada sebelum skema dipasang dan profil kosong, buat profilnya:
```sql
insert into public.profiles (id, email, full_name)
select id, email, coalesce(raw_user_meta_data->>'full_name', '') from auth.users
on conflict (id) do nothing;
```

## 4. Deploy (Vercel atau Netlify)
Build command `npm run build`, output `dist`. Isi dua variabel lingkungan yang sama dengan `.env.local`. Aturan SPA sudah ada (`vercel.json`, `public/_redirects`). Setelah deploy, tambahkan alamat situs ke Site URL dan Redirect URLs di Supabase.

## Alur
- Siswa: masuk Google, memasukkan kode kelas, menunggu persetujuan guru.
- Guru: daftar sebagai guru, admin menyetujui, lalu membuat kursus, kelas, dan menyetujui siswa. Satu kursus bisa dipakai banyak kelas.
- Admin: halaman `/admin`.

## Catatan
- File Drive harus dibagikan "Siapa saja yang memiliki link" agar tampil untuk siswa. Simpan RPP dengan akses dibatasi.
- Verifikasi email+password menyusul di versi 2.
