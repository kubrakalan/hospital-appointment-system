import { Link } from 'react-router-dom'
import { useTheme } from '../ThemeContext'

const randevular = [
  { id: 1, hasta: 'Ali Veli', tarih: '2026-04-01', saat: '09:00', durum: 'Onaylandı', not: '' },
  { id: 2, hasta: 'Ayşe Yıldız', tarih: '2026-04-01', saat: '10:00', durum: 'Beklemede', not: '' },
  { id: 3, hasta: 'Mehmet Kaya', tarih: '2026-04-02', saat: '11:00', durum: 'Beklemede', not: '' },
  { id: 4, hasta: 'Fatma Demir', tarih: '2026-03-20', saat: '14:00', durum: 'Tamamlandı', not: 'Kontrol önerildi' },
]

const durumRenk: Record<string, string> = {
  'Onaylandı': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'Beklemede': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  'Tamamlandı': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  'İptal': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export default function DoktorPaneli() {
  const { theme, toggle } = useTheme()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">

      {/* NAVBAR */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm px-4 sm:px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">🏥</span>
          <span className="text-xl font-bold text-blue-700 dark:text-blue-400">MediRandevu</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <span className="text-gray-600 dark:text-gray-300 font-medium text-sm hidden sm:block truncate">
            👨‍⚕️ Dr. Kübra Kalan
          </span>
          <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-medium hidden sm:block">
            Kardiyoloji
          </span>
          <button
            onClick={toggle}
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-lg"
            title={theme === 'dark' ? 'Aydınlık mod' : 'Karanlık mod'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <Link to="/" className="text-red-500 hover:text-red-600 text-sm font-medium shrink-0">
            Çıkış Yap
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10">

        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-8">Doktor Paneli</h1>

        {/* ÜST KARTLAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { icon: '📅', sayi: '3', etiket: 'Bugünkü Randevu' },
            { icon: '⏳', sayi: '2', etiket: 'Bekleyen' },
            { icon: '✅', sayi: '1', etiket: 'Tamamlanan' },
            { icon: '❌', sayi: '0', etiket: 'İptal Edilen' },
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

        {/* RANDEVU LİSTESİ */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">📋 Randevu Listesi</h2>

          {/* MASAÜSTÜ — tablo görünümü */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left text-sm text-gray-500 dark:text-gray-400 font-medium pb-3">Hasta</th>
                  <th className="text-left text-sm text-gray-500 dark:text-gray-400 font-medium pb-3">Tarih</th>
                  <th className="text-left text-sm text-gray-500 dark:text-gray-400 font-medium pb-3">Saat</th>
                  <th className="text-left text-sm text-gray-500 dark:text-gray-400 font-medium pb-3">Durum</th>
                  <th className="text-left text-sm text-gray-500 dark:text-gray-400 font-medium pb-3">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {randevular.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">👤</span>
                        <span className="font-medium text-gray-800 dark:text-gray-100 text-sm">{r.hasta}</span>
                      </div>
                    </td>
                    <td className="py-4 text-gray-600 dark:text-gray-300 text-sm">{r.tarih}</td>
                    <td className="py-4 text-gray-600 dark:text-gray-300 text-sm">{r.saat}</td>
                    <td className="py-4">
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${durumRenk[r.durum]}`}>
                        {r.durum}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex gap-2">
                        {r.durum === 'Beklemede' && (
                          <>
                            <button className="text-xs bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition">
                              Onayla
                            </button>
                            <button className="text-xs bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 px-3 py-1 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition">
                              İptal
                            </button>
                          </>
                        )}
                        {r.durum === 'Onaylandı' && (
                          <button className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition">
                            Tamamla
                          </button>
                        )}
                        {r.durum === 'Tamamlandı' && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">{r.not || '—'}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBİL — kart görünümü */}
          <div className="md:hidden flex flex-col gap-3">
            {randevular.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👤</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{r.hasta}</span>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${durumRenk[r.durum]}`}>
                    {r.durum}
                  </span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-3 pl-7">
                  {r.tarih} · {r.saat}
                </p>
                <div className="flex gap-2 pl-7">
                  {r.durum === 'Beklemede' && (
                    <>
                      <button className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition">
                        Onayla
                      </button>
                      <button className="text-xs bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition">
                        İptal
                      </button>
                    </>
                  )}
                  {r.durum === 'Onaylandı' && (
                    <button className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition">
                      Tamamla
                    </button>
                  )}
                  {r.durum === 'Tamamlandı' && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">{r.not || '—'}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
