// Penyambung ke Google Identity Services (izin) dan Google Picker (memilih berkas).
// Hanya Client ID, API key, dan nomor proyek yang dipakai; semuanya publik, tidak ada kunci rahasia.
const ID_KLIEN = import.meta.env.VITE_GOOGLE_CLIENT_ID
const KUNCI_API = import.meta.env.VITE_GOOGLE_API_KEY
const ID_APP = import.meta.env.VITE_GOOGLE_APP_ID
const CAKUPAN = 'https://www.googleapis.com/auth/drive.file'

export const driveSiap = Boolean(ID_KLIEN)
export const pickerSiap = Boolean(ID_KLIEN && KUNCI_API && ID_APP)

const dimuat = new Map()
function muatSkrip(src) {
  if (!dimuat.has(src)) {
    dimuat.set(
      src,
      new Promise((ok, gagal) => {
        const s = document.createElement('script')
        s.src = src
        s.async = true
        s.onload = ok
        s.onerror = () => {
          dimuat.delete(src)
          gagal(new Error('Skrip Google tidak bisa dimuat. Periksa koneksi atau pemblokir iklan.'))
        }
        document.head.appendChild(s)
      }),
    )
  }
  return dimuat.get(src)
}

let token = null
let kadaluarsa = 0

export const lupakanToken = () => {
  token = null
  kadaluarsa = 0
}

// Harus dipanggil langsung dari klik pengguna agar jendela izin tidak diblokir browser.
export async function ambilToken(loginHint) {
  if (token && Date.now() < kadaluarsa - 60_000) return token
  await muatSkrip('https://accounts.google.com/gsi/client')
  return new Promise((ok, gagal) => {
    const klien = window.google.accounts.oauth2.initTokenClient({
      client_id: ID_KLIEN,
      scope: CAKUPAN,
      login_hint: loginHint || undefined,
      callback: (r) => {
        if (r.error || !r.access_token)
          return gagal(new Error(r.error === 'access_denied' ? 'Izin ke Google tidak diberikan.' : 'Gagal tersambung ke Google.'))
        token = r.access_token
        kadaluarsa = Date.now() + Number(r.expires_in ?? 3600) * 1000
        ok(token)
      },
      error_callback: (e) =>
        gagal(new Error(e?.type === 'popup_closed' ? 'Jendela izin Google ditutup.' : 'Gagal tersambung ke Google.')),
    })
    klien.requestAccessToken()
  })
}

// Membuka Google Picker. Hasil: {id, nama} atau null bila dibatalkan.
export async function pilihDariDrive(tokenAkses, terima = 'semua') {
  await muatSkrip('https://apis.google.com/js/api.js')
  await new Promise((ok) => window.gapi.load('picker', ok))
  const g = window.google.picker
  const tampilan = new g.DocsView(terima === 'gambar' ? g.ViewId.DOCS_IMAGES : g.ViewId.DOCS)
    .setIncludeFolders(false)
    .setMode(g.DocsViewMode.LIST)
  return new Promise((ok) => {
    new g.PickerBuilder()
      .setOAuthToken(tokenAkses)
      .setDeveloperKey(KUNCI_API)
      .setAppId(ID_APP)
      .setLocale('id')
      .addView(tampilan)
      .setCallback((d) => {
        if (d.action === g.Action.PICKED) ok({ id: d.docs[0].id, nama: d.docs[0].name })
        else if (d.action === g.Action.CANCEL) ok(null)
      })
      .build()
      .setVisible(true)
  })
}