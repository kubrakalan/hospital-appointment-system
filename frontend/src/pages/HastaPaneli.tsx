import { Link } from 'react-router-dom'

const randevular = [
  { id: 1, doktor: 'Dr. Kübra Kalan', uzmanlik: 'Kardiyoloji', tarih: '2026-04-01', saat: '10:00', durum: 'Onaylandı' },
  { id: 2, doktor: 'Dr. Beyza Nur Çift', uzmanlik: 'Ortopedi', tarih: '2026-04-05', saat: '14:00', durum: 'Beklemede' },
  { id: 3, doktor: 'Dr. Doğa Güler', uzmanlik: 'Psikiyatri', tarih: '2026-03-10', saat: '09:00', durum: 'Tamamlandı' },
]

const durumRenk: Record<string, string> = {
  'Onaylandı': 'bg-green-100 text-green-700',
  'Beklemede': 'bg-yellow-100 text-yellow-700',
  'Tamamlandı': 'bg-gray-100 text-gray-600',
  'İptal': 'bg-red-100 text-red-700',
}

export default function HastaPaneli() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* NAVBAR */}
      <nav className="bg-white shadow-sm px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🏥</span>
          <span className="text-xl font-bold text-blue-700">MediRandevu</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-gray-600 font-medium">👤 Merhaba, Test Kullanıcı</span>
          <Link to="/" className="text-red-500 hover:text-red-600 text-sm font-medium">
            Çıkış Yap
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-10">

        <h1 className="text-2xl font-bold text-gray-800 mb-8">Hasta Paneli</h1>

        {/* ÜST KARTLAR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {[
            { icon: '📅', sayi: '2', etiket: 'Yaklaşan Randevu' },
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* YENİ RANDEVU FORMU */}
          <div className="md:col-span-1 bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">🗓️ Yeni Randevu Al</h2>
            <form className="flex flex-col gap-3">
              <select className="border border-gray-200 rounded-lg px-3 py-2.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm">
                <option>Bölüm Seçiniz</option>
                <option>Kardiyoloji</option>
                <option>Ortopedi</option>
                <option>Nöroloji</option>
                <option>Göz Hastalıkları</option>
                <option>Dahiliye</option>
              </select>
              <select className="border border-gray-200 rounded-lg px-3 py-2.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm">
                <option>Doktor Seçiniz</option>
                <option>Dr. Kübra Kalan</option>
                <option>Dr. Beyza Nur Çift</option>
                <option>Dr. Doğa Güler</option>
              </select>
              <input
                type="date"
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
              />
              <select className="border border-gray-200 rounded-lg px-3 py-2.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm">
                <option>Saat Seçiniz</option>
                <option>09:00</option>
                <option>10:00</option>
                <option>11:00</option>
                <option>14:00</option>
                <option>15:00</option>
              </select>
              <button
                type="submit"
                className="bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm mt-1"
              >
                Randevu Al
              </button>
            </form>
          </div>

          {/* RANDEVU LİSTESİ */}
          <div className="md:col-span-2 bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">📋 Randevularım</h2>
            <div className="flex flex-col gap-3">
              {randevular.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-blue-200 transition"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">👨‍⚕️</span>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{r.doktor}</p>
                      <p className="text-gray-500 text-xs">{r.uzmanlik}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-700 text-sm font-medium">{r.tarih}</p>
                    <p className="text-gray-500 text-xs">{r.saat}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${durumRenk[r.durum]}`}>
                      {r.durum}
                    </span>
                    {r.durum === 'Beklemede' && (
                      <button className="text-xs text-red-500 hover:text-red-600 font-medium">
                        İptal
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
