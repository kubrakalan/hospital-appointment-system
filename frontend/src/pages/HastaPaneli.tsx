import { useState } from 'react'
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

// Mock: dolu randevu slotları — backend bağlandığında API'den gelecek
// Yapı: { doktorAdi: { 'YYYY-MM-DD': ['09:00', '10:00', ...] } }
const doluSlotlar: Record<string, Record<string, string[]>> = {
  'Dr. Kübra Kalan': {
    '2026-04-01': ['09:00', '10:00', '11:00', '14:00', '15:00'], // tamamen dolu
    '2026-04-03': ['09:00', '10:00', '11:00', '14:00', '15:00'], // tamamen dolu
    '2026-04-08': ['09:00', '10:00', '11:00', '14:00', '15:00'], // tamamen dolu
  },
  'Dr. Beyza Nur Çift': {
    '2026-04-05': ['09:00', '10:00'],
    '2026-04-07': ['09:00', '10:00', '11:00', '14:00', '15:00'], // tamamen dolu
  },
  'Dr. Doğa Güler': {
    '2026-04-02': ['09:00', '10:00', '11:00', '14:00', '15:00'], // tamamen dolu
    '2026-04-09': ['09:00', '10:00', '11:00', '14:00', '15:00'], // tamamen dolu
  },
}

const tumSaatler = ['09:00', '10:00', '11:00', '14:00', '15:00']

/** Seçili doktor ve tarih için boş saatleri döndürür */
function musaitSaatleriGetir(doktor: string, tarih: string): string[] {
  if (!doktor || !tarih) return tumSaatler
  const dolu = doluSlotlar[doktor]?.[tarih] ?? []
  return tumSaatler.filter((s) => !dolu.includes(s))
}

/** Seçili tarihten itibaren 30 gün içinde en yakın müsait günü bulur */
function enYakinMuzaitTarihiBul(doktor: string, baslangicTarihi: string): string | null {
  const baslangic = new Date(baslangicTarihi)
  for (let i = 1; i <= 30; i++) {
    const sonraki = new Date(baslangic)
    sonraki.setDate(baslangic.getDate() + i)
    // Hafta sonu kontrolü (0 = Pazar, 6 = Cumartesi)
    const gun = sonraki.getDay()
    if (gun === 0 || gun === 6) continue
    const tarihStr = sonraki.toISOString().split('T')[0]
    if (musaitSaatleriGetir(doktor, tarihStr).length > 0) return tarihStr
  }
  return null
}

/** Tarihi Türkçe formatlar: "01 Nisan 2026" */
function tarihFormatla(tarih: string): string {
  const [yil, ay, gun] = tarih.split('-')
  const aylar = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ]
  return `${gun} ${aylar[parseInt(ay) - 1]} ${yil}`
}

export default function HastaPaneli() {
  const [bolum, setBolum] = useState('')
  const [doktor, setDoktor] = useState('')
  const [tarih, setTarih] = useState('')
  const [saat, setSaat] = useState('')

  const musaitSaatler = musaitSaatleriGetir(doktor, tarih)
  const gunDolu = doktor !== '' && tarih !== '' && musaitSaatler.length === 0
  const enYakinTarih = gunDolu ? enYakinMuzaitTarihiBul(doktor, tarih) : null
  const enYakinMusaitSaatler = enYakinTarih ? musaitSaatleriGetir(doktor, enYakinTarih) : []

  function enYakinTariheGec() {
    if (enYakinTarih) {
      setTarih(enYakinTarih)
      setSaat('')
    }
  }

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

              <select
                value={bolum}
                onChange={(e) => { setBolum(e.target.value); setDoktor(''); setSaat('') }}
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
              >
                <option value="">Bölüm Seçiniz</option>
                <option>Kardiyoloji</option>
                <option>Ortopedi</option>
                <option>Nöroloji</option>
                <option>Göz Hastalıkları</option>
                <option>Dahiliye</option>
              </select>

              <select
                value={doktor}
                onChange={(e) => { setDoktor(e.target.value); setSaat('') }}
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
              >
                <option value="">Doktor Seçiniz</option>
                <option>Dr. Kübra Kalan</option>
                <option>Dr. Beyza Nur Çift</option>
                <option>Dr. Doğa Güler</option>
              </select>

              <input
                type="date"
                value={tarih}
                onChange={(e) => { setTarih(e.target.value); setSaat('') }}
                min={new Date().toISOString().split('T')[0]}
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
              />

              {/* EN YAKIN RANDEVU ÖNERİSİ — sadece gün doluysa gösterilir */}
              {gunDolu && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-amber-800 font-semibold text-sm mb-1">
                    Bu gün için müsait randevu yok
                  </p>
                  {enYakinTarih ? (
                    <>
                      <p className="text-amber-700 text-xs mb-1">
                        En yakın uygun tarih:{' '}
                        <span className="font-semibold">{tarihFormatla(enYakinTarih)}</span>
                      </p>
                      <p className="text-amber-600 text-xs mb-2">
                        Müsait saatler: {enYakinMusaitSaatler.join(' · ')}
                      </p>
                      <button
                        type="button"
                        onClick={enYakinTariheGec}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium py-1.5 rounded-lg transition"
                      >
                        Bu tarihe geç →
                      </button>
                    </>
                  ) : (
                    <p className="text-amber-700 text-xs">
                      Önümüzdeki 30 gün içinde müsait randevu bulunamadı.
                    </p>
                  )}
                </div>
              )}

              {/* SAAT SEÇİMİ */}
              <div>
                <select
                  value={saat}
                  onChange={(e) => setSaat(e.target.value)}
                  disabled={gunDolu || !tarih || !doktor}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Saat Seçiniz</option>
                  {musaitSaatler.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {/* Kısmen dolu günlerde dolu saatleri göster */}
                {doktor && tarih && !gunDolu && musaitSaatler.length < tumSaatler.length && (
                  <p className="text-xs text-gray-400 mt-1 px-1">
                    Dolu: {tumSaatler.filter((s) => !musaitSaatler.includes(s)).join(', ')}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!bolum || !doktor || !tarih || !saat}
                className="bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm mt-1 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
