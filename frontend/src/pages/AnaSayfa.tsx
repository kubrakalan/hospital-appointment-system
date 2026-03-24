import { Link } from 'react-router-dom'

export default function AnaSayfa() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* NAVBAR */}
      <nav className="bg-white shadow-sm px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏥</span>
          <span className="text-xl font-bold text-blue-700">MediRandevu</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/giris" className="text-gray-600 hover:text-blue-700 font-medium">
            Giriş Yap
          </Link>
          <Link
            to="/kayit"
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            Kayıt Ol
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-blue-700 text-white py-20 px-8 text-center">
        <h1 className="text-4xl font-bold mb-4">
          Sağlığınız İçin Doğru Adres
        </h1>
        <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
          Uzman doktorlarımızdan kolayca randevu alın, sağlığınızı güvence altına alın.
        </p>
        <Link
          to="/kayit"
          className="bg-white text-blue-700 font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 inline-block"
        >
          Hemen Randevu Al
        </Link>
      </section>

      {/* RANDEVU FORMU */}
      <section className="max-w-3xl mx-auto -mt-8 bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Hızlı Randevu</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select className="border border-gray-200 rounded-lg px-4 py-3 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300">
            <option>🏥 Bölüm Seçiniz</option>
            <option>Kardiyoloji</option>
            <option>Ortopedi</option>
            <option>Nöroloji</option>
            <option>Göz Hastalıkları</option>
            <option>Dahiliye</option>
          </select>
          <select className="border border-gray-200 rounded-lg px-4 py-3 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300">
            <option>👨‍⚕️ Doktor Seçiniz</option>
          </select>
          <input
            type="date"
            className="border border-gray-200 rounded-lg px-4 py-3 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <button className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium">
          Randevu Ara
        </button>
      </section>

      {/* HİZMETLER */}
      <section className="max-w-5xl mx-auto py-16 px-8">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-10">
          Neden MediRandevu?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '📅', baslik: 'Kolay Randevu', aciklama: '7/24 online randevu alın, beklemeden.' },
            { icon: '👨‍⚕️', baslik: 'Uzman Doktorlar', aciklama: 'Alanında uzman doktorlarla görüşün.' },
            { icon: '🔒', baslik: 'Güvenli Sistem', aciklama: 'Kişisel verileriniz güvende.' },
          ].map((kart) => (
            <div key={kart.baslik} className="bg-white rounded-xl p-6 shadow-sm text-center">
              <div className="text-4xl mb-3">{kart.icon}</div>
              <h3 className="font-semibold text-gray-800 mb-2">{kart.baslik}</h3>
              <p className="text-gray-500 text-sm">{kart.aciklama}</p>
            </div>
          ))}
        </div>
      </section>

      {/* UZMANLIK ALANLARI */}
      <section className="bg-white py-12 px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-8">
            Uzmanlık Alanlarımız
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '❤️', ad: 'Kardiyoloji' },
              { icon: '🦴', ad: 'Ortopedi' },
              { icon: '🧠', ad: 'Nöroloji' },
              { icon: '👁️', ad: 'Göz Hastalıkları' },
              { icon: '👂', ad: 'Kulak Burun Boğaz' },
              { icon: '🩺', ad: 'Dahiliye' },
              { icon: '👶', ad: 'Çocuk Sağlığı' },
              { icon: '🧴', ad: 'Dermatoloji' },
            ].map((uzmanlik) => (
              <div
                key={uzmanlik.ad}
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition"
              >
                <span className="text-2xl">{uzmanlik.icon}</span>
                <span className="text-gray-700 font-medium text-sm">{uzmanlik.ad}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-blue-700 text-blue-100 text-center py-6 mt-8">
        <p>© 2026 MediRandevu — Tüm hakları saklıdır.</p>
      </footer>

    </div>
  )
}
