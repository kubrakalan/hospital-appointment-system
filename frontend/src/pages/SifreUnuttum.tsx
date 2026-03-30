import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import Navbar from '../components/Navbar'

export default function SifreUnuttum() {
  const [email, setEmail] = useState('')
  const [gonderildi, setGonderildi] = useState(false)
  const [gonderiyor, setGonderiyor] = useState(false)
  const [hata, setHata] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setHata('')
    setGonderiyor(true)
    try {
      await api.sifremiUnuttum(email)
      setGonderildi(true)
    } catch (err: unknown) {
      setHata(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setGonderiyor(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <span className="text-5xl">🔑</span>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-3">Şifremi Unuttum</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Email adresinize sıfırlama linki göndereceğiz
            </p>
          </div>

          {gonderildi ? (
            <div className="text-center">
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-600 dark:text-green-400 rounded-lg px-4 py-4 text-sm mb-6">
                ✅ Email gönderildi! Gelen kutunuzu kontrol edin.
              </div>
              <Link to="/giris" className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">
                Giriş sayfasına dön
              </Link>
            </div>
          ) : (
            <>
              {hata && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
                  {hata}
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">E-posta</label>
                  <input
                    type="email"
                    placeholder="kayitli@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={gonderiyor}
                  className="bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-60"
                >
                  {gonderiyor ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder'}
                </button>
              </form>
              <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-6">
                <Link to="/giris" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                  ← Giriş sayfasına dön
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
