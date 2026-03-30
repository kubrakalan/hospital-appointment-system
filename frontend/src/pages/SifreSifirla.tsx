import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { api } from '../api'
import Navbar from '../components/Navbar'

export default function SifreSifirla() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()
  const [yeniSifre, setYeniSifre] = useState('')
  const [tekrar, setTekrar] = useState('')
  const [kaydediyor, setKaydediyor] = useState(false)
  const [hata, setHata] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (yeniSifre !== tekrar) {
      setHata('Şifreler eşleşmiyor')
      return
    }
    setHata('')
    setKaydediyor(true)
    try {
      await api.sifreSifirla(token, yeniSifre)
      navigate('/giris', { state: { mesaj: 'Şifreniz güncellendi. Giriş yapabilirsiniz.' } })
    } catch (err: unknown) {
      setHata(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setKaydediyor(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Geçersiz sıfırlama linki.</p>
          <Link to="/giris" className="text-blue-600 hover:underline text-sm">Giriş sayfasına dön</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-20">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <span className="text-5xl">🔒</span>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-3">Yeni Şifre Belirle</h1>
          </div>

          {hata && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
              {hata}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Yeni Şifre</label>
              <input
                type="password"
                placeholder="En az 6 karakter"
                value={yeniSifre}
                onChange={e => setYeniSifre(e.target.value)}
                required
                minLength={6}
                className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Şifre Tekrar</label>
              <input
                type="password"
                placeholder="Şifrenizi tekrar girin"
                value={tekrar}
                onChange={e => setTekrar(e.target.value)}
                required
                className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={kaydediyor}
              className="bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-60"
            >
              {kaydediyor ? 'Kaydediliyor...' : 'Şifremi Güncelle'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
