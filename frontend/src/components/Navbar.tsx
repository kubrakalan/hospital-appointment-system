import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../ThemeContext'
import { useAuth } from '../AuthContext'
import { api } from '../api'

interface Bildirim {
  BildirimID: number
  Mesaj: string
  Okundu: boolean
  tarih: string
}

interface Props {
  kullaniciIcon?: string
  doktorPrefix?: boolean
}

export default function Navbar({ kullaniciIcon, doktorPrefix = false }: Props) {
  const { theme, toggle } = useTheme()
  const { kullanici, cikisYap } = useAuth()
  const navigate = useNavigate()
  const [bildirimler, setBildirimler] = useState<Bildirim[]>([])
  const [acik, setAcik] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (kullanici?.rol === 'Hasta') {
      api.bildirimler().then(setBildirimler).catch(() => {})
      const interval = setInterval(() => {
        api.bildirimler().then(setBildirimler).catch(() => {})
      }, 30000) // 30 saniyede bir kontrol
      return () => clearInterval(interval)
    }
  }, [kullanici])

  useEffect(() => {
    function dışTıklama(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAcik(false)
      }
    }
    document.addEventListener('mousedown', dışTıklama)
    return () => document.removeEventListener('mousedown', dışTıklama)
  }, [])

  async function bildirimAc() {
    setAcik(!acik)
    if (!acik) {
      const okunmamis = bildirimler.filter(b => !b.Okundu)
      if (okunmamis.length > 0) {
        await api.bildirimleriOkudu()
        setBildirimler(prev => prev.map(b => ({ ...b, Okundu: true })))
      }
    }
  }

  function cikis() {
    cikisYap()
    navigate('/giris')
  }

  const okunmamisSayi = bildirimler.filter(b => !b.Okundu).length

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm px-4 sm:px-8 py-4 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 shrink-0">
        <span className="text-2xl">🏥</span>
        <span className="text-xl font-bold text-blue-700 dark:text-blue-400">MediRandevu</span>
      </Link>

      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {kullanici && kullaniciIcon && (
          <span className="text-gray-600 dark:text-gray-300 font-medium text-sm truncate hidden sm:block">
            {kullaniciIcon} {doktorPrefix ? 'Dr. ' : ''}{kullanici.ad} {kullanici.soyad}
          </span>
        )}

        {/* Bildirim zili — sadece hastalar için */}
        {kullanici?.rol === 'Hasta' && (
          <div className="relative" ref={ref}>
            <button
              onClick={bildirimAc}
              className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-lg"
              title="Bildirimler"
            >
              🔔
              {okunmamisSayi > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {okunmamisSayi > 9 ? '9+' : okunmamisSayi}
                </span>
              )}
            </button>

            {acik && (
              <div className="absolute right-0 top-11 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-50">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Bildirimler</p>
                </div>
                {bildirimler.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-6">Bildirim yok</p>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    {bildirimler.map(b => (
                      <div key={b.BildirimID} className={`px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 ${!b.Okundu ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                        <p className="text-sm text-gray-700 dark:text-gray-200">{b.Mesaj}</p>
                        <p className="text-xs text-gray-400 mt-1">{b.tarih}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <button
          onClick={toggle}
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-lg"
          title={theme === 'dark' ? 'Aydınlık mod' : 'Karanlık mod'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {kullanici ? (
          <>
            {kullanici.rol === 'Hasta' && (
              <Link to="/profil" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium shrink-0">
                Profilim
              </Link>
            )}
            <button onClick={cikis} className="text-red-500 hover:text-red-600 text-sm font-medium shrink-0">
              Çıkış Yap
            </button>
          </>
        ) : (
          <>
            <Link to="/giris" className="text-gray-600 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 font-medium text-sm">
              Giriş Yap
            </Link>
            <Link to="/kayit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm transition">
              Kayıt Ol
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
