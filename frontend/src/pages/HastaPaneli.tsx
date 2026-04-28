import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import Navbar from '../components/Navbar'
import DurumBadge from '../components/DurumBadge'

const tumSaatler = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00']

function tarihFormatla(tarih: string): string {
  const [yil, ay, gun] = tarih.split('-')
  const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
  return `${gun} ${aylar[parseInt(ay) - 1]} ${yil}`
}

function YildizPuan({ puan, secilen, onSec }: { puan: number; secilen: number; onSec?: (p: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(y => (
        <button
          key={y}
          type="button"
          onClick={() => onSec?.(y)}
          className={`text-2xl transition ${y <= (secilen || puan) ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'} ${onSec ? 'hover:text-amber-300 cursor-pointer' : 'cursor-default'}`}
        >★</button>
      ))}
    </div>
  )
}

interface Doktor {
  DoktorID: number; Ad: string; UzmanlikAdi: string
  Biyografi?: string; FotoUrl?: string; OrtPuan?: number; DegerlendirmeSayisi?: number
}
interface Randevu {
  RandevuID: number; DoktorAdi: string; UzmanlikAdi: string
  RandevuTarihi: string; RandevuSaati: string; Durum: string
  DoktorID?: number; RandevuTipi?: string; VideoOdaID?: string
}
interface TibbiBilgi {
  TibbiBilgiID: number; Tani: string | null; UygulananIslem: string | null
  Recete: string | null; LabNotu: string | null; SonrakiKontrol: string | null
  OlusturmaTarihi: string
}
interface DoktorProfil extends Doktor {
  Telefon?: string
  degerlendirmeler: { Puan: number; Yorum: string | null; OlusturmaTarihi: string; HastaAdi: string }[]
}

export default function HastaPaneli() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [doktorlar, setDoktorlar] = useState<Doktor[]>([])
  const [randevular, setRandevular] = useState<Randevu[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [banBitis, setBanBitis] = useState<string | null>(null)
  const [banSebebi, setBanSebebi] = useState<string | null>(null)

  // Randevu formu
  const [uzmanlik, setUzmanlik] = useState('')
  const [adArama, setAdArama] = useState('')
  const [doktorId, setDoktorId] = useState('')
  const [tarih, setTarih] = useState('')
  const [saat, setSaat] = useState('')
  const [notlar, setNotlar] = useState('')
  const [randevuTipi, setRandevuTipi] = useState<'Hastane' | 'Online'>('Hastane')
  const [formHata, setFormHata] = useState('')
  const [formBasari, setFormBasari] = useState('')
  const [gonderiyor, setGonderiyor] = useState(false)
  const [doluSaatler, setDoluSaatler] = useState<string[]>([])

  // Şifre değiştirme
  const [eskiSifre, setEskiSifre] = useState('')
  const [yeniSifre, setYeniSifre] = useState('')
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState('')
  const [sifreHata, setSifreHata] = useState('')
  const [sifreBasari, setSifreBasari] = useState('')
  const [sifreGonderiyor, setSifreGonderiyor] = useState(false)

  const [aktifSekme, setAktifSekme] = useState<'randevular' | 'gecmis' | 'odemeler'>('randevular')
  const [uzmanliklarDB, setUzmanliklarDB] = useState<string[]>([])

  // Ödemeler
  const [odemeler, setOdemeler] = useState<{
    OdemeID: number; Tutar: number; Durum: string; OdemeYontemi: string
    Notlar: string | null; OdemeTarihi: string | null
    RandevuTarihi: string; RandevuSaati: string; DoktorAdi: string; UzmanlikAdi: string
  }[]>([])
  const [odemeYukleniyor, setOdemeYukleniyor] = useState(false)

  // Tıbbi kayıt modal
  const [tibbiBilgiModal, setTibbiBilgiModal] = useState<{ randevu: Randevu } | null>(null)
  const [tibbiBilgi, setTibbiBilgi] = useState<TibbiBilgi | null>(null)
  const [tibbiBilgiYukleniyor, setTibbiBilgiYukleniyor] = useState(false)

  // Tıbbi geçmiş
  const [gecmisKayitlar, setGecmisKayitlar] = useState<{ randevu: Randevu; kayit: TibbiBilgi | null }[]>([])
  const [gecmisYukleniyor, setGecmisYukleniyor] = useState(false)

  // Kontrol uyarıları
  const [kontrolUyarilari, setKontrolUyarilari] = useState<{ randevuId: number; doktorAdi: string; tarih: string }[]>([])

  // Yeniden planlama modal
  const [yenidenModal, setYenidenModal] = useState<Randevu | null>(null)
  const [yeniTarih, setYeniTarih] = useState('')
  const [yeniSaat, setYeniSaat] = useState('')
  const [yenidenDoluSaatler, setYenidenDoluSaatler] = useState<string[]>([])
  const [yenidenGonderiyor, setYenidenGonderiyor] = useState(false)
  const [yenidenHata, setYenidenHata] = useState('')

  // Değerlendirme modal
  const [degModal, setDegModal] = useState<Randevu | null>(null)
  const [degPuan, setDegPuan] = useState(0)
  const [degYorum, setDegYorum] = useState('')
  const [degGonderiyor, setDegGonderiyor] = useState(false)
  const [degHata, setDegHata] = useState('')
  const [degYapildi, setDegYapildi] = useState<Record<number, boolean>>({})

  // Doktor profil modal
  const [profilModal, setProfilModal] = useState<DoktorProfil | null>(null)
  const [profilYukleniyor, setProfilYukleniyor] = useState(false)

  // Ödeme hatırlatma (randevu sonrası)
  const [odemeHatirlatModal, setOdemeHatirlatModal] = useState(false)
  const [aramaFokus, setAramaFokus] = useState(false)

  const adAramaRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function yukle() {
      try {
        const [d, r, profil, uzmanlikListesi] = await Promise.all([api.doktorlar(), api.randevularim(), api.profilim(), api.uzmanliklar()])
        setDoktorlar(d)
        setRandevular(r)
        setUzmanliklarDB((uzmanlikListesi as { UzmanlikAdi: string }[]).map(u => u.UzmanlikAdi))
        if (profil.BanBitisTarihi && new Date(profil.BanBitisTarihi) > new Date()) {
          setBanBitis(profil.BanBitisTarihi.split('T')[0])
          setBanSebebi(profil.BanSebebi)
        }
        const tamamlananlar = (r as Randevu[]).filter(rv => rv.Durum === 'Tamamlandı')
        const uyarilar: typeof kontrolUyarilari = []
        await Promise.all(tamamlananlar.map(async (rv) => {
          try {
            const kayit: TibbiBilgi | null = await api.tibbiBilgiHasta(rv.RandevuID)
            if (kayit?.SonrakiKontrol) {
              const kalanGun = Math.ceil((new Date(kayit.SonrakiKontrol).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
              if (kalanGun >= 0 && kalanGun <= 7)
                uyarilar.push({ randevuId: rv.RandevuID, doktorAdi: rv.DoktorAdi, tarih: kayit.SonrakiKontrol.split('T')[0] })
            }
          } catch { }
        }))
        setKontrolUyarilari(uyarilar)
        // Değerlendirme yapılmış olanları işaretle
        const yapildi: Record<number, boolean> = {}
        await Promise.all(tamamlananlar.map(async rv => {
          try {
            const d = await api.degerlendirmeGetir(rv.RandevuID)
            if (d) yapildi[rv.RandevuID] = true
          } catch { }
        }))
        setDegYapildi(yapildi)
      } catch { } finally { setYukleniyor(false) }
    }
    yukle()
  }, [])

  useEffect(() => {
    if (aktifSekme !== 'odemeler' || odemeler.length > 0) return
    setOdemeYukleniyor(true)
    api.hastaOdemelerim().then(setOdemeler).catch(() => {}).finally(() => setOdemeYukleniyor(false))
  }, [aktifSekme, odemeler.length])

  useEffect(() => {
    if (aktifSekme !== 'gecmis' || gecmisKayitlar.length > 0) return
    const tamamlananlar = randevular.filter(r => r.Durum === 'Tamamlandı' || r.Durum === 'Gelmedi')
    if (tamamlananlar.length === 0) return
    setGecmisYukleniyor(true)
    Promise.all(
      tamamlananlar.map(async rv => {
        try { return { randevu: rv, kayit: await api.tibbiBilgiHasta(rv.RandevuID) }
        } catch { return { randevu: rv, kayit: null } }
      })
    ).then(setGecmisKayitlar).finally(() => setGecmisYukleniyor(false))
  }, [aktifSekme, randevular, gecmisKayitlar.length])

  useEffect(() => {
    if (!doktorId || !tarih) { setDoluSaatler([]); return }
    api.doluSaatler(parseInt(doktorId), tarih).then(setDoluSaatler).catch(() => setDoluSaatler([]))
  }, [doktorId, tarih])

  // Yeniden planlama dolu saatler
  useEffect(() => {
    if (!yenidenModal || !yeniTarih) { setYenidenDoluSaatler([]); return }
    api.doluSaatler(yenidenModal.DoktorID || 0, yeniTarih).then(setYenidenDoluSaatler).catch(() => setYenidenDoluSaatler([]))
  }, [yenidenModal, yeniTarih])

  // Arama debounce
  useEffect(() => {
    if (adAramaRef.current) clearTimeout(adAramaRef.current)
    adAramaRef.current = setTimeout(() => {
      api.doktorlar(uzmanlik || undefined, adArama || undefined).then(setDoktorlar).catch(() => {})
    }, 300)
  }, [adArama, uzmanlik])

  async function tibbiBilgiAc(randevu: Randevu) {
    setTibbiBilgiModal({ randevu }); setTibbiBilgi(null); setTibbiBilgiYukleniyor(true)
    try { setTibbiBilgi(await api.tibbiBilgiHasta(randevu.RandevuID)) } catch { }
    setTibbiBilgiYukleniyor(false)
  }

  async function doktorProfilAc(doktorId: number) {
    setProfilModal(null); setProfilYukleniyor(true)
    try { setProfilModal(await api.doktorProfil(doktorId)) } catch { }
    setProfilYukleniyor(false)
  }

  const filtreliDoktorlar = doktorlar

  async function handleRandevuAl(e: React.FormEvent) {
    e.preventDefault()
    setFormHata(''); setFormBasari(''); setGonderiyor(true)
    try {
      await api.randevuAl(parseInt(doktorId), tarih, saat, notlar || undefined, randevuTipi)
      setFormBasari('Randevu başarıyla alındı!')
      setUzmanlik(''); setAdArama(''); setDoktorId(''); setTarih(''); setSaat(''); setNotlar(''); setRandevuTipi('Hastane')
      setRandevular(await api.randevularim())
      setOdemeHatirlatModal(true)
    } catch (err: unknown) {
      setFormHata(err instanceof Error ? err.message : 'Randevu alınamadı')
    } finally { setGonderiyor(false) }
  }

  async function handleIptal(id: number) {
    try {
      await api.randevuIptal(id)
      setRandevular(prev => prev.map(r => r.RandevuID === id ? { ...r, Durum: 'İptal' } : r))
    } catch { }
  }

  async function handleYenidenPlanla(e: React.FormEvent) {
    e.preventDefault()
    if (!yenidenModal) return
    setYenidenHata(''); setYenidenGonderiyor(true)
    try {
      await api.randevuYenidenPlanla(yenidenModal.RandevuID, yeniTarih, yeniSaat + ':00')
      setRandevular(prev => prev.map(r => r.RandevuID === yenidenModal.RandevuID
        ? { ...r, RandevuTarihi: yeniTarih, RandevuSaati: yeniSaat + ':00', Durum: 'Beklemede' } : r))
      setYenidenModal(null); setYeniTarih(''); setYeniSaat('')
    } catch (err: unknown) {
      setYenidenHata(err instanceof Error ? err.message : 'Randevu taşınamadı')
    } finally { setYenidenGonderiyor(false) }
  }

  async function handleDegerlendirme(e: React.FormEvent) {
    e.preventDefault()
    if (!degModal || degPuan === 0) return
    setDegHata(''); setDegGonderiyor(true)
    try {
      await api.degerlendirmeGonder(degModal.RandevuID, degPuan, degYorum || undefined)
      setDegYapildi(prev => ({ ...prev, [degModal.RandevuID]: true }))
      setDegModal(null); setDegPuan(0); setDegYorum('')
    } catch (err: unknown) {
      setDegHata(err instanceof Error ? err.message : 'Değerlendirme gönderilemedi')
    } finally { setDegGonderiyor(false) }
  }

  async function handleSifreDegistir(e: React.FormEvent) {
    e.preventDefault()
    setSifreHata(''); setSifreBasari('')
    if (yeniSifre !== yeniSifreTekrar) { setSifreHata('Yeni şifreler eşleşmiyor'); return }
    setSifreGonderiyor(true)
    try {
      await api.sifreDegistir(eskiSifre, yeniSifre)
      setSifreBasari('Şifreniz başarıyla güncellendi')
      setEskiSifre(''); setYeniSifre(''); setYeniSifreTekrar('')
    } catch (err: unknown) {
      setSifreHata(err instanceof Error ? err.message : 'Şifre değiştirilemedi')
    } finally { setSifreGonderiyor(false) }
  }

  const yaklaşan    = randevular.filter(r => r.Durum === 'Beklemede' || r.Durum === 'Onaylandı').length
  const tamamlanan  = randevular.filter(r => r.Durum === 'Tamamlandı').length
  const iptalEdilen = randevular.filter(r => r.Durum === 'İptal').length
  const uzmanliklar = uzmanliklarDB.length > 0 ? uzmanliklarDB : [...new Set(doktorlar.map(d => d.UzmanlikAdi))]

  const inputCls = "border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm w-full"

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Navbar kullaniciIcon="👤" />

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-8">{t('panel.hasta')}</h1>

        {/* BAN UYARISI */}
        {banBitis && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-4 mb-6 flex items-start gap-3">
            <span className="text-2xl shrink-0">🚫</span>
            <div>
              <p className="font-semibold text-red-700 dark:text-red-400 text-sm">{t('ban.title')}</p>
              <p className="text-red-600 dark:text-red-300 text-sm mt-0.5">
                {banSebebi} — <span className="font-medium">{banBitis} {t('ban.until')}</span>
              </p>
              <p className="text-red-500 dark:text-red-400 text-xs mt-1">
                {t('ban.remaining')}: {Math.ceil((new Date(banBitis).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} {t('ban.days')}
              </p>
            </div>
          </div>
        )}

        {/* SONRAKI KONTROL UYARILARI */}
        {kontrolUyarilari.map(u => (
          <div key={u.randevuId} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-4 flex items-start gap-3">
            <span className="text-xl shrink-0">🔔</span>
            <div>
              <p className="font-semibold text-amber-700 dark:text-amber-400 text-sm">{t('reminder.title')}</p>
              <p className="text-amber-600 dark:text-amber-300 text-sm mt-0.5">
                {t('common.dr')} {u.doktorAdi} {t('reminder.appointment')}: <span className="font-medium">{tarihFormatla(u.tarih)}</span>
              </p>
            </div>
          </div>
        ))}

        {/* ÜST KARTLAR */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: '📅', sayi: yaklaşan,    etiket: t('appointment.upcoming'),  sekme: 'randevular' as const },
            { icon: '✅', sayi: tamamlanan,  etiket: t('appointment.completed'), sekme: 'gecmis' as const },
            { icon: '❌', sayi: iptalEdilen, etiket: t('appointment.cancelled'), sekme: 'randevular' as const },
          ].map((k) => (
            <button
              key={k.etiket}
              onClick={() => setAktifSekme(k.sekme)}
              className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm flex items-center gap-4 w-full text-left hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer"
            >
              <span className="text-3xl">{k.icon}</span>
              <div>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{k.sayi}</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{k.etiket}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Sekme butonları */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {([
            { key: 'randevular', label: t('tabs.appointments') },
            { key: 'gecmis',     label: t('tabs.history') },
            { key: 'odemeler',   label: t('tabs.payments') },
          ] as const).map(s => (
            <button key={s.key} onClick={() => setAktifSekme(s.key)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition ${aktifSekme === s.key ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              {s.label}
            </button>
          ))}
        </div>

        {/* ===== RANDEVULAR SEKMESİ ===== */}
        {aktifSekme === 'randevular' && <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* YENİ RANDEVU FORMU */}
          <div className="md:col-span-1 bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('appointment.new')}</h2>

            {formHata && <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg px-3 py-2 text-sm mb-3">{formHata}</div>}
            {formBasari && <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-600 dark:text-green-400 rounded-lg px-3 py-2 text-sm mb-3">{formBasari}</div>}

            <form className="flex flex-col gap-3" onSubmit={handleRandevuAl}>
              {/* Uzmanlık filtresi */}
              <select value={uzmanlik} onChange={e => { setUzmanlik(e.target.value); setDoktorId('') }} className={inputCls}>
                <option value="">{t('appointment.allSpecialties')}</option>
                {uzmanliklar.map(u => <option key={u} value={u}>{u}</option>)}
              </select>

              {/* Ad arama + autocomplete */}
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('appointment.searchDoctor')}
                  value={adArama}
                  onChange={e => { setAdArama(e.target.value); setDoktorId('') }}
                  onFocus={() => setAramaFokus(true)}
                  onBlur={() => setTimeout(() => setAramaFokus(false), 150)}
                  className={inputCls}
                  autoComplete="off"
                />
                {(aramaFokus && filtreliDoktorlar.length > 0) && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filtreliDoktorlar.map(d => (
                      <button
                        key={d.DoktorID}
                        type="button"
                        onMouseDown={() => { setDoktorId(String(d.DoktorID)); setAdArama(d.Ad); setAramaFokus(false) }}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-gray-600 text-sm text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-gray-600 last:border-0"
                      >
                        <span className="font-medium">Dr. {d.Ad}</span>
                        <span className="text-gray-400 dark:text-gray-400 ml-2 text-xs">{d.UzmanlikAdi}</span>
                        {d.OrtPuan ? <span className="ml-1 text-amber-500 text-xs">⭐{d.OrtPuan.toFixed(1)}</span> : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Seçili doktor göster */}
              {doktorId && (
                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 text-sm">
                  <span className="text-blue-700 dark:text-blue-300 font-medium">
                    Dr. {filtreliDoktorlar.find(d => String(d.DoktorID) === doktorId)?.Ad || adArama}
                  </span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => doktorProfilAc(parseInt(doktorId))} className="text-xs text-blue-500 hover:text-blue-600">
                      {t('appointment.viewProfile')}
                    </button>
                    <button type="button" onClick={() => { setDoktorId(''); setAdArama('') }} className="text-xs text-gray-400 hover:text-red-400">✕</button>
                  </div>
                </div>
              )}

              <input
                type="date"
                value={tarih}
                onChange={e => { setTarih(e.target.value); setSaat('') }}
                min={new Date().toISOString().split('T')[0]}
                className={inputCls}
              />

              <select value={saat} onChange={e => setSaat(e.target.value)} disabled={!tarih || !doktorId} className={`${inputCls} disabled:opacity-50`}>
                <option value="">{t('appointment.selectTime')}</option>
                {tumSaatler.map(s => {
                  const dolu = doluSaatler.includes(s)
                  return <option key={s} value={s} disabled={dolu}>{s}{dolu ? ` ${t('appointment.busy')}` : ''}</option>
                })}
              </select>

              <textarea
                placeholder={t('appointment.notes')}
                value={notlar}
                onChange={e => setNotlar(e.target.value)}
                rows={2}
                className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              />

              {/* Randevu tipi */}
              <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 text-sm">
                <button
                  type="button"
                  onClick={() => setRandevuTipi('Hastane')}
                  className={`flex-1 py-2 font-medium transition ${randevuTipi === 'Hastane' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                >
                  🏥 Hastanede
                </button>
                <button
                  type="button"
                  onClick={() => setRandevuTipi('Online')}
                  className={`flex-1 py-2 font-medium transition ${randevuTipi === 'Online' ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                >
                  📹 Online
                </button>
              </div>

              <button
                type="submit"
                disabled={!doktorId || !tarih || !saat || gonderiyor}
                className="bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm mt-1 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {gonderiyor ? t('appointment.booking') : t('appointment.book')}
              </button>
            </form>
          </div>

          {/* RANDEVU LİSTESİ */}
          <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('appointment.myList')}</h2>

            {yukleniyor ? (
              <p className="text-gray-400 text-sm">{t('common.loading')}</p>
            ) : randevular.length === 0 ? (
              <p className="text-gray-400 text-sm">{t('appointment.noAppointments')}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {randevular.map((r) => (
                  <div key={r.RandevuID} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600 transition">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">👨‍⚕️</span>
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{t('common.dr')} {r.DoktorAdi}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">
                          {r.UzmanlikAdi}
                          {r.RandevuTipi === 'Online' && (
                            <span className="ml-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium px-1.5 py-0.5 rounded">
                              📹 Online
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                      <p className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                        {tarihFormatla(r.RandevuTarihi.split('T')[0])} · {String(r.RandevuSaati).substring(0, 5)}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <DurumBadge durum={r.Durum} />
                        {r.RandevuTipi === 'Online' && (r.Durum === 'Beklemede' || r.Durum === 'Onaylandı') && (
                          <button
                            onClick={() => navigate(`/gorusme/${r.RandevuID}`)}
                            className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded font-medium transition"
                          >
                            📹 Katıl
                          </button>
                        )}
                        {(r.Durum === 'Beklemede' || r.Durum === 'Onaylandı') && (
                          <>
                            <button onClick={() => handleIptal(r.RandevuID)} className="text-xs text-red-500 hover:text-red-600 font-medium">{t('appointment.cancel')}</button>
                            <button onClick={() => { setYenidenModal(r); setYeniTarih(''); setYeniSaat(''); setYenidenHata('') }} className="text-xs text-blue-500 hover:text-blue-600 font-medium">{t('appointment.move')}</button>
                          </>
                        )}
                        {(r.Durum === 'Tamamlandı' || r.Durum === 'Onaylandı' || r.Durum === 'Gelmedi') && (
                          <button onClick={() => tibbiBilgiAc(r)} className="text-xs text-purple-500 hover:text-purple-600 font-medium">{t('appointment.record')}</button>
                        )}
                        {r.Durum === 'Tamamlandı' && !degYapildi[r.RandevuID] && (
                          <button onClick={() => { setDegModal(r); setDegPuan(0); setDegYorum(''); setDegHata('') }} className="text-xs text-amber-500 hover:text-amber-600 font-medium">{t('appointment.rate')}</button>
                        )}
                        {r.Durum === 'Tamamlandı' && degYapildi[r.RandevuID] && (
                          <span className="text-xs text-amber-400">{t('appointment.rated')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>}

        {/* ŞİFRE DEĞİŞTİRME */}
        {aktifSekme === 'randevular' && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 max-w-sm">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('password.change')}</h2>
            {sifreHata && <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg px-3 py-2 text-sm mb-3">{sifreHata}</div>}
            {sifreBasari && <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-600 dark:text-green-400 rounded-lg px-3 py-2 text-sm mb-3">{sifreBasari}</div>}
            <form className="flex flex-col gap-3" onSubmit={handleSifreDegistir}>
              <input type="password" placeholder={t('password.current')} value={eskiSifre} onChange={e => setEskiSifre(e.target.value)} className={inputCls} />
              <input type="password" placeholder={t('password.new')} value={yeniSifre} onChange={e => setYeniSifre(e.target.value)} className={inputCls} />
              <input type="password" placeholder={t('password.confirm')} value={yeniSifreTekrar} onChange={e => setYeniSifreTekrar(e.target.value)} className={inputCls} />
              <button type="submit" disabled={!eskiSifre || !yeniSifre || !yeniSifreTekrar || sifreGonderiyor}
                className="bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition">
                {sifreGonderiyor ? t('password.submitting') : t('password.submit')}
              </button>
            </form>
          </div>
        )}

        {/* ===== TIBBİ GEÇMİŞ SEKMESİ ===== */}
        {aktifSekme === 'gecmis' && (
          <div className="space-y-4">
            {gecmisYukleniyor ? (
              <p className="text-gray-400 text-sm text-center py-10">{t('common.loading')}</p>
            ) : gecmisKayitlar.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
                <p className="text-4xl mb-3">🗂️</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{t('history.empty')}</p>
              </div>
            ) : (
              gecmisKayitlar.map(({ randevu, kayit }) => (
                <div key={randevu.RandevuID} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">👨‍⚕️</span>
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{t('common.dr')} {randevu.DoktorAdi}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">{randevu.UzmanlikAdi}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{tarihFormatla(randevu.RandevuTarihi.split('T')[0])}</p>
                      <p className="text-xs text-gray-400">{String(randevu.RandevuSaati).substring(0, 5)}</p>
                    </div>
                  </div>
                  {!kayit ? (
                    <p className="text-gray-400 text-sm italic">{t('history.noRecord')}</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { label: `🔬 ${t('medical.diagnosis')}`,   deger: kayit.Tani },
                        { label: `💊 ${t('medical.prescription')}`, deger: kayit.Recete },
                        { label: `🩺 ${t('medical.procedure')}`,    deger: kayit.UygulananIslem },
                        { label: `🧪 ${t('medical.lab')}`,          deger: kayit.LabNotu },
                        { label: `📅 ${t('medical.nextControl')}`,  deger: kayit.SonrakiKontrol ? tarihFormatla(kayit.SonrakiKontrol.split('T')[0]) : null },
                      ].filter(f => f.deger).map(f => (
                        <div key={f.label} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl px-4 py-3">
                          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">{f.label}</p>
                          <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{f.deger}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {randevu.Durum === 'Tamamlandı' && !degYapildi[randevu.RandevuID] && (
                    <button
                      onClick={() => { setDegModal(randevu); setDegPuan(0); setDegYorum(''); setDegHata('') }}
                      className="mt-4 text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                    >⭐ {t('history.evaluate')}</button>
                  )}
                  {degYapildi[randevu.RandevuID] && (
                    <p className="mt-3 text-xs text-amber-500">⭐ Değerlendirme yapıldı</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ===== ÖDEMELER SEKMESİ ===== */}
        {aktifSekme === 'odemeler' && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 flex items-start gap-3">
              <span className="text-xl shrink-0">💡</span>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                {t('payment.infoNote')}
              </p>
            </div>
            {odemeYukleniyor ? (
              <p className="text-gray-400 text-sm text-center py-10">{t('common.loading')}</p>
            ) : odemeler.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
                <p className="text-4xl mb-3">💳</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{t('payment.noPayments')}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: t('payment.totalPaid'), deger: `₺${odemeler.filter(o => o.Durum === 'Ödendi').reduce((s, o) => s + o.Tutar, 0).toLocaleString('tr-TR')}`, renk: 'text-green-600' },
                    { label: t('payment.pending'), deger: `₺${odemeler.filter(o => o.Durum === 'Bekliyor').reduce((s, o) => s + o.Tutar, 0).toLocaleString('tr-TR')}`, renk: 'text-amber-500' },
                    { label: t('payment.transactions'), deger: odemeler.length, renk: 'text-blue-600' },
                  ].map(k => (
                    <div key={k.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 text-center">
                      <p className={`text-xl font-bold ${k.renk}`}>{k.deger}</p>
                      <p className="text-gray-400 text-xs mt-1">{k.label}</p>
                    </div>
                  ))}
                </div>
                {odemeler.map(o => {
                  const durumRenk = o.Durum === 'Ödendi' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : o.Durum === 'Bekliyor' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  return (
                    <div key={o.OdemeID} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{t('common.dr')} {o.DoktorAdi}</p>
                          <p className="text-gray-400 text-xs">{o.UzmanlikAdi}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${durumRenk}`}>{o.Durum}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div><span className="text-gray-400 text-xs">{t('payment.appointmentDate')}</span><p className="text-gray-700 dark:text-gray-200">{tarihFormatla(o.RandevuTarihi.split('T')[0])} · {String(o.RandevuSaati).substring(0, 5)}</p></div>
                        <div><span className="text-gray-400 text-xs">{t('payment.method')}</span><p className="text-gray-700 dark:text-gray-200">{o.OdemeYontemi}</p></div>
                        <div><span className="text-gray-400 text-xs">{t('payment.amount')}</span><p className="text-gray-700 dark:text-gray-200 font-semibold">₺{o.Tutar.toLocaleString('tr-TR')}</p></div>
                        {o.OdemeTarihi && <div><span className="text-gray-400 text-xs">{t('payment.date')}</span><p className="text-gray-700 dark:text-gray-200">{tarihFormatla(o.OdemeTarihi.split('T')[0])}</p></div>}
                      </div>
                      {o.Notlar && <p className="mt-3 text-xs text-gray-400 italic border-t border-gray-100 dark:border-gray-700 pt-2">{o.Notlar}</p>}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* ===== ÖDEME HATIRLATMA MODAL ===== */}
      {odemeHatirlatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setOdemeHatirlatModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">{t('appointment.booked')}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">
              {t('payment.bookedInfo')}
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 mb-5">
              <p className="text-amber-700 dark:text-amber-300 text-sm font-medium">💳 {t('payment.title')}</p>
              <p className="text-amber-600 dark:text-amber-400 text-xs mt-1">
                {t('payment.payInfo')} {t('payment.trackInfo')}
              </p>
            </div>
            <button onClick={() => setOdemeHatirlatModal(false)} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm w-full transition">
              {t('payment.ok')}
            </button>
          </div>
        </div>
      )}

      {/* ===== YENİDEN PLANLAMA MODAL ===== */}
      {yenidenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setYenidenModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('reschedule.title')}</h2>
              <button onClick={() => setYenidenModal(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">{t('common.close')}</button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t('common.dr')} {yenidenModal.DoktorAdi} — {t('reschedule.current')}: {tarihFormatla(yenidenModal.RandevuTarihi.split('T')[0])} · {String(yenidenModal.RandevuSaati).substring(0, 5)}
            </p>
            {yenidenHata && <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg px-3 py-2 text-sm mb-3">{yenidenHata}</div>}
            <form className="flex flex-col gap-3" onSubmit={handleYenidenPlanla}>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('reschedule.newDate')}</label>
                <input type="date" value={yeniTarih} onChange={e => { setYeniTarih(e.target.value); setYeniSaat('') }} min={new Date().toISOString().split('T')[0]} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('reschedule.newTime')}</label>
                <select value={yeniSaat} onChange={e => setYeniSaat(e.target.value)} disabled={!yeniTarih} className={`${inputCls} disabled:opacity-50`}>
                  <option value="">{t('appointment.selectTime')}</option>
                  {tumSaatler.map(s => {
                    const dolu = yenidenDoluSaatler.includes(s)
                    return <option key={s} value={s} disabled={dolu}>{s}{dolu ? ` ${t('appointment.busy')}` : ''}</option>
                  })}
                </select>
              </div>
              <button type="submit" disabled={!yeniTarih || !yeniSaat || yenidenGonderiyor}
                className="bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition mt-1">
                {yenidenGonderiyor ? t('reschedule.submitting') : t('reschedule.submit')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== DEĞERLENDİRME MODAL ===== */}
      {degModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setDegModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('rating.title')}</h2>
              <button onClick={() => setDegModal(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">{t('common.close')}</button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('common.dr')} {degModal.DoktorAdi} {t('rating.for')}</p>
            {degHata && <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg px-3 py-2 text-sm mb-3">{degHata}</div>}
            <form className="flex flex-col gap-4" onSubmit={handleDegerlendirme}>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">{t('rating.score')}</label>
                <YildizPuan puan={0} secilen={degPuan} onSec={setDegPuan} />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('rating.comment')}</label>
                <textarea
                  value={degYorum}
                  onChange={e => setDegYorum(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder={t('rating.commentPlaceholder')}
                  className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none w-full"
                />
                <p className="text-xs text-gray-400 text-right mt-1">{degYorum.length}/500</p>
              </div>
              <button type="submit" disabled={degPuan === 0 || degGonderiyor}
                className="bg-amber-500 text-white py-2.5 rounded-lg hover:bg-amber-600 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition">
                {degGonderiyor ? t('rating.submitting') : t('rating.submit')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== DOKTOR PROFİL MODAL ===== */}
      {(profilYukleniyor || profilModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => { setProfilModal(null); }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            {profilYukleniyor ? (
              <p className="text-gray-400 text-center py-8">{t('common.loading')}</p>
            ) : profilModal ? (
              <>
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-2xl shrink-0">
                      {profilModal.FotoUrl ? <img src={profilModal.FotoUrl} alt="" className="w-14 h-14 rounded-full object-cover" /> : '👨‍⚕️'}
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-800 dark:text-gray-100">{t('common.dr')} {profilModal.Ad}</h2>
                      <p className="text-sm text-blue-600 dark:text-blue-400">{profilModal.UzmanlikAdi}</p>
                      {profilModal.OrtPuan && profilModal.OrtPuan > 0 ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <YildizPuan puan={Math.round(profilModal.OrtPuan)} secilen={Math.round(profilModal.OrtPuan)} />
                          <span className="text-xs text-gray-500 dark:text-gray-400">({profilModal.DegerlendirmeSayisi} {t('doctorProfile.reviewCount')})</span>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">{t('doctorProfile.noReviews')}</p>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setProfilModal(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl shrink-0">{t('common.close')}</button>
                </div>

                {profilModal.Biyografi && (
                  <div className="mb-5">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">{t('doctorProfile.about')}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{profilModal.Biyografi}</p>
                  </div>
                )}

                {profilModal.Telefon && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">📞 {profilModal.Telefon}</p>
                )}

                {profilModal.degerlendirmeler.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-3">{t('doctorProfile.reviews')}</p>
                    <div className="flex flex-col gap-3">
                      {profilModal.degerlendirmeler.map((d, i) => (
                        <div key={i} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl px-4 py-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{d.HastaAdi}</span>
                            <YildizPuan puan={d.Puan} secilen={d.Puan} />
                          </div>
                          {d.Yorum && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{d.Yorum}</p>}
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{tarihFormatla(d.OlusturmaTarihi.split('T')[0])}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* ===== TIBBİ KAYIT MODAL ===== */}
      {tibbiBilgiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setTibbiBilgiModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('appointment.record')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('common.dr')} {tibbiBilgiModal.randevu.DoktorAdi} · {tarihFormatla(tibbiBilgiModal.randevu.RandevuTarihi.split('T')[0])}
                </p>
              </div>
              <button onClick={() => setTibbiBilgiModal(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">{t('common.close')}</button>
            </div>
            {tibbiBilgiYukleniyor ? (
              <p className="text-gray-400 text-sm text-center py-6">{t('common.loading')}</p>
            ) : !tibbiBilgi ? (
              <p className="text-gray-400 text-sm text-center py-6">{t('medical.noRecord')}</p>
            ) : (
              <div className="flex flex-col gap-4">
                {[
                  { label: t('medical.diagnosis'),   deger: tibbiBilgi.Tani },
                  { label: t('medical.procedure'),   deger: tibbiBilgi.UygulananIslem },
                  { label: t('medical.prescription'), deger: tibbiBilgi.Recete },
                  { label: t('medical.lab'),         deger: tibbiBilgi.LabNotu },
                  { label: t('medical.nextControl'), deger: tibbiBilgi.SonrakiKontrol ? tarihFormatla(tibbiBilgi.SonrakiKontrol.split('T')[0]) : null },
                ].map(({ label, deger }) => deger ? (
                  <div key={label}>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">{label}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2 whitespace-pre-wrap">{deger}</p>
                  </div>
                ) : null)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
