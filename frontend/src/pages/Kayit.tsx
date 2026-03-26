import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../ThemeContext'
import { api } from '../api'

export default function Kayit() {
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const [form, setForm] = useState({ ad: '', soyad: '', email: '', sifre: '', sifreTekrar: '' })
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setHata('')

    if (form.sifre !== form.sifreTekrar) {
      setHata('Şifreler eşleşmiyor')
      return
    }

    setYukleniyor(true)
    try {
      await api.register(form.ad, form.soyad, form.email, form.sifre)
      navigate('/giris')
    } catch (err: unknown) {
      setHata(err instanceof Error ? err.message : 'Kayıt başarısız')
    } finally {
      setYukleniyor(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">

      {/* NAVBAR */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm px-4 sm:px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🏥</span>
          <span className="text-xl font-bold text-blue-700 dark:text-blue-400">MediRandevu</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-lg"
            title={theme === 'dark' ? 'Aydınlık mod' : 'Karanlık mod'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <span className="text-gray-500 dark:text-gray-400 text-sm hidden sm:block">Zaten hesabın var mı?</span>
          <Link
            to="/giris"
            className="flex items-center gap-1.5 border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            Giriş Yap
          </Link>
        </div>
      </nav>

      {/* KAYIT FORMU */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 w-full max-w-md">

          <div className="text-center mb-8">
            <span className="text-5xl">📋</span>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-3">Kayıt Ol</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Yeni hesap oluşturun</p>
          </div>

          {hata && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
              {hata}
            </div>
          )}

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Ad</label>
                <input name="ad" type="text" placeholder="Adınız" value={form.ad} onChange={handleChange} required
                  className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Soyad</label>
                <input name="soyad" type="text" placeholder="Soyadınız" value={form.soyad} onChange={handleChange} required
                  className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">E-posta</label>
              <input name="email" type="email" placeholder="ornek@email.com" value={form.email} onChange={handleChange} required
                className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Şifre</label>
              <input name="sifre" type="password" placeholder="••••••••" value={form.sifre} onChange={handleChange} required
                className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Şifre Tekrar</label>
              <input name="sifreTekrar" type="password" placeholder="••••••••" value={form.sifreTekrar} onChange={handleChange} required
                className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <button
              type="submit"
              disabled={yukleniyor}
              className="bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium mt-2 transition disabled:opacity-60"
            >
              {yukleniyor ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
            </button>
          </form>

          <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-6">
            Zaten hesabın var mı?{' '}
            <Link to="/giris" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
              Giriş Yap
            </Link>
          </p>

        </div>
      </div>

    </div>
  )
}
