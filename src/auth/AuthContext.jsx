import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [sesi, setSesi] = useState(null)
  const [sesiSiap, setSesiSiap] = useState(false)
  const [profil, setProfil] = useState(null)
  const [profilSiap, setProfilSiap] = useState(false)
  const [galatProfil, setGalatProfil] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesi(data.session ?? null)
      setSesiSiap(true)
    })
    // Jangan memanggil Supabase di dalam callback ini. Cukup simpan sesinya.
    const { data } = supabase.auth.onAuthStateChange((_peristiwa, sesiBaru) => {
      setSesi(sesiBaru ?? null)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const uid = sesi?.user?.id ?? null

  const muatProfil = useCallback(async () => {
    if (!uid) {
      setProfil(null)
      setGalatProfil('')
      setProfilSiap(true)
      return
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    if (error) {
      setGalatProfil(error.message)
      setProfil(null)
    } else if (!data) {
      setGalatProfil('Profil akun tidak ditemukan.')
      setProfil(null)
    } else {
      setGalatProfil('')
      setProfil(data)
    }
    setProfilSiap(true)
  }, [uid])

  useEffect(() => {
    if (!sesiSiap) return
    setProfilSiap(false)
    muatProfil()
  }, [sesiSiap, muatProfil])

  const masukGoogle = useCallback(
    () =>
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          // Memaksa pilihan akun, penting untuk perangkat yang dipakai bergantian.
          queryParams: { prompt: 'select_account' },
        },
      }),
    [],
  )

  const keluar = useCallback(() => supabase.auth.signOut(), [])

  const nilai = useMemo(
    () => ({
      sesi,
      uid,
      profil,
      galatProfil,
      memuat: !sesiSiap || (Boolean(uid) && !profilSiap),
      adalahAdmin: Boolean(profil?.is_admin && profil?.is_active),
      adalahGuru: Boolean(profil?.role === 'guru' && profil?.is_active),
      muatProfil,
      masukGoogle,
      keluar,
    }),
    [sesi, uid, profil, galatProfil, sesiSiap, profilSiap, muatProfil, masukGoogle, keluar],
  )

  return <AuthContext.Provider value={nilai}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return ctx
}
