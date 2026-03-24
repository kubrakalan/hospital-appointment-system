import { Link } from 'react-router-dom'
import { useState } from 'react'

const hastaDetaylari: Record<string, { telefon: string; email: string; dogumTarihi: string; cinsiyet: string; tcKimlik: string }> = {
  'Ali Veli':    { telefon: '0532 111 22 33', email: 'ali@email.com',   dogumTarihi: '1985-03-12', cinsiyet: 'Erkek', tcKimlik: '123********' },
  'Ayse Yildiz': { telefon: '0541 222 33 44', email: 'ayse@email.com',  dogumTarihi: '1992-07-24', cinsiyet: 'Kadin', tcKimlik: '456********' },
  'Mehmet Kaya': { telefon: '0555 333 44 55', email: 'mehmet@email.com',dogumTarihi: '1978-11-05', cinsiyet: 'Erkek', tcKimlik: '789********' },
  'Fatma Demir': { telefon: '0506 444 55 66', email: 'fatma@email.com', dogumTarihi: '1995-01-30', cinsiyet: 'Kadin', tcKimlik: '321********' },
}

const baslangicRandevular = [
  { id: 1, hasta: 'Ali Veli', doktor: 'Dr. Kubra Kalan', uzmanlik: 'Kardiyoloji', tarih: '2026-04-01', saat: '09:00', durum: 'Onaylandi' },
  { id: 2, hasta: 'Ayse Yildiz', doktor: 'Dr. Beyza Nur Cift', uzmanlik: 'Ortopedi', tarih: '2026-04-01', saat: '10:00', durum: 'Beklemede' },
  { id: 3, hasta: 'Mehmet Kaya', doktor: 'Dr. Doga Guler', uzmanlik: 'Psikiyatri', tarih: '2026-04-02', saat: '11:00', durum: 'Beklemede' },
  { id: 4, hasta: 'Fatma Demir', doktor: 'Dr. Kubra Kalan', uzmanlik: 'Kardiyoloji', tarih: '2026-03-20', saat: '14:00', durum: 'Tamamlandi' },
]

const baslangicDoktorlar = [
  { id: 1, ad: 'Dr. Kubra Kalan', uzmanlik: 'Kardiyoloji' },
  { id: 2, ad: 'Dr. Beyza Nur Cift', uzmanlik: 'Ortopedi' },
  { id: 3, ad: 'Dr. Doga Guler', uzmanlik: 'Psikiyatri' },
]

const durumRenk: Record<string, string> = {
  'Onaylandi': 'bg-green-100 text-green-700',
  'Beklemede': 'bg-yellow-100 text-yellow-700',
  'Tamamlandi': 'bg-gray-100 text-gray-600',
  'Iptal': 'bg-red-100 text-red-700',
}

const durumEtiket: Record<string, string> = {
  'Onaylandi': 'Onaylandi',
  'Beklemede': 'Beklemede',
  'Tamamlandi': 'Tamamlandi',
  'Iptal': 'Iptal',
}

export default function AdminPaneli() {
  const [randevular, setRandevular] = useState(baslangicRandevular)
  const [doktorlar, setDoktorlar] = useState(baslangicDoktorlar)
  const [aramaMetni, setAramaMetni] = useState('')
  const [durumFiltre, setDurumFiltre] = useState('Tumu')
  const [aktifSekme, setAktifSekme] = useState<'randevular' | 'doktorlar'>('randevular')
  const [secilenHasta, setSecilenHasta] = useState<string | null>(null)
  const [yeniDoktor, setYeniDoktor] = useState({ ad: '', uzmanlik: '' })
  const [doktorFormu, setDoktorFormu] = useState(false)

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
    if (!yeniDoktor.ad || !yeniDoktor.uzmanlik) return
    setDoktorlar([...doktorlar, { id: Date.now(), ...yeniDoktor }])
    setYeniDoktor({ ad: '', uzmanlik: '' })
    setDoktorFormu(false)
  }

  const filtreliRandevular = randevular.filter(r => {
    const aramaUygun = r.hasta.toLowerCase().includes(aramaMetni.toLowerCase()) ||
                       r.doktor.toLowerCase().includes(aramaMetni.toLowerCase())
    const durumUygun = durumFiltre === 'Tumu' || r.durum === durumFiltre
    return aramaUygun && durumUygun
  })

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HASTA BİLGİ MODALI */}
      {secilenHasta && hastaDetaylari[secilenHasta] && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Hasta Bilgileri</h3>
              <button onClick={() => setSecilenHasta(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-4xl">👤</span>
              <div>
                <p className="font-bold text-gray-800">{secilenHasta}</p>
                <p className="text-gray-500 text-sm">Hasta</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { etiket: 'TC Kimlik', deger: hastaDetaylari[secilenHasta].tcKimlik },
                { etiket: 'Dogum Tarihi', deger: hastaDetaylari[secilenHasta].dogumTarihi },
                { etiket: 'Cinsiyet', deger: hastaDetaylari[secilenHasta].cinsiyet },
                { etiket: 'Telefon', deger: hastaDetaylari[secilenHasta].telefon },
                { etiket: 'E-posta', deger: hastaDetaylari[secilenHasta].email },
              ].map(({ etiket, deger }) => (
                <div key={etiket} className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500 text-sm">{etiket}</span>
                  <span className="text-gray-800 text-sm font-medium">{deger}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setSecilenHasta(null)}
              className="mt-5 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <nav className="bg-white shadow-sm px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🏥</span>
          <span className="text-xl font-bold text-blue-700">MediRandevu</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-gray-600 font-medium">Admin</span>
          <Link to="/" className="text-red-500 hover:text-red-600 text-sm font-medium">Cikis Yap</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-8 py-10">
        <h1 className="text-2xl font-bold text-gray-800 mb-8">Admin Paneli</h1>

        {/* UST KARTLAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: '👥', sayi: '24', etiket: 'Toplam Hasta' },
            { icon: '👨‍⚕️', sayi: String(doktorlar.length), etiket: 'Toplam Doktor' },
            { icon: '📅', sayi: String(randevular.length), etiket: 'Toplam Randevu' },
            { icon: '⏳', sayi: String(randevular.filter(r => r.durum === 'Beklemede').length), etiket: 'Bekleyen' },
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

        {/* SEKMELER */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setAktifSekme('randevular')}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition ${aktifSekme === 'randevular' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            Randevular
          </button>
          <button
            onClick={() => setAktifSekme('doktorlar')}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition ${aktifSekme === 'doktorlar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            Doktorlar
          </button>
        </div>

        {/* RANDEVULAR */}
        {aktifSekme === 'randevular' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <input
                type="text"
                placeholder="Hasta veya doktor ara..."
                value={aramaMetni}
                onChange={e => setAramaMetni(e.target.value)}
                className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 flex-1"
              />
              <select
                value={durumFiltre}
                onChange={e => setDurumFiltre(e.target.value)}
                className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
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
                <p className="text-center text-gray-400 py-8">Randevu bulunamadi.</p>
              )}
              {filtreliRandevular.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-blue-200 transition">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">👤</span>
                    <div>
                      <button
                        onClick={() => setSecilenHasta(r.hasta)}
                        className="font-semibold text-blue-600 hover:underline text-sm text-left"
                      >
                        {r.hasta}
                      </button>
                      <p className="text-gray-500 text-xs">{r.doktor} · {r.uzmanlik}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-700 text-sm">{r.tarih}</p>
                    <p className="text-gray-500 text-xs">{r.saat}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${durumRenk[r.durum]}`}>
                      {durumEtiket[r.durum]}
                    </span>
                    {r.durum === 'Beklemede' && (
                      <button
                        onClick={() => randevuGuncelle(r.id, 'Onaylandi')}
                        className="text-xs bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600"
                      >
                        Onayla
                      </button>
                    )}
                    {(r.durum === 'Beklemede' || r.durum === 'Onaylandi') && (
                      <button
                        onClick={() => randevuGuncelle(r.id, 'Iptal')}
                        className="text-xs bg-red-100 text-red-500 px-3 py-1 rounded-lg hover:bg-red-200"
                      >
                        Iptal Et
                      </button>
                    )}
                    {r.durum === 'Iptal' && (
                      <button
                        onClick={() => randevuSil(r.id)}
                        className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 px-3 py-1 rounded-lg"
                      >
                        Sil
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DOKTORLAR */}
        {aktifSekme === 'doktorlar' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Doktor Listesi</h2>
              <button
                onClick={() => setDoktorFormu(!doktorFormu)}
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                + Yeni Doktor Ekle
              </button>
            </div>

            {doktorFormu && (
              <div className="bg-blue-50 rounded-xl p-4 mb-4 flex gap-3 items-end flex-wrap">
                <div className="flex-1 min-w-40">
                  <label className="text-xs font-medium text-gray-600 block mb-1">Ad Soyad</label>
                  <input
                    type="text"
                    placeholder="Dr. Ad Soyad"
                    value={yeniDoktor.ad}
                    onChange={e => setYeniDoktor({ ...yeniDoktor, ad: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div className="flex-1 min-w-40">
                  <label className="text-xs font-medium text-gray-600 block mb-1">Uzmanlik</label>
                  <select
                    value={yeniDoktor.uzmanlik}
                    onChange={e => setYeniDoktor({ ...yeniDoktor, uzmanlik: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-600"
                  >
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
                <button
                  onClick={doktorEkle}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  Ekle
                </button>
                <button
                  onClick={() => setDoktorFormu(false)}
                  className="text-gray-400 hover:text-gray-600 px-2 py-2 text-sm"
                >
                  Vazgec
                </button>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {doktorlar.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-blue-200 transition">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👨‍⚕️</span>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{d.ad}</p>
                      <p className="text-gray-500 text-xs">{d.uzmanlik}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => doktorSil(d.id)}
                    className="text-xs bg-red-100 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-200"
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
