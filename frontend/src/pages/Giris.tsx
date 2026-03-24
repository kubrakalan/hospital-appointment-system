import { Link } from 'react-router-dom'

export default function Giris() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* NAVBAR */}
      <nav className="bg-white shadow-sm px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🏥</span>
          <span className="text-xl font-bold text-blue-700">MediRandevu</span>
        </Link>
        <Link to="/kayit" className="text-gray-600 hover:text-blue-700 font-medium">
          Hesabın yok mu? <span className="text-blue-600">Kayıt Ol</span>
        </Link>
      </nav>

      {/* GİRİŞ FORMU */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

          <div className="text-center mb-8">
            <span className="text-5xl">👤</span>
            <h1 className="text-2xl font-bold text-gray-800 mt-3">Giriş Yap</h1>
            <p className="text-gray-500 text-sm mt-1">Hesabınıza giriş yapın</p>
          </div>

          <form className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                E-posta
              </label>
              <input
                type="email"
                placeholder="ornek@email.com"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-700"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Şifre
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-700"
              />
            </div>

            <button
              type="submit"
              className="bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium mt-2"
            >
              Giriş Yap
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Hesabın yok mu?{' '}
            <Link to="/kayit" className="text-blue-600 font-medium hover:underline">
              Kayıt Ol
            </Link>
          </p>

        </div>
      </div>

    </div>
  )
}
