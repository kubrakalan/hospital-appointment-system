import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../ThemeContext'
import { useAuth } from '../AuthContext'
import { api } from '../api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

const durumRenk: Record<string, string> = {
  'Onaylandı': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'Beklemede': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  'Tamamlandı': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  'İptal': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const bos = { ad: '', soyad: '', email: '', sifre: '', uzmanlikAdi: '', telefon: '' }

export default function AdminPaneli() {
  const { theme, toggle } = useTheme()
  const { kullanici, cikisYap } = useAuth()
  const navigate = useNavigate()

  const [istatistik, setIstatistik] = useState({ toplamHasta: 0, toplamDoktor: 0, toplamRandevu: 0, bekleyen: 0 })
  const [randevular, setRandevular] = useState<any[]>([])
  const [doktorlar, setDoktorlar] = useState<any[]>([])
  const [yoneticiler, setYoneticiler] = useState<any[]>([])
  const [aktifSekme, setAktifSekme] = useState<'randevular' | 'doktorlar' | 'yoneticiler' | 'istatistikler'>('randevular')
  const [gunlukVeri, setGunlukVeri] = useState<{ tarih: string; sayi: number }[]>([])
  const [aramaMetni, setAramaMetni] = useState('')
  const [durumFiltre, setDurumFiltre] = useState('Tümü')
  const [doktorFormu, setDoktorFormu] = useState(false)
  const [yeniDoktor, setYeniDoktor] = useState(bos)
  const [formHata, setFormHata] = useState('')

  useEffect(() => {
    yukle()
  }, [])

  async function yukle() {
    const [ist, r, d, y, g] = await Promise.all([
      api.adminIstatistikler(),
      api.adminRandevular(),
      api.adminDoktorlar(),
      api.adminYoneticiler(),
      api.adminGunlukIstatistik(),
    ])
    setIstatistik(ist)
    setRandevular(r)
    setDoktorlar(d)
    setYoneticiler(y)
    setGunlukVeri(g)
  }

  function cikis() { cikisYap(); navigate('/giris') }

  async function randevuDurum(id: number, durum: string) {
    await api.adminRandevuDurum(id, durum)
    setRandevular(prev => prev.map(r => r.RandevuID === id ? { ...r, Durum: durum } : r))
    setIstatistik(prev => ({ ...prev, bekleyen: randevular.filter(r => r.Durum === 'Beklemede').length }))
  }

  async function randevuSil(id: number) {
    await api.adminRandevuSil(id)
    setRandevular(prev => prev.filter(r => r.RandevuID !== id))
  }

  async function doktorEkle() {
    setFormHata('')
    if (!yeniDoktor.ad || !yeniDoktor.soyad || !yeniDoktor.email || !yeniDoktor.sifre || !yeniDoktor.uzmanlikAdi) {
      setFormHata('Tüm zorunlu alanları doldurun')
      return
    }
    try {
      await api.adminDoktorEkle(yeniDoktor)
      setYeniDoktor(bos)
      setDoktorFormu(false)
      const d = await api.adminDoktorlar()
      setDoktorlar(d)
    } catch (err: unknown) {
      setFormHata(err instanceof Error ? err.message : 'Hata oluştu')
    }
  }

  async function doktorSil(id: number) {
    await api.adminDoktorSil(id)
    setDoktorlar(prev => prev.filter(d => d.DoktorID !== id))
  }

  const filtreliRandevular = randevular.filter(r => {
    const aramaUygun = r.HastaAdi?.toLowerCase().includes(aramaMetni.toLowerCase()) ||
                       r.DoktorAdi?.toLowerCase().includes(aramaMetni.toLowerCase())
    const durumUygun = durumFiltre === 'Tümü' || r.Durum === durumFiltre
    return aramaUygun && durumUygun
  })

  const inputCls = "w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <nav className="bg-white dark:bg-gray-800 shadow-sm px-4 sm:px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">🏥</span>
          <span className="text-xl font-bold text-blue-700 dark:text-blue-400">MediRandevu</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-gray-600 dark:text-gray-300 font-medium text-sm hidden sm:block">
            🛡️ {kullanici?.ad} {kullanici?.soyad}
          </span>
          <button onClick={toggle} className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-lg">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button onClick={cikis} className="text-red-500 hover:text-red-600 text-sm font-medium">Çıkış Yap</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-8">Admin Paneli</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: '👥', sayi: istatistik.toplamHasta, etiket: 'Toplam Hasta' },
            { icon: '👨‍⚕️', sayi: istatistik.toplamDoktor, etiket: 'Toplam Doktor' },
            { icon: '📅', sayi: istatistik.toplamRandevu, etiket: 'Toplam Randevu' },
            { icon: '⏳', sayi: istatistik.bekleyen, etiket: 'Bekleyen' },
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

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {(['randevular', 'doktorlar', 'yoneticiler', 'istatistikler'] as const).map((sekme) => (
            <button key={sekme} onClick={() => setAktifSekme(sekme)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition whitespace-nowrap ${aktifSekme === sekme ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              {sekme === 'randevular' ? 'Randevular' : sekme === 'doktorlar' ? 'Doktorlar' : sekme === 'yoneticiler' ? 'Yöneticiler' : '📈 İstatistikler'}
            </button>
          ))}
        </div>

        {/* RANDEVULAR */}
        {aktifSekme === 'randevular' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <input type="text" placeholder="Hasta veya doktor ara..." value={aramaMetni} onChange={e => setAramaMetni(e.target.value)}
                className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 flex-1 placeholder-gray-400" />
              <select value={durumFiltre} onChange={e => setDurumFiltre(e.target.value)}
                className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option>Tümü</option>
                <option>Beklemede</option>
                <option>Onaylandı</option>
                <option>Tamamlandı</option>
                <option>İptal</option>
              </select>
            </div>

            <div className="flex flex-col gap-3">
              {filtreliRandevular.length === 0 && <p className="text-center text-gray-400 py-8">Randevu bulunamadı.</p>}
              {filtreliRandevular.map((r) => (
                <div key={r.RandevuID} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600 transition">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">👤</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{r.HastaAdi}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs truncate">Dr. {r.DoktorAdi} · {r.UzmanlikAdi}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${durumRenk[r.Durum] ?? ''}`}>{r.Durum}</span>
                  </div>
                  <div className="flex items-center justify-between pl-9">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">{r.RandevuTarihi.split('T')[0]} · {String(r.RandevuSaati).substring(0, 5)}</p>
                    <div className="flex gap-2 flex-wrap">
                      {r.Durum === 'Beklemede' && <button onClick={() => randevuDurum(r.RandevuID, 'Onaylandı')} className="text-xs bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition">Onayla</button>}
                      {(r.Durum === 'Beklemede' || r.Durum === 'Onaylandı') && <button onClick={() => randevuDurum(r.RandevuID, 'İptal')} className="text-xs bg-red-100 dark:bg-red-900/30 text-red-500 px-3 py-1 rounded-lg hover:bg-red-200 transition">İptal Et</button>}
                      {r.Durum === 'İptal' && <button onClick={() => randevuSil(r.RandevuID)} className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 dark:border-gray-600 px-3 py-1 rounded-lg transition">Sil</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DOKTORLAR */}
        {aktifSekme === 'doktorlar' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Doktor Listesi</h2>
              <button onClick={() => { setDoktorFormu(!doktorFormu); setYeniDoktor(bos); setFormHata('') }} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">+ Yeni Doktor Ekle</button>
            </div>

            {doktorFormu && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 mb-4">
                {formHata && <p className="text-red-500 text-sm mb-3">{formHata}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Ad *</label><input type="text" placeholder="Adı" value={yeniDoktor.ad} onChange={e => setYeniDoktor({ ...yeniDoktor, ad: e.target.value })} className={inputCls} /></div>
                  <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Soyad *</label><input type="text" placeholder="Soyadı" value={yeniDoktor.soyad} onChange={e => setYeniDoktor({ ...yeniDoktor, soyad: e.target.value })} className={inputCls} /></div>
                  <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">E-posta *</label><input type="email" placeholder="doktor@hastane.com" value={yeniDoktor.email} onChange={e => setYeniDoktor({ ...yeniDoktor, email: e.target.value })} className={inputCls} /></div>
                  <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Geçici Şifre *</label><input type="password" placeholder="••••••••" value={yeniDoktor.sifre} onChange={e => setYeniDoktor({ ...yeniDoktor, sifre: e.target.value })} className={inputCls} /></div>
                  <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Uzmanlık *</label>
                    <select value={yeniDoktor.uzmanlikAdi} onChange={e => setYeniDoktor({ ...yeniDoktor, uzmanlikAdi: e.target.value })} className={inputCls}>
                      <option value="">Seçiniz</option>
                      <option>Kardiyoloji</option><option>Ortopedi</option><option>Nöroloji</option>
                      <option>Göz Hastalıkları</option><option>Dahiliye</option><option>Psikiyatri</option>
                      <option>Çocuk Sağlığı</option><option>Dermatoloji</option>
                    </select>
                  </div>
                  <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Telefon</label><input type="tel" placeholder="05XX XXX XX XX" value={yeniDoktor.telefon} onChange={e => setYeniDoktor({ ...yeniDoktor, telefon: e.target.value })} className={inputCls} /></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={doktorEkle} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition">Ekle</button>
                  <button onClick={() => { setDoktorFormu(false); setYeniDoktor(bos); setFormHata('') }} className="text-gray-400 hover:text-gray-600 px-4 py-2 text-sm">Vazgeç</button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {doktorlar.map((d) => (
                <div key={d.DoktorID} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">👨‍⚕️</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Dr. {d.Ad} {d.Soyad}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs truncate">{d.UzmanlikAdi} · {d.Email}</p>
                    </div>
                  </div>
                  <button onClick={() => doktorSil(d.DoktorID)} className="text-xs bg-red-100 dark:bg-red-900/30 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-200 transition shrink-0">Kaldır</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* İSTATİSTİKLER */}
        {aktifSekme === 'istatistikler' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">Son 30 Günlük Randevu Grafiği</h2>
            <p className="text-gray-400 text-sm mb-6">Her güne ait toplam randevu sayısı</p>

            {gunlukVeri.length === 0 ? (
              <p className="text-center text-gray-400 py-12">Son 30 günde randevu bulunamadı.</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={gunlukVeri} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="tarih"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickFormatter={(val) => val.slice(5)} // "2026-03-15" → "03-15"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f9fafb' }}
                    formatter={(val) => [`${val} randevu`, '']}
                    labelFormatter={(label) => `Tarih: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="sayi"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#2563eb' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}

            {/* Özet istatistikler */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {gunlukVeri.reduce((t, g) => t + g.sayi, 0)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Son 30 gün toplam</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {gunlukVeri.length > 0 ? Math.max(...gunlukVeri.map(g => g.sayi)) : 0}
                </p>
                <p className="text-xs text-gray-400 mt-1">En yoğun gün</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {gunlukVeri.length > 0 ? (gunlukVeri.reduce((t, g) => t + g.sayi, 0) / gunlukVeri.length).toFixed(1) : 0}
                </p>
                <p className="text-xs text-gray-400 mt-1">Günlük ortalama</p>
              </div>
            </div>
          </div>
        )}

        {/* YÖNETİCİLER */}
        {aktifSekme === 'yoneticiler' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Yönetici Listesi</h2>
            <div className="flex flex-col gap-3">
              {yoneticiler.map((y) => (
                <div key={y.KullaniciID} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🛡️</span>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{y.Ad} {y.Soyad}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">{y.Email}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
