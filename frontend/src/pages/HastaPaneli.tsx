import { useState, useEffect } from 'react'
import { api } from '../api'
import Navbar from '../components/Navbar'
import IstatistikKart from '../components/IstatistikKart'
import DurumBadge from '../components/DurumBadge'

const tumSaatler = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00']

function tarihFormatla(tarih: string): string {
  const [yil, ay, gun] = tarih.split('-')
  const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
  return `${gun} ${aylar[parseInt(ay) - 1]} ${yil}`
}

interface Doktor { DoktorID: number; Ad: string; UzmanlikAdi: string }
interface Randevu { RandevuID: number; DoktorAdi: string; UzmanlikAdi: string; RandevuTarihi: string; RandevuSaati: string; Durum: string }

export default function HastaPaneli() {
  const [doktorlar, setDoktorlar] = useState<Doktor[]>([])
  const [randevular, setRandevular] = useState<Randevu[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)

  const [uzmanlik, setUzmanlik] = useState('')
  const [doktorId, setDoktorId] = useState('')
  const [tarih, setTarih] = useState('')
  const [saat, setSaat] = useState('')
  const [notlar, setNotlar] = useState('')
  const [formHata, setFormHata] = useState('')
  const [formBasari, setFormBasari] = useState('')
  const [gonderiyor, setGonderiyor] = useState(false)

  useEffect(() => {
    async function yukle() {
      try {
        const [d, r] = await Promise.all([api.doktorlar(), api.randevularim()])
        setDoktorlar(d)
        setRandevular(r)
      } catch {
        // sessizce geç
      } finally {
        setYukleniyor(false)
      }
    }
    yukle()
  }, [])

  const uzmanliklar = [...new Set(doktorlar.map(d => d.UzmanlikAdi))]
  const filtreliDoktorlar = uzmanlik ? doktorlar.filter(d => d.UzmanlikAdi === uzmanlik) : doktorlar

  async function handleRandevuAl(e: React.FormEvent) {
    e.preventDefault()
    setFormHata('')
    setFormBasari('')
    setGonderiyor(true)
    try {
      await api.randevuAl(parseInt(doktorId), tarih, saat, notlar || undefined)
      setFormBasari('Randevu başarıyla alındı!')
      setUzmanlik(''); setDoktorId(''); setTarih(''); setSaat(''); setNotlar('')
      const r = await api.randevularim()
      setRandevular(r)
    } catch (err: unknown) {
      setFormHata(err instanceof Error ? err.message : 'Randevu alınamadı')
    } finally {
      setGonderiyor(false)
    }
  }

  async function handleIptal(id: number) {
    try {
      await api.randevuIptal(id)
      setRandevular(prev => prev.map(r => r.RandevuID === id ? { ...r, Durum: 'İptal' } : r))
    } catch {
      // sessizce geç
    }
  }

  const yaklaşan = randevular.filter(r => r.Durum === 'Beklemede' || r.Durum === 'Onaylandı').length
  const tamamlanan = randevular.filter(r => r.Durum === 'Tamamlandı').length
  const iptalEdilen = randevular.filter(r => r.Durum === 'İptal').length

  const inputCls = "border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm w-full"

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">

      <Navbar kullaniciIcon="👤" />

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-8">Hasta Paneli</h1>

        {/* ÜST KARTLAR */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: '📅', sayi: yaklaşan, etiket: 'Yaklaşan Randevu' },
            { icon: '✅', sayi: tamamlanan, etiket: 'Tamamlanan' },
            { icon: '❌', sayi: iptalEdilen, etiket: 'İptal Edilen' },
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

            {formHata && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg px-3 py-2 text-sm mb-3">
                {formHata}
              </div>
            )}
            {formBasari && (
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-600 dark:text-green-400 rounded-lg px-3 py-2 text-sm mb-3">
                {formBasari}
              </div>
            )}

            <form className="flex flex-col gap-3" onSubmit={handleRandevuAl}>
              <select value={uzmanlik} onChange={e => { setUzmanlik(e.target.value); setDoktorId('') }} className={inputCls}>
                <option value="">Uzmanlık Seçiniz</option>
                {uzmanliklar.map(u => <option key={u} value={u}>{u}</option>)}
              </select>

              <select value={doktorId} onChange={e => setDoktorId(e.target.value)} className={inputCls} disabled={!uzmanlik}>
                <option value="">Doktor Seçiniz</option>
                {filtreliDoktorlar.map(d => <option key={d.DoktorID} value={d.DoktorID}>Dr. {d.Ad}</option>)}
              </select>

              <input
                type="date"
                value={tarih}
                onChange={e => { setTarih(e.target.value); setSaat('') }}
                min={new Date().toISOString().split('T')[0]}
                className={inputCls}
              />

              <select value={saat} onChange={e => setSaat(e.target.value)} disabled={!tarih || !doktorId} className={`${inputCls} disabled:opacity-50`}>
                <option value="">Saat Seçiniz</option>
                {tumSaatler.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <textarea
                placeholder="Notlar (isteğe bağlı)"
                value={notlar}
                onChange={e => setNotlar(e.target.value)}
                rows={2}
                className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              />

              <button
                type="submit"
                disabled={!doktorId || !tarih || !saat || gonderiyor}
                className="bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm mt-1 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {gonderiyor ? 'Alınıyor...' : 'Randevu Al'}
              </button>
            </form>
          </div>

          {/* RANDEVU LİSTESİ */}
          <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">📋 Randevularım</h2>

            {yukleniyor ? (
              <p className="text-gray-400 text-sm">Yükleniyor...</p>
            ) : randevular.length === 0 ? (
              <p className="text-gray-400 text-sm">Henüz randevunuz yok.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {randevular.map((r) => (
                  <div key={r.RandevuID} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600 transition">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">👨‍⚕️</span>
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Dr. {r.DoktorAdi}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">{r.UzmanlikAdi}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:flex-col sm:text-center sm:items-end gap-2">
                      <p className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                        {tarihFormatla(r.RandevuTarihi.split('T')[0])} · {String(r.RandevuSaati).substring(0, 5)}
                      </p>
                      <div className="flex items-center gap-2">
                        <DurumBadge durum={r.Durum} />
                        {r.Durum === 'Beklemede' && (
                          <button
                            onClick={() => handleIptal(r.RandevuID)}
                            className="text-xs text-red-500 hover:text-red-600 font-medium"
                          >
                            İptal
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
