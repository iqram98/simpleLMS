// Panggilan ke Google Drive API v3 dari browser dengan token pengguna (cakupan drive.file).
// Token tidak disimpan di mana pun selain memori, dan hanya dikirim ke googleapis.com.
import { escapeKueri, idValid } from './aturan.js'

const API = 'https://www.googleapis.com/drive/v3'
const UNGGAH = 'https://www.googleapis.com/upload/drive/v3/files'

export class GalatDrive extends Error {
  constructor(pesan, status) {
    super(pesan)
    this.status = status
  }
}

async function galatDari(res) {
  let detail = ''
  try {
    detail = (await res.json())?.error?.message ?? ''
  } catch {
    /* tanpa isi */
  }
  if (res.status === 401) return new GalatDrive('Sambungan ke Google berakhir. Coba lagi.', 401)
  if (res.status === 403 && /quota|storage/i.test(detail)) return new GalatDrive('Penyimpanan Google Drive Anda penuh.', 403)
  if (res.status === 403) return new GalatDrive(`Google menolak akses (${detail || 'cek pengaturan Drive API'}).`, 403)
  return new GalatDrive(`Permintaan ke Google gagal (${res.status}${detail ? `: ${detail}` : ''}).`, res.status)
}

const auth = (token) => ({ Authorization: `Bearer ${token}` })

// Mencari folder buatan aplikasi ini (cakupan drive.file hanya melihat berkas buatan aplikasi), atau membuatnya.
export async function cariAtauBuatFolder(token, nama, kirim = fetch) {
  const q = `name = '${escapeKueri(nama)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  const cari = await kirim(
    `${API}/files?${new URLSearchParams({ q, fields: 'files(id,name)', pageSize: '1', spaces: 'drive' })}`,
    {
      headers: auth(token),
    },
  )
  if (!cari.ok) throw await galatDari(cari)
  const ada = (await cari.json()).files?.[0]
  if (ada && idValid(ada.id)) return ada.id
  const buat = await kirim(`${API}/files?fields=id`, {
    method: 'POST',
    headers: { ...auth(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: nama, mimeType: 'application/vnd.google-apps.folder' }),
  })
  if (!buat.ok) throw await galatDari(buat)
  const { id } = await buat.json()
  if (!idValid(id)) throw new GalatDrive('Google tidak mengembalikan folder yang sah.')
  return id
}

// Membuka sesi unggah bertahap (resumable), lalu mengirim berkas dengan XHR agar progres terbaca.
export async function unggah(token, file, folderId, { onProgres, kirim = fetch } = {}) {
  const awal = await kirim(`${UNGGAH}?uploadType=resumable&fields=id,name,mimeType`, {
    method: 'POST',
    headers: {
      ...auth(token),
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': file.type,
      'X-Upload-Content-Length': String(file.size),
    },
    body: JSON.stringify({ name: file.name.slice(0, 200), parents: [folderId], mimeType: file.type }),
  })
  if (!awal.ok) throw await galatDari(awal)
  const lokasi = awal.headers.get('Location')
  if (!lokasi || !lokasi.startsWith('https://www.googleapis.com/')) throw new GalatDrive('Google tidak memberi alamat unggah.')

  return new Promise((selesai, gagal) => {
    const x = new XMLHttpRequest()
    x.open('PUT', lokasi)
    x.setRequestHeader('Content-Type', file.type)
    x.upload.onprogress = (e) => e.lengthComputable && onProgres?.(e.loaded / e.total)
    x.onerror = () => gagal(new GalatDrive('Unggahan terputus. Periksa koneksi lalu coba lagi.'))
    x.onload = () => {
      if (x.status >= 200 && x.status < 300) {
        try {
          const j = JSON.parse(x.responseText)
          if (!idValid(j.id)) throw new Error('id')
          selesai({ id: j.id, nama: j.name ?? file.name })
        } catch {
          gagal(new GalatDrive('Jawaban Google tidak dikenali.'))
        }
      } else {
        gagal(
          new GalatDrive(
            x.status === 401 ? 'Sambungan ke Google berakhir. Coba lagi.' : `Unggahan gagal (${x.status}).`,
            x.status,
          ),
        )
      }
    }
    x.send(file)
  })
}

// Membuat berkas bisa dilihat siapa saja yang memiliki link (diperlukan agar siswa bisa membukanya).
export async function bagikanPublik(token, id, kirim = fetch) {
  if (!idValid(id)) throw new GalatDrive('Id berkas tidak sah.')
  const res = await kirim(`${API}/files/${encodeURIComponent(id)}/permissions?fields=id`, {
    method: 'POST',
    headers: { ...auth(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone', allowFileDiscovery: false }),
  })
  if (!res.ok) throw await galatDari(res)
}