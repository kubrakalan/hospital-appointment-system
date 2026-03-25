import { Link } from 'react-router-dom'
import { useTheme } from '../ThemeContext'

export default function Giris() {
  const { theme, toggle } = useTheme()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">

      {/* NAVBAR */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm px-4 sm:px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🏥</span>
          <span className="text-xl font-bold text-blue-700 dark:text-blue-400">MediRandevu</span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Karanlık/Aydınlık mod butonu */}
          <button
            onClick={toggle}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-lg"
            title={theme === 'dark' ? 'Aydınlık mod' : 'Karanlık mod'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Kayıt Ol butonu */}
          <span className="text-gray-500 dark:text-gray-400 text-sm hidden sm:block">Hesabın yok mu?</span>
          <Link
            to="/kayit"
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition"
          >
            Kayıt Ol
            <span>→</span>
          </Link>
        </div>
      </nav>

      {/* GİRİŞ FORMU */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 w-full max-w-md">

          <div className="text-center mb-8">
            <span className="text-5xl">👤</span>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-3">Giriş Yap</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Hesabınıza giriş yapın</p>
          </div>

          <form className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                E-posta
              </label>
              <input
                type="email"
                placeholder="ornek@email.com"
                className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Şifre
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <button
              type="submit"
              className="bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium mt-2 transition"
            >
              Giriş Yap
            </button>
          </form>

          <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-6">
            Hesabın yok mu?{' '}
            <Link to="/kayit" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
              Kayıt Ol
            </Link>
          </p>

        </div>
      </div>

    </div>
  )
}
