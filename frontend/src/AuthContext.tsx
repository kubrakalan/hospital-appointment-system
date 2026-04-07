import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Kullanici {
  id: number
  email: string
  ad: string
  soyad: string
  rol: 'Hasta' | 'Doktor' | 'Admin'
}

interface AuthContextType {
  kullanici: Kullanici | null
  token: string | null
  girisYap: (token: string, kullanici: Kullanici, refreshToken?: string) => void
  cikisYap: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [kullanici, setKullanici] = useState<Kullanici | null>(null)
  const [token, setToken] = useState<string | null>(null)

  // Sayfa yenilenince localStorage'dan geri yükle
  useEffect(() => {
    const kaydedilmisToken = localStorage.getItem('token')
    const kaydedilmisKullanici = localStorage.getItem('kullanici')
    if (kaydedilmisToken && kaydedilmisKullanici) {
      try {
        setToken(kaydedilmisToken)
        setKullanici(JSON.parse(kaydedilmisKullanici))
      } catch {
        // Bozuk veri varsa temizle
        localStorage.removeItem('token')
        localStorage.removeItem('kullanici')
        localStorage.removeItem('refreshToken')
      }
    }
  }, [])

  function girisYap(yeniToken: string, yeniKullanici: Kullanici, refreshToken?: string) {
    localStorage.setItem('token', yeniToken)
    localStorage.setItem('kullanici', JSON.stringify(yeniKullanici))
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
    setToken(yeniToken)
    setKullanici(yeniKullanici)
  }

  function cikisYap() {
    localStorage.removeItem('token')
    localStorage.removeItem('kullanici')
    localStorage.removeItem('refreshToken')
    setToken(null)
    setKullanici(null)
  }

  return (
    <AuthContext.Provider value={{ kullanici, token, girisYap, cikisYap }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı')
  return ctx
}
