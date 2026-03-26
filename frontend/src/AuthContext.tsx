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
  girisYap: (token: string, kullanici: Kullanici) => void
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
      setToken(kaydedilmisToken)
      setKullanici(JSON.parse(kaydedilmisKullanici))
    }
  }, [])

  function girisYap(yeniToken: string, yeniKullanici: Kullanici) {
    localStorage.setItem('token', yeniToken)
    localStorage.setItem('kullanici', JSON.stringify(yeniKullanici))
    setToken(yeniToken)
    setKullanici(yeniKullanici)
  }

  function cikisYap() {
    localStorage.removeItem('token')
    localStorage.removeItem('kullanici')
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
