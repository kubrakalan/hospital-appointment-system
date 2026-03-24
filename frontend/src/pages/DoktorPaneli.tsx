import { Link } from 'react-router-dom'

const randevular = [
  { id: 1, hasta: 'Ali Veli', tarih: '2026-04-01', saat: '09:00', durum: 'Onaylandı', not: '' },
  { id: 2, hasta: 'Ayşe Yıldız', tarih: '2026-04-01', saat: '10:00', durum: 'Beklemede', not: '' },
  { id: 3, hasta: 'Mehmet Kaya', tarih: '2026-04-02', saat: '11:00', durum: 'Beklemede', not: '' },
  { id: 4, hasta: 'Fatma Demir', tarih: '2026-03-20', saat: '14:00', durum: 'Tamamlandı', not: 'Kontrol önerildi' },
]

const durumRenk: Record<string, string> = {
  'Onaylandı': 'bg-green-100 text-green-700',
  'Beklemede': 'bg-yellow-100 text-yellow-700',
  'Tamamlandı': 'bg-gray-100 text-gray-600',
  'İptal': 'bg-red-100 text-red-700',
}

export default function DoktorPaneli() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* NAVBAR */}
      <nav className="bg-white shadow-sm px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🏥</span>
          <span className="text-xl font-bold text-blue-700">MediRandevu</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-gray-600 font-medium">👨‍⚕️ Dr. Kübra Kalan</span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Kardiyoloji</span>
          <Link to="/" className="text-red-500 hover:text-red-600 text-sm font-medium">
            Çıkış Yap
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-10">

        <h1 className="text-2xl font-bold text-gray-800 mb-8">Doktor Paneli</h1>

        {/* ÜST KARTLAR */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          {[
            { icon: '📅', sayi: '3', etiket: 'Bugünkü Randevu' },
            { icon: '⏳', sayi: '2', etiket: 'Bekleyen' },
            { icon: '✅', sayi: '1', etiket: 'Tamamlanan' },
            { icon: '❌', sayi: '0', etiket: 'İptal Edilen' },
          ].map((k) => (
            <div key={k.etiket} className="bg-white rounded-xl p-5 shadow-sm flex items-center gap-4">
              <span className="text-3xl">{k.icon}</span>
              <div>
                <p className="text-2xl font-bold text-gray-800">{k.sayi}</p>
                <p className="text-gray-500 text-sm">{k.etiket}</p>
              </div>
            </div>
          ))}
        </div>

        {/* RANDEVU LİSTESİ */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">📋 Randevu Listesi</h2>

          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-sm text-gray-500 font-medium pb-3">Hasta</th>
                <th className="text-left text-sm text-gray-500 font-medium pb-3">Tarih</th>
                <th className="text-left text-sm text-gray-500 font-medium pb-3">Saat</th>
                <th className="text-left text-sm text-gray-500 font-medium pb-3">Durum</th>
                <th className="text-left text-sm text-gray-500 font-medium pb-3">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {randevular.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">👤</span>
                      <span className="font-medium text-gray-800 text-sm">{r.hasta}</span>
                    </div>
                  </td>
                  <td className="py-4 text-gray-600 text-sm">{r.tarih}</td>
                  <td className="py-4 text-gray-600 text-sm">{r.saat}</td>
                  <td className="py-4">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${durumRenk[r.durum]}`}>
                      {r.durum}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex gap-2">
                      {r.durum === 'Beklemede' && (
                        <>
                          <button className="text-xs bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600">
                            Onayla
                          </button>
                          <button className="text-xs bg-red-100 text-red-500 px-3 py-1 rounded-lg hover:bg-red-200">
                            İptal
                          </button>
                        </>
                      )}
                      {r.durum === 'Onaylandı' && (
                        <button className="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-200">
                          Tamamla
                        </button>
                      )}
                      {r.durum === 'Tamamlandı' && (
                        <span className="text-xs text-gray-400">{r.not || '—'}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
