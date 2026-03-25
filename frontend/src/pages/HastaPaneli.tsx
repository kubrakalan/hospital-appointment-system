import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../ThemeContext'

const randevular = [
  { id: 1, doktor: 'Dr. Kübra Kalan', uzmanlik: 'Kardiyoloji', tarih: '2026-04-01', saat: '10:00', durum: 'Onaylandı' },
  { id: 2, doktor: 'Dr. Beyza Nur Çift', uzmanlik: 'Ortopedi', tarih: '2026-04-05', saat: '14:00', durum: 'Beklemede' },
  { id: 3, doktor: 'Dr. Doğa Güler', uzmanlik: 'Psikiyatri', tarih: '2026-03-10', saat: '09:00', durum: 'Tamamlandı' },
]

const durumRenk: Record<string, string> = {
  'Onaylandı': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'Beklemede': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  'Tamamlandı': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  'İptal': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

// Mock: dolu randevu slotları — backend bağlandığında API'den gelecek
const doluSlotlar: Record<string, Record<string, string[]>> = {
  'Dr. Kübra Kalan': {
    '2026-04-01': ['09:00', '10:00', '11:00', '14:00', '15:00'],
    '2026-04-03': ['09:00', '10:00', '11:00', '14:00', '15:00'],
    '2026-04-08': ['09:00', '10:00', '11:00', '14:00', '15:00'],
  },
  'Dr. Beyza Nur Çift': {
    '2026-04-05': ['09:00', '10:00'],
    '2026-04-07': ['09:00', '10:00', '11:00', '14:00', '15:00'],
  },
  'Dr. Doğa Güler': {
    '2026-04-02': ['09:00', '10:00', '11:00', '14:00', '15:00'],
    '2026-04-09': ['09:00', '10:00', '11:00', '14:00', '15:00'],
  },
}

const tumSaatler = ['09:00', '10:00', '11:00', '14:00', '15:00']

function musaitSaatleriGetir(doktor: string, tarih: string): string[] {
  if (!doktor || !tarih) return tumSaatler
  const dolu = doluSlotlar[doktor]?.[tarih] ?? []
  return tumSaatler.filter((s) => !dolu.includes(s))
}

function enYakinMuzaitTarihiBul(doktor: string, baslangicTarihi: string): string | null {
  const baslangic = new Date(baslangicTarihi)
  for (let i = 1; i <= 30; i++) {
    const sonraki = new Date(baslangic)
    sonraki.setDate(baslangic.getDate() + i)
    const gun = sonraki.getDay()
    if (gun === 0 || gun === 6) continue
    const tarihStr = sonraki.toISOString().split('T')[0]
    if (musaitSaatleriGetir(doktor, tarihStr).length > 0) return tarihStr
  }
  return null
}

function tarihFormatla(tarih: string): string {
  const [yil, ay, gun] = tarih.split('-')
  const aylar = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ]
  return `${gun} ${aylar[parseInt(ay) - 1]} ${yil}`
}

export default function HastaPaneli() {
  const { theme, toggle } = useTheme()
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

  const inputCls = "border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm w-full"

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">

      {/* NAVBAR */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm px-4 sm:px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">🏥</span>
          <span className="text-xl font-bold text-blue-700 dark:text-blue-400">MediRandevu</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <span className="text-gray-600 dark:text-gray-300 font-medium text-sm truncate hidden sm:block">
            👤 Merhaba, Test Kullanıcı
          </span>
          <span className="text-gray-600 dark:text-gray-300 text-sm sm:hidden">👤</span>
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

        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-8">Hasta Paneli</h1>

        {/* ÜST KARTLAR */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: '📅', sayi: '2', etiket: 'Yaklaşan Randevu' },
            { icon: '✅', sayi: '1', etiket: 'Tamamlanan' },
            { icon: '❌', sayi: '0', etiket: 'İptal Edilen' },
          ].map((k) => (
            <div key={k.etiket} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm flex items-center gap-4">
              <span className="text-3xl">{k.icon}</span>
              <div>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{k.sayi}</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{k.etiket}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* YENİ RANDEVU FORMU */}
          <div className="md:col-span-1 bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">🗓️ Yeni Randevu Al</h2>
            <form className="flex flex-col gap-3">

              <select
                value={bolum}
                onChange={(e) => { setBolum(e.target.value); setDoktor(''); setSaat('') }}
                className={inputCls}
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
                className={inputCls}
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
                className={inputCls}
              />

              {/* EN YAKIN RANDEVU ÖNERİSİ */}
              {gunDolu && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3">
                  <p className="text-amber-800 dark:text-amber-300 font-semibold text-sm mb-1">
                    Bu gün için müsait randevu yok
                  </p>
                  {enYakinTarih ? (
                    <>
                      <p className="text-amber-700 dark:text-amber-400 text-xs mb-1">
                        En yakın uygun tarih:{' '}
                        <span className="font-semibold">{tarihFormatla(enYakinTarih)}</span>
                      </p>
                      <p className="text-amber-600 dark:text-amber-500 text-xs mb-2">
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
                    <p className="text-amber-700 dark:text-amber-400 text-xs">
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
                  className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <option value="">Saat Seçiniz</option>
                  {musaitSaatler.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {doktor && tarih && !gunDolu && musaitSaatler.length < tumSaatler.length && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 px-1">
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
          <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">📋 Randevularım</h2>
            <div className="flex flex-col gap-3">
              {randevular.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600 transition"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">👨‍⚕️</span>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{r.doktor}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">{r.uzmanlik}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:flex-col sm:text-center sm:items-end gap-2">
                    <p className="text-gray-700 dark:text-gray-300 text-sm font-medium">{r.tarih} · {r.saat}</p>
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
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
