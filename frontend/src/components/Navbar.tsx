import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../ThemeContext'
import { useAuth } from '../AuthContext'

interface Props {
  kullaniciIcon?: string   // '👤' | '👨‍⚕️' | '🛡️'
  doktorPrefix?: boolean   // Dr. öneki eklensin mi
}

export default function Navbar({ kullaniciIcon, doktorPrefix = false }: Props) {
  const { theme, toggle } = useTheme()
  const { kullanici, cikisYap } = useAuth()
  const navigate = useNavigate()

  function cikis() {
    cikisYap()
    navigate('/giris')
  }

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

        <button
          onClick={toggle}
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-lg"
          title={theme === 'dark' ? 'Aydınlık mod' : 'Karanlık mod'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {kullanici ? (
          <button onClick={cikis} className="text-red-500 hover:text-red-600 text-sm font-medium shrink-0">
            Çıkış Yap
          </button>
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
