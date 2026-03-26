import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../ThemeContext'
import { useAuth } from '../AuthContext'
import { api } from '../api'

const durumRenk: Record<string, string> = {
  'Onaylandı': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'Beklemede': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  'Tamamlandı': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  'İptal': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

interface Randevu {
  RandevuID: number; HastaAdi: string; RandevuTarihi: string
  RandevuSaati: string; Durum: string; Notlar: string | null
}

export default function DoktorPaneli() {
  const { theme, toggle } = useTheme()
  const { kullanici, cikisYap } = useAuth()
  const navigate = useNavigate()
  const [randevular, setRandevular] = useState<Randevu[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    api.doktorRandevular().then(setRandevular).catch(() => {}).finally(() => setYukleniyor(false))
  }, [])

  function cikis() { cikisYap(); navigate('/giris') }

  async function durumGuncelle(id: number, durum: string) {
    try {
      await api.doktorRandevuDurum(id, durum)
      setRandevular(prev => prev.map(r => r.RandevuID === id ? { ...r, Durum: durum } : r))
    } catch { }
  }

  const bugun = new Date().toISOString().split('T')[0]
  const bugunRandevu = randevular.filter(r => r.RandevuTarihi.split('T')[0] === bugun).length
  const bekleyen = randevular.filter(r => r.Durum === 'Beklemede').length
  const tamamlanan = randevular.filter(r => r.Durum === 'Tamamlandı').length
  const iptalEdilen = randevular.filter(r => r.Durum === 'İptal').length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <nav className="bg-white dark:bg-gray-800 shadow-sm px-4 sm:px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">🏥</span>
          <span className="text-xl font-bold text-blue-700 dark:text-blue-400">MediRandevu</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <span className="text-gray-600 dark:text-gray-300 font-medium text-sm hidden sm:block truncate">
            👨‍⚕️ Dr. {kullanici?.ad} {kullanici?.soyad}
          </span>
          <button onClick={toggle} className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-lg">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button onClick={cikis} className="text-red-500 hover:text-red-600 text-sm font-medium shrink-0">Çıkış Yap</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-8">Doktor Paneli</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { icon: '📅', sayi: bugunRandevu, etiket: 'Bugünkü Randevu' },
            { icon: '⏳', sayi: bekleyen, etiket: 'Bekleyen' },
            { icon: '✅', sayi: tamamlanan, etiket: 'Tamamlanan' },
            { icon: '❌', sayi: iptalEdilen, etiket: 'İptal Edilen' },
          ].map((k) => (
            <div key={k.etiket} className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm flex items-center gap-3 sm:gap-4">
              <span className="text-2xl sm:text-3xl">{k.icon}</span>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">{k.sayi}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">{k.etiket}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">📋 Randevu Listesi</h2>

          {yukleniyor ? <p className="text-gray-400 text-sm">Yükleniyor...</p>
          : randevular.length === 0 ? <p className="text-gray-400 text-sm">Henüz randevunuz yok.</p>
          : (
            <>
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      {['Hasta', 'Tarih', 'Saat', 'Durum', 'İşlem'].map(h => (
                        <th key={h} className="text-left text-sm text-gray-500 dark:text-gray-400 font-medium pb-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {randevular.map((r) => (
                      <tr key={r.RandevuID} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                        <td className="py-4"><div className="flex items-center gap-3"><span>👤</span><span className="font-medium text-gray-800 dark:text-gray-100 text-sm">{r.HastaAdi}</span></div></td>
                        <td className="py-4 text-gray-600 dark:text-gray-300 text-sm">{r.RandevuTarihi.split('T')[0]}</td>
                        <td className="py-4 text-gray-600 dark:text-gray-300 text-sm">{String(r.RandevuSaati).substring(0, 5)}</td>
                        <td className="py-4"><span className={`text-xs px-3 py-1 rounded-full font-medium ${durumRenk[r.Durum] ?? ''}`}>{r.Durum}</span></td>
                        <td className="py-4">
                          <div className="flex gap-2">
                            {r.Durum === 'Beklemede' && <>
                              <button onClick={() => durumGuncelle(r.RandevuID, 'Onaylandı')} className="text-xs bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition">Onayla</button>
                              <button onClick={() => durumGuncelle(r.RandevuID, 'İptal')} className="text-xs bg-red-100 dark:bg-red-900/30 text-red-500 px-3 py-1 rounded-lg hover:bg-red-200 transition">İptal</button>
                            </>}
                            {r.Durum === 'Onaylandı' && <button onClick={() => durumGuncelle(r.RandevuID, 'Tamamlandı')} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-200 transition">Tamamla</button>}
                            {r.Durum === 'Tamamlandı' && <span className="text-xs text-gray-400">{r.Notlar || '—'}</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden flex flex-col gap-3">
                {randevular.map((r) => (
                  <div key={r.RandevuID} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600 transition">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2"><span>👤</span><span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{r.HastaAdi}</span></div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${durumRenk[r.Durum] ?? ''}`}>{r.Durum}</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mb-3 pl-7">{r.RandevuTarihi.split('T')[0]} · {String(r.RandevuSaati).substring(0, 5)}</p>
                    <div className="flex gap-2 pl-7">
                      {r.Durum === 'Beklemede' && <>
                        <button onClick={() => durumGuncelle(r.RandevuID, 'Onaylandı')} className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition">Onayla</button>
                        <button onClick={() => durumGuncelle(r.RandevuID, 'İptal')} className="text-xs bg-red-100 dark:bg-red-900/30 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-200 transition">İptal</button>
                      </>}
                      {r.Durum === 'Onaylandı' && <button onClick={() => durumGuncelle(r.RandevuID, 'Tamamlandı')} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition">Tamamla</button>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
