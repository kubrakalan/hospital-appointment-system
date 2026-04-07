import { useState, useEffect } from 'react'
import { api } from '../api'
import Navbar from '../components/Navbar'
import DurumBadge from '../components/DurumBadge'

const durumRenk: Record<string, string> = {
  'Onaylandı': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'Beklemede': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  'Tamamlandı': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  'İptal': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

interface Randevu {
  RandevuID: number; HastaAdi: string; RandevuTarihi: string
  RandevuSaati: string; Durum: string; Notlar: string | null
}

interface TibbiBilgiForm {
  tani: string; uygulananIslem: string; recete: string
  labNotu: string; doktorNotu: string; sonrakiKontrol: string
}

const bosForm: TibbiBilgiForm = { tani: '', uygulananIslem: '', recete: '', labNotu: '', doktorNotu: '', sonrakiKontrol: '' }

function haftaBaslangici(tarih: Date): Date {
  const d = new Date(tarih)
  const gun = d.getDay()
  const fark = gun === 0 ? -6 : 1 - gun
  d.setDate(d.getDate() + fark)
  d.setHours(0, 0, 0, 0)
  return d
}

function tarihStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

const GUN_ADLARI = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

const inputCls = "border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-full"
const textareaCls = `${inputCls} resize-none`

export default function DoktorPaneli() {
  const [randevular, setRandevular] = useState<Randevu[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [aktifSekme, setAktifSekme] = useState<'liste' | 'takvim'>('liste')
  const [haftaBaslangic, setHaftaBaslangic] = useState(() => haftaBaslangici(new Date()))

  // Tıbbi kayıt modal
  const [durumHata, setDurumHata] = useState('')
  const [modalRandevuId, setModalRandevuId] = useState<number | null>(null)
  const [modalHastaAdi, setModalHastaAdi] = useState('')
  const [form, setForm] = useState<TibbiBilgiForm>(bosForm)
  const [modalYukleniyor, setModalYukleniyor] = useState(false)
  const [modalKaydediyor, setModalKaydediyor] = useState(false)
  const [modalBasari, setModalBasari] = useState('')
  const [modalHata, setModalHata] = useState('')

  useEffect(() => {
    api.doktorRandevular().then(setRandevular).catch(() => {}).finally(() => setYukleniyor(false))
  }, [])

  async function durumGuncelle(id: number, durum: string) {
    setDurumHata('')
    try {
      await api.doktorRandevuDurum(id, durum)
      setRandevular(prev => prev.map(r => r.RandevuID === id ? { ...r, Durum: durum } : r))
    } catch (err: unknown) {
      setDurumHata(err instanceof Error ? err.message : 'İşlem başarısız')
    }
  }

  async function tibbiBilgiAc(randevu: Randevu) {
    setModalRandevuId(randevu.RandevuID)
    setModalHastaAdi(randevu.HastaAdi)
    setForm(bosForm)
    setModalBasari('')
    setModalHata('')
    setModalYukleniyor(true)
    try {
      const kayit = await api.doktorTibbiBilgiGetir(randevu.RandevuID)
      if (kayit) {
        setForm({
          tani:           kayit.Tani           || '',
          uygulananIslem: kayit.UygulananIslem  || '',
          recete:         kayit.Recete          || '',
          labNotu:        kayit.LabNotu         || '',
          doktorNotu:     kayit.DoktorNotu      || '',
          sonrakiKontrol: kayit.SonrakiKontrol ? kayit.SonrakiKontrol.split('T')[0] : '',
        })
      }
    } catch { }
    setModalYukleniyor(false)
  }

  async function tibbiBilgiKaydet() {
    if (!modalRandevuId) return
    setModalKaydediyor(true)
    setModalBasari('')
    setModalHata('')
    try {
      await api.doktorTibbiBilgiKaydet(modalRandevuId, {
        tani:           form.tani           || undefined,
        uygulananIslem: form.uygulananIslem || undefined,
        recete:         form.recete         || undefined,
        labNotu:        form.labNotu        || undefined,
        doktorNotu:     form.doktorNotu     || undefined,
        sonrakiKontrol: form.sonrakiKontrol || undefined,
      })
      setModalBasari('Kaydedildi.')
    } catch (err: unknown) {
      setModalHata(err instanceof Error ? err.message : 'Kayıt başarısız')
    }
    setModalKaydediyor(false)
  }

  // Haftalık takvim
  const haftaGunleri = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(haftaBaslangic)
    d.setDate(d.getDate() + i)
    return d
  })

  function oncekiHafta() {
    const d = new Date(haftaBaslangic); d.setDate(d.getDate() - 7); setHaftaBaslangic(d)
  }
  function sonrakiHafta() {
    const d = new Date(haftaBaslangic); d.setDate(d.getDate() + 7); setHaftaBaslangic(d)
  }
  function buHafta() { setHaftaBaslangic(haftaBaslangici(new Date())) }

  const bugun = tarihStr(new Date())
  const bugunRandevu = randevular.filter(r => r.RandevuTarihi.split('T')[0] === bugun).length
  const bekleyen     = randevular.filter(r => r.Durum === 'Beklemede').length
  const tamamlanan   = randevular.filter(r => r.Durum === 'Tamamlandı').length
  const iptalEdilen  = randevular.filter(r => r.Durum === 'İptal').length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Navbar kullaniciIcon="👨‍⚕️" doktorPrefix />

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-8">Doktor Paneli</h1>

        {/* Üst kartlar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: '📅', sayi: bugunRandevu, etiket: 'Bugünkü Randevu' },
            { icon: '⏳', sayi: bekleyen,     etiket: 'Bekleyen' },
            { icon: '✅', sayi: tamamlanan,   etiket: 'Tamamlanan' },
            { icon: '❌', sayi: iptalEdilen,  etiket: 'İptal Edilen' },
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

        {/* Sekme butonları */}
        <div className="flex gap-2 mb-6">
          {(['liste', 'takvim'] as const).map(s => (
            <button key={s} onClick={() => setAktifSekme(s)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition ${aktifSekme === s ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              {s === 'liste' ? '📋 Liste' : '📆 Haftalık Takvim'}
            </button>
          ))}
        </div>

        {/* LİSTE GÖRÜNÜMÜ */}
        {aktifSekme === 'liste' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 sm:p-6">
            {yukleniyor ? <p className="text-gray-400 text-sm">Yükleniyor...</p>
            : randevular.length === 0 ? <p className="text-gray-400 text-sm">Henüz randevunuz yok.</p>
            : (
              <>
                {/* Masaüstü tablo */}
                <div className="hidden md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700">
                        {['Hasta', 'Tarih', 'Saat', 'Durum', 'İşlem'].map(h => (
                          <th key={h} className="text-left text-sm text-gray-500 dark:text-gray-400 font-medium pb-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {randevular.map((r) => (
                        <tr key={r.RandevuID} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                          <td className="py-4"><div className="flex items-center gap-3"><span>👤</span><span className="font-medium text-gray-800 dark:text-gray-100 text-sm">{r.HastaAdi}</span></div></td>
                          <td className="py-4 text-gray-600 dark:text-gray-300 text-sm">{r.RandevuTarihi.split('T')[0]}</td>
                          <td className="py-4 text-gray-600 dark:text-gray-300 text-sm">{String(r.RandevuSaati).substring(0, 5)}</td>
                          <td className="py-4"><DurumBadge durum={r.Durum} /></td>
                          <td className="py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {r.Durum === 'Beklemede' && <>
                                <button onClick={() => durumGuncelle(r.RandevuID, 'Onaylandı')} className="text-xs bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition">Onayla</button>
                                <button onClick={() => durumGuncelle(r.RandevuID, 'İptal')} className="text-xs bg-red-100 dark:bg-red-900/30 text-red-500 px-3 py-1 rounded-lg hover:bg-red-200 transition">İptal</button>
                              </>}
                              {r.Durum === 'Onaylandı' && <>
                                <button onClick={() => durumGuncelle(r.RandevuID, 'Tamamlandı')} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-200 transition">Tamamla</button>
                                <button onClick={() => durumGuncelle(r.RandevuID, 'Gelmedi')} className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 px-3 py-1 rounded-lg hover:bg-orange-200 transition">Gelmedi</button>
                              </>}
                              {(r.Durum === 'Tamamlandı' || r.Durum === 'Onaylandı') && (
                                <button onClick={() => tibbiBilgiAc(r)} className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 px-3 py-1 rounded-lg hover:bg-purple-200 transition">
                                  Tıbbi Kayıt
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobil kartlar */}
                <div className="md:hidden flex flex-col gap-3">
                  {randevular.map((r) => (
                    <div key={r.RandevuID} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2"><span>👤</span><span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{r.HastaAdi}</span></div>
                        <DurumBadge durum={r.Durum} />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mb-3 pl-7">{r.RandevuTarihi.split('T')[0]} · {String(r.RandevuSaati).substring(0, 5)}</p>
                      <div className="flex flex-wrap gap-1.5 pl-7">
                        {r.Durum === 'Beklemede' && <>
                          <button onClick={() => durumGuncelle(r.RandevuID, 'Onaylandı')} className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition">Onayla</button>
                          <button onClick={() => durumGuncelle(r.RandevuID, 'İptal')} className="text-xs bg-red-100 dark:bg-red-900/30 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-200 transition">İptal</button>
                        </>}
                        {r.Durum === 'Onaylandı' && <>
                          <button onClick={() => durumGuncelle(r.RandevuID, 'Tamamlandı')} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition">Tamamla</button>
                          <button onClick={() => durumGuncelle(r.RandevuID, 'Gelmedi')} className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 px-3 py-1.5 rounded-lg hover:bg-orange-200 transition">Gelmedi</button>
                        </>}
                        {(r.Durum === 'Tamamlandı' || r.Durum === 'Onaylandı') && (
                          <button onClick={() => tibbiBilgiAc(r)} className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 px-3 py-1.5 rounded-lg hover:bg-purple-200 transition">
                            Tıbbi Kayıt
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAKVİM GÖRÜNÜMÜ */}
        {aktifSekme === 'takvim' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <button onClick={oncekiHafta} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-600 dark:text-gray-300">← Önceki</button>
              <div className="text-center">
                <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                  {haftaGunleri[0].toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} –{' '}
                  {haftaGunleri[6].toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <button onClick={buHafta} className="text-xs text-blue-500 hover:underline mt-0.5">Bu haftaya dön</button>
              </div>
              <button onClick={sonrakiHafta} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-600 dark:text-gray-300">Sonraki →</button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {haftaGunleri.map((gun, i) => {
                const gunStr = tarihStr(gun)
                const gunRandevulari = randevular.filter(r => r.RandevuTarihi.split('T')[0] === gunStr)
                const bugünMü = gunStr === bugun
                return (
                  <div key={gunStr} className={`rounded-xl p-2 min-h-[120px] ${bugünMü ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-700' : 'bg-gray-50 dark:bg-gray-700/30'}`}>
                    <div className="text-center mb-2">
                      <p className={`text-xs font-medium ${bugünMü ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>{GUN_ADLARI[i]}</p>
                      <p className={`text-sm font-bold ${bugünMü ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}>{gun.getDate()}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {gunRandevulari.map(r => (
                        <div key={r.RandevuID} className={`text-xs rounded px-1.5 py-1 leading-tight ${durumRenk[r.Durum] ?? 'bg-gray-100 text-gray-600'}`}>
                          <p className="font-medium truncate">{String(r.RandevuSaati).substring(0, 5)}</p>
                          <p className="truncate opacity-80">{r.HastaAdi.split(' ')[0]}</p>
                        </div>
                      ))}
                      {gunRandevulari.length === 0 && <p className="text-xs text-gray-300 dark:text-gray-600 text-center mt-2">—</p>}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 text-center mt-4">
              Bu hafta toplam {randevular.filter(r => {
                const t = r.RandevuTarihi.split('T')[0]
                return t >= tarihStr(haftaGunleri[0]) && t <= tarihStr(haftaGunleri[6])
              }).length} randevu
            </p>
          </div>
        )}
      </div>

      {/* TIBBİ KAYIT MODAL */}
      {modalRandevuId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setModalRandevuId(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Tıbbi Kayıt</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{modalHastaAdi}</p>
              </div>
              <button onClick={() => setModalRandevuId(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">✕</button>
            </div>

            {modalYukleniyor ? (
              <p className="text-gray-400 text-sm text-center py-6">Yükleniyor...</p>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Tanı</label>
                  <textarea rows={2} value={form.tani} onChange={e => setForm(f => ({ ...f, tani: e.target.value }))} placeholder="Konulan tanı..." className={textareaCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Uygulanan İşlem / Tedavi</label>
                  <textarea rows={2} value={form.uygulananIslem} onChange={e => setForm(f => ({ ...f, uygulananIslem: e.target.value }))} placeholder="Yapılan işlemler..." className={textareaCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Reçete</label>
                  <textarea rows={2} value={form.recete} onChange={e => setForm(f => ({ ...f, recete: e.target.value }))} placeholder="Yazılan ilaçlar..." className={textareaCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Lab / Tahlil Notu</label>
                  <textarea rows={2} value={form.labNotu} onChange={e => setForm(f => ({ ...f, labNotu: e.target.value }))} placeholder="Tahlil sonuçları, lab notları..." className={textareaCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Doktor Notu <span className="text-gray-400">(hastaya gösterilmez)</span></label>
                  <textarea rows={2} value={form.doktorNotu} onChange={e => setForm(f => ({ ...f, doktorNotu: e.target.value }))} placeholder="Özel notlarınız..." className={textareaCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Sonraki Kontrol Tarihi</label>
                  <input type="date" value={form.sonrakiKontrol} onChange={e => setForm(f => ({ ...f, sonrakiKontrol: e.target.value }))} className={inputCls} />
                </div>

                {modalBasari && <p className="text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">{modalBasari}</p>}
                {modalHata   && <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{modalHata}</p>}

                <button
                  onClick={tibbiBilgiKaydet}
                  disabled={modalKaydediyor}
                  className="bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm mt-1 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {modalKaydediyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
