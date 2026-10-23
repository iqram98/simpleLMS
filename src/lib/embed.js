// Mengubah link yang ditempel guru menjadi URL embed yang aman.
// Hanya host yang dikenal yang diubah. Selain itu hasilnya null, dan aplikasi
// menampilkan tombol "Buka di tab baru". Tidak ada link pengguna yang
// dimasukkan ke iframe tanpa melewati fungsi ini.
//
// Hasil: { jenis, src, rasio }  atau  null
//   rasio: 'lebar' (video, slide) atau 'tinggi' (dokumen, PDF, formulir, LKPD)

const ID = '[\\w-]+'

export function toEmbed(mentah) {
  let u
  try {
    u = new URL(String(mentah ?? '').trim())
  } catch {
    return null
  }
  if (u.protocol !== 'https:') return null

  const host = u.hostname.toLowerCase().replace(/^www\./, '')
  const path = u.pathname
  let m

  // Google Drive
  if (host === 'drive.google.com') {
    m = path.match(new RegExp(`^/file/d/(${ID})`))
    if (m) {
      return { jenis: 'Google Drive (file)', src: `https://drive.google.com/file/d/${m[1]}/preview`, rasio: 'tinggi' }
    }
    m = path.match(new RegExp(`/folders/(${ID})`))
    if (m) {
      return { jenis: 'Google Drive (folder)', src: `https://drive.google.com/embeddedfolderview?id=${m[1]}#list`, rasio: 'tinggi' }
    }
    return null
  }

  // Google Docs, Sheets, Slides, Forms
  if (host === 'docs.google.com') {
    m = path.match(new RegExp(`^/(?:a/[^/]+/)?(document|spreadsheets|presentation|forms)/d/(e/)?(${ID})`))
    if (!m) return null
    const [, tipe, terbit, id] = m
    const dasar = `https://docs.google.com/${tipe}/d/${terbit ? 'e/' : ''}${id}`

    if (tipe === 'forms') {
      // Hanya tautan formulir publik (/d/e/...) yang bisa di-embed.
      if (!terbit) return null
      return { jenis: 'Google Form', src: `${dasar}/viewform?embedded=true`, rasio: 'tinggi' }
    }
    if (tipe === 'presentation') {
      return {
        jenis: 'Google Slides',
        src: terbit ? `${dasar}/embed?start=false&loop=false` : `${dasar}/embed`,
        rasio: 'lebar',
      }
    }
    if (tipe === 'document') {
      return { jenis: 'Google Docs', src: terbit ? `${dasar}/pub?embedded=true` : `${dasar}/preview`, rasio: 'tinggi' }
    }
    return {
      jenis: 'Google Sheets',
      src: terbit ? `${dasar}/pubhtml?widget=true&headers=false` : `${dasar}/preview`,
      rasio: 'tinggi',
    }
  }

  // Web app Google Apps Script (LKPD buatan guru)
  // Termasuk bentuk Google Workspace: /a/macros/domain.sch.id/s/ID/exec
  if (host === 'script.google.com' && new RegExp(`^/(?:macros|a/macros/[\\w.-]+)/s/${ID}/exec$`).test(path)) {
    return { jenis: 'Web app Apps Script', src: `https://script.google.com${path}${u.search}`, rasio: 'tinggi' }
  }

  // YouTube
  if (host === 'youtu.be' || host === 'youtube.com' || host === 'm.youtube.com') {
    let id = null
    if (host === 'youtu.be') {
      id = path.slice(1).split('/')[0]
    } else if (path === '/watch') {
      id = u.searchParams.get('v')
    } else {
      m = path.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)
      if (m) id = m[1]
    }
    if (id && /^[\w-]{11}$/.test(id)) {
      return { jenis: 'YouTube', src: `https://www.youtube.com/embed/${id}`, rasio: 'lebar' }
    }
    const daftar = path === '/playlist' ? u.searchParams.get('list') : null
    if (daftar && new RegExp(`^${ID}$`).test(daftar)) {
      return { jenis: 'YouTube (daftar putar)', src: `https://www.youtube.com/embed/videoseries?list=${daftar}`, rasio: 'lebar' }
    }
  }

  return null
}

// Link harus https:// agar sesuai aturan database (blocks.url_hanya_https).
export function urlHttpsValid(teks) {
  try {
    const u = new URL(String(teks ?? '').trim())
    return u.protocol === 'https:' && !/\s/.test(String(teks).trim())
  } catch {
    return false
  }
}