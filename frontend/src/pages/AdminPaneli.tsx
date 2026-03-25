import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useTheme } from '../ThemeContext'

const hastaDetaylari: Record<string, { telefon: string; email: string; dogumTarihi: string; cinsiyet: string; tcKimlik: string }> = {
  'Ali Veli':    { telefon: '0532 111 22 33', email: 'ali@email.com',   dogumTarihi: '1985-03-12', cinsiyet: 'Erkek', tcKimlik: '123********' },
  'Ayse Yildiz': { telefon: '0541 222 33 44', email: 'ayse@email.com',  dogumTarihi: '1992-07-24', cinsiyet: 'Kadin', tcKimlik: '456********' },
  'Mehmet Kaya': { telefon: '0555 333 44 55', email: 'mehmet@email.com',dogumTarihi: '1978-11-05', cinsiyet: 'Erkek', tcKimlik: '789********' },
  'Fatma Demir': { telefon: '0506 444 55 66', email: 'fatma@email.com', dogumTarihi: '1995-01-30', cinsiyet: 'Kadin', tcKimlik: '321********' },
}

const baslangicRandevular = [
  { id: 1, hasta: 'Ali Veli',    doktor: 'Dr. Kubra Kalan',    uzmanlik: 'Kardiyoloji', tarih: '2026-04-01', saat: '09:00', durum: 'Onaylandi' },
  { id: 2, hasta: 'Ayse Yildiz', doktor: 'Dr. Beyza Nur Cift', uzmanlik: 'Ortopedi',    tarih: '2026-04-01', saat: '10:00', durum: 'Beklemede' },
  { id: 3, hasta: 'Mehmet Kaya', doktor: 'Dr. Doga Guler',     uzmanlik: 'Psikiyatri',  tarih: '2026-04-02', saat: '11:00', durum: 'Beklemede' },
  { id: 4, hasta: 'Fatma Demir', doktor: 'Dr. Kubra Kalan',    uzmanlik: 'Kardiyoloji', tarih: '2026-03-20', saat: '14:00', durum: 'Tamamlandi' },
]

const baslangicDoktorlar = [
  { id: 1, ad: 'Kubra',    soyad: 'Kalan',    email: 'kubra.kalan@hastane.com',    uzmanlik: 'Kardiyoloji', telefon: '0532 111 11 11' },
  { id: 2, ad: 'Beyza Nur',soyad: 'Cift',     email: 'beyza.cift@hastane.com',     uzmanlik: 'Ortopedi',    telefon: '0541 222 22 22' },
  { id: 3, ad: 'Doga',     soyad: 'Guler',    email: 'doga.guler@hastane.com',     uzmanlik: 'Psikiyatri',  telefon: '0555 333 33 33' },
]

const baslangicYoneticiler = [
  { id: 1, ad: 'Sistem', soyad: 'Yoneticisi', email: 'admin@hastane.com' },
]

const durumRenk: Record<string, string> = {
  'Onaylandi':  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'Beklemede':  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  'Tamamlandi': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  'Iptal':      'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const bos = { ad: '', soyad: '', email: '', sifre: '', uzmanlik: '', telefon: '' }
const bosYonetici = { ad: '', soyad: '', email: '', sifre: '' }

export default function AdminPaneli() {
  const { theme, toggle } = useTheme()
  const [randevular,    setRandevular]    = useState(baslangicRandevular)
  const [doktorlar,     setDoktorlar]     = useState(baslangicDoktorlar)
  const [yoneticiler,   setYoneticiler]   = useState(baslangicYoneticiler)
  const [aramaMetni,    setAramaMetni]    = useState('')
  const [durumFiltre,   setDurumFiltre]   = useState('Tumu')
  const [aktifSekme,    setAktifSekme]    = useState<'randevular' | 'doktorlar' | 'yoneticiler'>('randevular')
  const [secilenHasta,  setSecilenHasta]  = useState<string | null>(null)
  const [doktorFormu,   setDoktorFormu]   = useState(false)
  const [yoneticiFormu, setYoneticiFormu] = useState(false)
  const [yeniDoktor,    setYeniDoktor]    = useState(bos)
  const [yeniYonetici,  setYeniYonetici]  = useState(bosYonetici)

  const randevuGuncelle = (id: number, yeniDurum: string) => {
    setRandevular(randevular.map(r => r.id === id ? { ...r, durum: yeniDurum } : r))
  }

  const randevuSil = (id: number) => {
    setRandevular(randevular.filter(r => r.id !== id))
  }

  const doktorSil = (id: number) => {
    setDoktorlar(doktorlar.filter(d => d.id !== id))
  }

  const doktorEkle = () => {
    if (!yeniDoktor.ad || !yeniDoktor.soyad || !yeniDoktor.email || !yeniDoktor.sifre || !yeniDoktor.uzmanlik) return
    setDoktorlar([...doktorlar, { id: Date.now(), ...yeniDoktor }])
    setYeniDoktor(bos)
    setDoktorFormu(false)
  }

  const yoneticiSil = (id: number) => {
    if (yoneticiler.length === 1) return
    setYoneticiler(yoneticiler.filter(y => y.id !== id))
  }

  const yoneticiEkle = () => {
    if (!yeniYonetici.ad || !yeniYonetici.soyad || !yeniYonetici.email || !yeniYonetici.sifre) return
    setYoneticiler([...yoneticiler, { id: Date.now(), ad: yeniYonetici.ad, soyad: yeniYonetici.soyad, email: yeniYonetici.email }])
    setYeniYonetici(bosYonetici)
    setYoneticiFormu(false)
  }

  const filtreliRandevular = randevular.filter(r => {
    const aramaUygun = r.hasta.toLowerCase().includes(aramaMetni.toLowerCase()) ||
                       r.doktor.toLowerCase().includes(aramaMetni.toLowerCase())
    const durumUygun = durumFiltre === 'Tumu' || r.durum === durumFiltre
    return aramaUygun && durumUygun
  })

  const inputCls = "w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">

      {/* HASTA BİLGİ MODALI */}
      {secilenHasta && hastaDetaylari[secilenHasta] && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Hasta Bilgileri</h3>
              <button onClick={() => setSecilenHasta(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
            </div>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-4xl">👤</span>
              <div>
                <p className="font-bold text-gray-800 dark:text-gray-100">{secilenHasta}</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Hasta</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { etiket: 'TC Kimlik',    deger: hastaDetaylari[secilenHasta].tcKimlik },
                { etiket: 'Dogum Tarihi', deger: hastaDetaylari[secilenHasta].dogumTarihi },
                { etiket: 'Cinsiyet',     deger: hastaDetaylari[secilenHasta].cinsiyet },
                { etiket: 'Telefon',      deger: hastaDetaylari[secilenHasta].telefon },
                { etiket: 'E-posta',      deger: hastaDetaylari[secilenHasta].email },
              ].map(({ etiket, deger }) => (
                <div key={etiket} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400 text-sm">{etiket}</span>
                  <span className="text-gray-800 dark:text-gray-200 text-sm font-medium">{deger}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setSecilenHasta(null)}
              className="mt-5 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm px-4 sm:px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">🏥</span>
          <span className="text-xl font-bold text-blue-700 dark:text-blue-400">MediRandevu</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-gray-600 dark:text-gray-300 font-medium text-sm hidden sm:block">Admin</span>
          <button
            onClick={toggle}
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-lg"
            title={theme === 'dark' ? 'Aydınlık mod' : 'Karanlık mod'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <Link to="/" className="text-red-500 hover:text-red-600 text-sm font-medium">Cikis Yap</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-8">Admin Paneli</h1>

        {/* UST KARTLAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: '👥',    sayi: '24',                                                          etiket: 'Toplam Hasta'  },
            { icon: '👨‍⚕️', sayi: String(doktorlar.length),                                     etiket: 'Toplam Doktor' },
            { icon: '📅',    sayi: String(randevular.length),                                     etiket: 'Toplam Randevu'},
            { icon: '⏳',    sayi: String(randevular.filter(r => r.durum === 'Beklemede').length), etiket: 'Bekleyen'      },
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

        {/* SEKMELER */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {(['randevular', 'doktorlar', 'yoneticiler'] as const).map((sekme) => (
            <button
              key={sekme}
              onClick={() => setAktifSekme(sekme)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition whitespace-nowrap ${
                aktifSekme === sekme
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {sekme === 'randevular' ? 'Randevular' : sekme === 'doktorlar' ? 'Doktorlar' : 'Yoneticiler'}
            </button>
          ))}
        </div>

        {/* RANDEVULAR */}
        {aktifSekme === 'randevular' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <input
                type="text"
                placeholder="Hasta veya doktor ara..."
                value={aramaMetni}
                onChange={e => setAramaMetni(e.target.value)}
                className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 flex-1 placeholder-gray-400 dark:placeholder-gray-500"
              />
              <select
                value={durumFiltre}
                onChange={e => setDurumFiltre(e.target.value)}
                className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="Tumu">Tumu</option>
                <option value="Beklemede">Beklemede</option>
                <option value="Onaylandi">Onaylandi</option>
                <option value="Tamamlandi">Tamamlandi</option>
                <option value="Iptal">Iptal</option>
              </select>
            </div>

            <div className="flex flex-col gap-3">
              {filtreliRandevular.length === 0 && (
                <p className="text-center text-gray-400 dark:text-gray-500 py-8">Randevu bulunamadi.</p>
              )}
              {filtreliRandevular.map((r) => (
                <div key={r.id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600 transition">
                  {/* Üst satır: hasta + durum */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">👤</span>
                      <div className="min-w-0">
                        <button
                          onClick={() => setSecilenHasta(r.hasta)}
                          className="font-semibold text-blue-600 dark:text-blue-400 hover:underline text-sm text-left"
                        >
                          {r.hasta}
                        </button>
                        <p className="text-gray-500 dark:text-gray-400 text-xs truncate">{r.doktor} · {r.uzmanlik}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${durumRenk[r.durum]}`}>
                      {r.durum}
                    </span>
                  </div>
                  {/* Alt satır: tarih + butonlar */}
                  <div className="flex items-center justify-between pl-9">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">{r.tarih} · {r.saat}</p>
                    <div className="flex gap-2 flex-wrap">
                      {r.durum === 'Beklemede' && (
                        <button
                          onClick={() => randevuGuncelle(r.id, 'Onaylandi')}
                          className="text-xs bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition"
                        >
                          Onayla
                        </button>
                      )}
                      {(r.durum === 'Beklemede' || r.durum === 'Onaylandi') && (
                        <button
                          onClick={() => randevuGuncelle(r.id, 'Iptal')}
                          className="text-xs bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 px-3 py-1 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition"
                        >
                          Iptal Et
                        </button>
                      )}
                      {r.durum === 'Iptal' && (
                        <button
                          onClick={() => randevuSil(r.id)}
                          className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 border border-gray-200 dark:border-gray-600 px-3 py-1 rounded-lg transition"
                        >
                          Sil
                        </button>
                      )}
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
              <button
                onClick={() => { setDoktorFormu(!doktorFormu); setYeniDoktor(bos) }}
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                + Yeni Doktor Ekle
              </button>
            </div>

            {doktorFormu && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Ad</label>
                    <input type="text" placeholder="Adı" value={yeniDoktor.ad} onChange={e => setYeniDoktor({ ...yeniDoktor, ad: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Soyad</label>
                    <input type="text" placeholder="Soyadı" value={yeniDoktor.soyad} onChange={e => setYeniDoktor({ ...yeniDoktor, soyad: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">E-posta</label>
                    <input type="email" placeholder="doktor@hastane.com" value={yeniDoktor.email} onChange={e => setYeniDoktor({ ...yeniDoktor, email: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Gecici Sifre</label>
                    <input type="password" placeholder="••••••••" value={yeniDoktor.sifre} onChange={e => setYeniDoktor({ ...yeniDoktor, sifre: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Uzmanlik</label>
                    <select value={yeniDoktor.uzmanlik} onChange={e => setYeniDoktor({ ...yeniDoktor, uzmanlik: e.target.value })} className={inputCls}>
                      <option value="">Seciniz</option>
                      <option>Kardiyoloji</option>
                      <option>Ortopedi</option>
                      <option>Noroloji</option>
                      <option>Psikiyatri</option>
                      <option>Goz Hastaliklari</option>
                      <option>Dahiliye</option>
                      <option>Cocuk Sagligi</option>
                      <option>Dermatoloji</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Telefon (opsiyonel)</label>
                    <input type="tel" placeholder="05XX XXX XX XX" value={yeniDoktor.telefon} onChange={e => setYeniDoktor({ ...yeniDoktor, telefon: e.target.value })} className={inputCls} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={doktorEkle} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition">Ekle</button>
                  <button onClick={() => { setDoktorFormu(false); setYeniDoktor(bos) }} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 px-4 py-2 text-sm">Vazgec</button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {doktorlar.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">👨‍⚕️</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Dr. {d.ad} {d.soyad}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs truncate">{d.uzmanlik} · {d.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => doktorSil(d.id)}
                    className="text-xs bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition shrink-0"
                  >
                    Kaldir
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* YONETİCİLER */}
        {aktifSekme === 'yoneticiler' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Yonetici Listesi</h2>
              <button
                onClick={() => { setYoneticiFormu(!yoneticiFormu); setYeniYonetici(bosYonetici) }}
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                + Yeni Yonetici Ekle
              </button>
            </div>

            {yoneticiFormu && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Ad</label>
                    <input type="text" placeholder="Adı" value={yeniYonetici.ad} onChange={e => setYeniYonetici({ ...yeniYonetici, ad: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Soyad</label>
                    <input type="text" placeholder="Soyadı" value={yeniYonetici.soyad} onChange={e => setYeniYonetici({ ...yeniYonetici, soyad: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">E-posta</label>
                    <input type="email" placeholder="yonetici@hastane.com" value={yeniYonetici.email} onChange={e => setYeniYonetici({ ...yeniYonetici, email: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Gecici Sifre</label>
                    <input type="password" placeholder="••••••••" value={yeniYonetici.sifre} onChange={e => setYeniYonetici({ ...yeniYonetici, sifre: e.target.value })} className={inputCls} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={yoneticiEkle} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition">Ekle</button>
                  <button onClick={() => { setYoneticiFormu(false); setYeniYonetici(bosYonetici) }} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 px-4 py-2 text-sm">Vazgec</button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {yoneticiler.map((y) => (
                <div key={y.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600 transition">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🛡️</span>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{y.ad} {y.soyad}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">{y.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => yoneticiSil(y.id)}
                    disabled={yoneticiler.length === 1}
                    className="text-xs bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    Kaldir
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
