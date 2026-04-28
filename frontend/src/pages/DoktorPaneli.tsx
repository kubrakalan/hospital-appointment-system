import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { useTheme } from '../ThemeContext'
import DurumBadge from '../components/DurumBadge'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const durumRenk: Record<string, string> = {
  'Onaylandı': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'Beklemede': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  'Tamamlandı': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  'İptal': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

interface Randevu {
  RandevuID: number; HastaAdi: string; RandevuTarihi: string
  RandevuSaati: string; Durum: string; Notlar: string | null
  RandevuTipi?: string; VideoOdaID?: string
}

interface DoktorIstatistik {
  ozet: {
    toplamRandevu: number; tamamlanan: number; iptalEdilen: number
    gelmedi: number; bekleyen: number; onaylandi: number
    bugun: number; son30Gun: number; benzersizHasta: number
  }
  aylik: { ay: string; sayi: number; tamamlanan: number }[]
  topHastalar: { hastaAdi: string; randevuSayisi: number }[]
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

function tarihStr(d: Date): string { return d.toISOString().split('T')[0] }

const GUN_ADLARI = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

const inp = 'border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-full'
const ta = `${inp} resize-none`

type DoktorSekme = 'dashboard' | 'liste' | 'gecmis' | 'takvim' | 'istatistik' | 'calisma'

const DOKTOR_NAV: { key: DoktorSekme; icon: string; label: string }[] = [
  { key: 'dashboard',  icon: '🏠', label: 'Dashboard' },
  { key: 'liste',      icon: '📋', label: 'Randevularım' },
  { key: 'gecmis',     icon: '🗂️', label: 'Geçmiş' },
  { key: 'takvim',     icon: '📆', label: 'Takvim' },
  { key: 'istatistik', icon: '📊', label: 'İstatistiklerim' },
  { key: 'calisma',    icon: '🕐', label: 'Çalışma Saatleri' },
]

export default function DoktorPaneli() {
  const navigate = useNavigate()
  const { kullanici, cikisYap } = useAuth()
  const { theme, toggle } = useTheme()

  const [aktifSekme, setAktifSekme] = useState<DoktorSekme>('dashboard')
  const [sidebarAcik, setSidebarAcik] = useState(false)

  const [randevular, setRandevular] = useState<Randevu[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [gecmisKayitlar, setGecmisKayitlar] = useState<{ randevu: Randevu; kayit: Record<string, string | null> | null }[]>([])
  const [gecmisYukleniyor, setGecmisYukleniyor] = useState(false)
  const [haftaBaslangic, setHaftaBaslangic] = useState(() => haftaBaslangici(new Date()))

  const [istatistik, setIstatistik] = useState<DoktorIstatistik | null>(null)
  const [istatistikYukleniyor, setIstatistikYukleniyor] = useState(false)

  const [listeDurum, setListeDurum] = useState('Tümü')
  const [listeTarihBas, setListeTarihBas] = useState('')
  const [listeTarihBit, setListeTarihBit] = useState('')

  const [calismaSaatleri, setCalismaSaatleri] = useState<{ gun: string; baslangicSaat: string; bitisSaat: string; aktif: boolean }[]>(
    GUNLER.map(gun => ({ gun, baslangicSaat: '09:00', bitisSaat: '17:00', aktif: false }))
  )
  const [calismaYukleniyor, setCalismaYukleniyor] = useState(false)
  const [calismaKaydediyor, setCalismaKaydediyor] = useState(false)
  const [calismaBasari, setCalismaBasari] = useState('')
  const [calismaHata, setCalismaHata] = useState('')

  const [modalRandevuId, setModalRandevuId] = useState<number | null>(null)
  const [modalHastaAdi, setModalHastaAdi] = useState('')
  const [form, setForm] = useState<TibbiBilgiForm>(bosForm)
  const [modalYukleniyor, setModalYukleniyor] = useState(false)
  const [modalKaydediyor, setModalKaydediyor] = useState(false)
  const [modalBasari, setModalBasari] = useState('')
  const [modalHata, setModalHata] = useState('')

  useEffect(() => {
    api.doktorRandevular().then(setRandevular).catch(() => {}).finally(() => setYukleniyor(false))
    setCalismaYukleniyor(true)
    api.doktorCalismaSaatleri().then((kayitlar: { Gun: string; BaslangicSaat: string; BitisSaat: string }[]) => {
      if (kayitlar.length > 0) {
        setCalismaSaatleri(GUNLER.map(gun => {
          const kayit = kayitlar.find(k => k.Gun === gun)
          return { gun, baslangicSaat: kayit ? String(kayit.BaslangicSaat).substring(0, 5) : '09:00', bitisSaat: kayit ? String(kayit.BitisSaat).substring(0, 5) : '17:00', aktif: !!kayit }
        }))
      }
    }).catch(() => {}).finally(() => setCalismaYukleniyor(false))
  }, [])

  useEffect(() => {
    if (aktifSekme === 'istatistik' && !istatistik) {
      setIstatistikYukleniyor(true)
      api.doktorIstatistikler().then(setIstatistik).catch(() => {}).finally(() => setIstatistikYukleniyor(false))
    }
  }, [aktifSekme, istatistik])

  useEffect(() => {
    if (aktifSekme !== 'gecmis' || gecmisKayitlar.length > 0) return
    const tamamlananlar = [...randevular]
      .filter(r => r.Durum === 'Tamamlandı' || r.Durum === 'Gelmedi')
      .sort((a, b) => (b.RandevuTarihi + String(b.RandevuSaati)).localeCompare(a.RandevuTarihi + String(a.RandevuSaati)))
    if (tamamlananlar.length === 0) { setGecmisKayitlar([]); return }
    setGecmisYukleniyor(true)
    Promise.all(tamamlananlar.map(async rv => {
      try { return { randevu: rv, kayit: await api.doktorTibbiBilgiGetir(rv.RandevuID) } } catch { return { randevu: rv, kayit: null } }
    })).then(setGecmisKayitlar).finally(() => setGecmisYukleniyor(false))
  }, [aktifSekme, randevular])

  async function durumGuncelle(id: number, durum: string) {
    try { await api.doktorRandevuDurum(id, durum); setRandevular(prev => prev.map(r => r.RandevuID === id ? { ...r, Durum: durum } : r)) } catch { }
  }

  async function tibbiBilgiAc(randevu: Randevu) {
    setModalRandevuId(randevu.RandevuID); setModalHastaAdi(randevu.HastaAdi)
    setForm(bosForm); setModalBasari(''); setModalHata(''); setModalYukleniyor(true)
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
    setModalKaydediyor(true); setModalBasari(''); setModalHata('')
    try {
      await api.doktorTibbiBilgiKaydet(modalRandevuId, {
        tani: form.tani || undefined, uygulananIslem: form.uygulananIslem || undefined,
        recete: form.recete || undefined, labNotu: form.labNotu || undefined,
        doktorNotu: form.doktorNotu || undefined, sonrakiKontrol: form.sonrakiKontrol || undefined,
      })
      setModalBasari('Kaydedildi.')
    } catch (err: unknown) { setModalHata(err instanceof Error ? err.message : 'Kayıt başarısız') }
    setModalKaydediyor(false)
  }

  const haftaGunleri = Array.from({ length: 7 }, (_, i) => { const d = new Date(haftaBaslangic); d.setDate(d.getDate() + i); return d })
  function oncekiHafta() { const d = new Date(haftaBaslangic); d.setDate(d.getDate() - 7); setHaftaBaslangic(d) }
  function sonrakiHafta() { const d = new Date(haftaBaslangic); d.setDate(d.getDate() + 7); setHaftaBaslangic(d) }
  function buHafta() { setHaftaBaslangic(haftaBaslangici(new Date())) }

  const filtreliRandevular = randevular.filter(r => {
    const durumUygun = listeDurum === 'Tümü' || r.Durum === listeDurum
    const tarih = r.RandevuTarihi.split('T')[0]
    return durumUygun && (!listeTarihBas || tarih >= listeTarihBas) && (!listeTarihBit || tarih <= listeTarihBit)
  })

  const bugun = tarihStr(new Date())
  const bugunRandevu  = randevular.filter(r => r.RandevuTarihi.split('T')[0] === bugun)
  const bekleyen      = randevular.filter(r => r.Durum === 'Beklemede').length
  const tamamlanan    = randevular.filter(r => r.Durum === 'Tamamlandı').length
  const iptalEdilen   = randevular.filter(r => r.Durum === 'İptal').length
  const onlineAktif   = randevular.filter(r => r.RandevuTipi === 'Online' && (r.Durum === 'Beklemede' || r.Durum === 'Onaylandı'))

  function navGit(key: DoktorSekme) { setAktifSekme(key); setSidebarAcik(false) }
  function cikis() { cikisYap(); navigate('/giris') }

  const bugunStr = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col transition-transform duration-200 ${sidebarAcik ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:shrink-0`}>
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/60">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-xl shrink-0">🏥</div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">MediRandevu</p>
            <p className="text-slate-400 text-xs">Doktor Paneli</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {DOKTOR_NAV.map(item => (
            <button key={item.key} onClick={() => navGit(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${aktifSekme === item.key ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <span className="text-base w-5 text-center shrink-0">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.key === 'liste' && bekleyen > 0 && (
                <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold min-w-5 text-center">{bekleyen}</span>
              )}
              {item.key === 'liste' && onlineAktif.length > 0 && bekleyen === 0 && (
                <span className="bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">📹</span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-slate-700/60">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {(kullanici?.ad?.[0] ?? '') + (kullanici?.soyad?.[0] ?? '')}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">Dr. {kullanici?.ad} {kullanici?.soyad}</p>
              <p className="text-slate-400 text-xs">Doktor</p>
            </div>
          </div>
          <button onClick={cikis} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 text-xs font-medium transition">
            <span>🚪</span> Çıkış Yap
          </button>
        </div>
      </aside>

      {sidebarAcik && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarAcik(false)} />}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 h-16 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarAcik(true)} className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 text-xl p-1">☰</button>
            <div>
              <h1 className="text-base font-bold text-gray-800 dark:text-gray-100 leading-tight">
                {DOKTOR_NAV.find(n => n.key === aktifSekme)?.label}
              </h1>
              <p className="text-xs text-gray-400 hidden sm:block">{bugunStr}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">

          {/* ══ DASHBOARD ══ */}
          {aktifSekme === 'dashboard' && (
            <div className="flex flex-col gap-5">

              {/* Karşılama */}
              <div className="bg-linear-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white">
                <p className="text-lg font-bold">Hoş geldiniz, Dr. {kullanici?.ad}! 👋</p>
                <p className="text-blue-100 text-sm mt-0.5">Bugün {bugunRandevu.length} randevunuz var</p>
                {onlineAktif.length > 0 && (
                  <div className="mt-3 bg-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
                    <span className="text-sm">📹</span>
                    <p className="text-sm font-medium">{onlineAktif.length} aktif online görüşme bekleniyor</p>
                  </div>
                )}
              </div>

              {/* Stat kartlar */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { icon: '📅', sayi: bugunRandevu.length, etiket: 'Bugünkü', color: 'from-blue-500 to-blue-600',       ring: 'ring-blue-100 dark:ring-blue-900/30',     sekme: 'liste' as DoktorSekme },
                  { icon: '⏳', sayi: bekleyen,             etiket: 'Bekleyen', color: 'from-orange-500 to-orange-600', ring: 'ring-orange-100 dark:ring-orange-900/30', sekme: 'liste' as DoktorSekme },
                  { icon: '✅', sayi: tamamlanan,           etiket: 'Tamamlanan', color: 'from-emerald-500 to-emerald-600', ring: 'ring-emerald-100 dark:ring-emerald-900/30', sekme: 'gecmis' as DoktorSekme },
                  { icon: '❌', sayi: iptalEdilen,          etiket: 'İptal', color: 'from-red-500 to-red-600',          ring: 'ring-red-100 dark:ring-red-900/30',       sekme: 'liste' as DoktorSekme },
                ].map(k => (
                  <button key={k.etiket} onClick={() => navGit(k.sekme)}
                    className={`bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm ring-1 ${k.ring} flex items-center gap-3 hover:scale-[1.02] transition-all text-left`}>
                    <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${k.color} flex items-center justify-center text-lg shrink-0`}>{k.icon}</div>
                    <div>
                      <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{k.sayi}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">{k.etiket}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Bugünkü randevular */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Bugünkü Randevular</h2>
                  <button onClick={() => navGit('liste')} className="text-xs text-blue-600 hover:underline">Tümünü gör →</button>
                </div>
                {yukleniyor ? (
                  <p className="text-gray-400 text-sm">Yükleniyor...</p>
                ) : bugunRandevu.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-3xl mb-2">📅</p>
                    <p className="text-gray-400 text-sm">Bugün randevu yok</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {bugunRandevu.sort((a, b) => String(a.RandevuSaati).localeCompare(String(b.RandevuSaati))).map(r => (
                      <div key={r.RandevuID} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/40 transition">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-sm shrink-0">👤</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{r.HastaAdi}</p>
                          <p className="text-xs text-gray-400">{String(r.RandevuSaati).substring(0, 5)}{r.RandevuTipi === 'Online' ? ' · 📹 Online' : ''}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <DurumBadge durum={r.Durum} />
                          {r.RandevuTipi === 'Online' && (r.Durum === 'Beklemede' || r.Durum === 'Onaylandı') && (
                            <button onClick={() => navigate(`/gorusme/${r.RandevuID}`)} className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-lg hover:bg-emerald-700 transition font-semibold">📹 Katıl</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Online görüşme kartı */}
              {onlineAktif.length > 0 && (
                <div className="bg-linear-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white">
                  <p className="font-semibold text-sm mb-1">📹 Bekleyen Online Görüşmeler</p>
                  <div className="flex flex-col gap-2 mt-3">
                    {onlineAktif.slice(0, 3).map(r => (
                      <div key={r.RandevuID} className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">{r.HastaAdi}</p>
                          <p className="text-xs text-emerald-100">{r.RandevuTarihi.split('T')[0]} · {String(r.RandevuSaati).substring(0, 5)}</p>
                        </div>
                        <button onClick={() => navigate(`/gorusme/${r.RandevuID}`)} className="bg-white text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition">Katıl</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ RANDEVULARIM (Liste) ══ */}
          {aktifSekme === 'liste' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 sm:p-6">
              {/* Filtreler */}
              <div className="flex flex-col gap-3 mb-5">
                <div className="flex flex-col sm:flex-row gap-3">
                  <select value={listeDurum} onChange={e => setListeDurum(e.target.value)}
                    className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                    {['Tümü','Beklemede','Onaylandı','Tamamlandı','İptal','Gelmedi'].map(d => <option key={d}>{d}</option>)}
                  </select>
                  <div className="flex items-center gap-2 flex-1">
                    <input type="date" value={listeTarihBas} onChange={e => setListeTarihBas(e.target.value)}
                      className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 flex-1" />
                    <span className="text-xs text-gray-400">—</span>
                    <input type="date" value={listeTarihBit} onChange={e => setListeTarihBit(e.target.value)}
                      className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 flex-1" />
                  </div>
                  {(listeDurum !== 'Tümü' || listeTarihBas || listeTarihBit) && (
                    <button onClick={() => { setListeDurum('Tümü'); setListeTarihBas(''); setListeTarihBit('') }} className="text-xs text-gray-400 hover:text-red-500 transition shrink-0">Temizle ✕</button>
                  )}
                </div>
                <p className="text-xs text-gray-400">{filtreliRandevular.length} randevu listeleniyor</p>
              </div>

              {yukleniyor ? <p className="text-gray-400 text-sm">Yükleniyor...</p>
              : filtreliRandevular.length === 0 ? <p className="text-gray-400 text-sm">{randevular.length === 0 ? 'Henüz randevunuz yok.' : 'Filtreyle eşleşen randevu bulunamadı.'}</p>
              : (
                <>
                  {/* Masaüstü tablo */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                          {['Hasta', 'Tarih', 'Saat', 'Tip', 'Durum', 'İşlem'].map(h => (
                            <th key={h} className="text-left text-xs text-gray-500 dark:text-gray-400 font-medium pb-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtreliRandevular.map(r => (
                          <tr key={r.RandevuID} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm shrink-0">👤</div>
                                <span className="font-medium text-gray-800 dark:text-gray-100 text-sm">{r.HastaAdi}</span>
                              </div>
                            </td>
                            <td className="py-3 text-gray-600 dark:text-gray-300 text-sm">{r.RandevuTarihi.split('T')[0]}</td>
                            <td className="py-3 text-gray-600 dark:text-gray-300 text-sm">{String(r.RandevuSaati).substring(0, 5)}</td>
                            <td className="py-3">
                              {r.RandevuTipi === 'Online'
                                ? <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">📹 Online</span>
                                : <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded-full">🏥 Hastane</span>}
                            </td>
                            <td className="py-3"><DurumBadge durum={r.Durum} /></td>
                            <td className="py-3">
                              <div className="flex flex-wrap gap-1.5">
                                {r.RandevuTipi === 'Online' && (r.Durum === 'Beklemede' || r.Durum === 'Onaylandı') && (
                                  <button onClick={() => navigate(`/gorusme/${r.RandevuID}`)} className="text-xs bg-emerald-500 text-white px-3 py-1 rounded-lg hover:bg-emerald-600 transition font-semibold">📹 Katıl</button>
                                )}
                                {r.Durum === 'Beklemede' && <>
                                  <button onClick={() => durumGuncelle(r.RandevuID, 'Onaylandı')} className="text-xs bg-emerald-500 text-white px-3 py-1 rounded-lg hover:bg-emerald-600 transition">Onayla</button>
                                  <button onClick={() => durumGuncelle(r.RandevuID, 'İptal')} className="text-xs bg-red-100 dark:bg-red-900/30 text-red-500 px-3 py-1 rounded-lg hover:bg-red-200 transition">İptal</button>
                                </>}
                                {r.Durum === 'Onaylandı' && <>
                                  <button onClick={() => durumGuncelle(r.RandevuID, 'Tamamlandı')} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-200 transition">Tamamla</button>
                                  <button onClick={() => durumGuncelle(r.RandevuID, 'Gelmedi')} className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 px-3 py-1 rounded-lg hover:bg-orange-200 transition">Gelmedi</button>
                                </>}
                                {(r.Durum === 'Tamamlandı' || r.Durum === 'Onaylandı') && (
                                  <button onClick={() => tibbiBilgiAc(r)} className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-600 px-3 py-1 rounded-lg hover:bg-violet-200 transition">Tıbbi Kayıt</button>
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
                    {filtreliRandevular.map(r => (
                      <div key={r.RandevuID} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2"><span>👤</span><span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{r.HastaAdi}</span></div>
                          <DurumBadge durum={r.Durum} />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mb-3 pl-7">{r.RandevuTarihi.split('T')[0]} · {String(r.RandevuSaati).substring(0, 5)}{r.RandevuTipi === 'Online' ? ' · 📹' : ''}</p>
                        <div className="flex flex-wrap gap-1.5 pl-7">
                          {r.RandevuTipi === 'Online' && (r.Durum === 'Beklemede' || r.Durum === 'Onaylandı') && (
                            <button onClick={() => navigate(`/gorusme/${r.RandevuID}`)} className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition font-semibold">📹 Katıl</button>
                          )}
                          {r.Durum === 'Beklemede' && <>
                            <button onClick={() => durumGuncelle(r.RandevuID, 'Onaylandı')} className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition">Onayla</button>
                            <button onClick={() => durumGuncelle(r.RandevuID, 'İptal')} className="text-xs bg-red-100 dark:bg-red-900/30 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-200 transition">İptal</button>
                          </>}
                          {r.Durum === 'Onaylandı' && <>
                            <button onClick={() => durumGuncelle(r.RandevuID, 'Tamamlandı')} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition">Tamamla</button>
                            <button onClick={() => durumGuncelle(r.RandevuID, 'Gelmedi')} className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 px-3 py-1.5 rounded-lg hover:bg-orange-200 transition">Gelmedi</button>
                          </>}
                          {(r.Durum === 'Tamamlandı' || r.Durum === 'Onaylandı') && (
                            <button onClick={() => tibbiBilgiAc(r)} className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-600 px-3 py-1.5 rounded-lg hover:bg-violet-200 transition">Tıbbi Kayıt</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══ GEÇMİŞ ══ */}
          {aktifSekme === 'gecmis' && (
            <div className="space-y-4">
              {gecmisYukleniyor ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center text-gray-400 text-sm">Yükleniyor...</div>
              ) : gecmisKayitlar.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
                  <p className="text-4xl mb-3">🗂️</p>
                  <p className="text-gray-400 text-sm">Henüz tamamlanan randevu yok.</p>
                </div>
              ) : gecmisKayitlar.map(({ randevu, kayit }) => (
                <div key={randevu.RandevuID} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg shrink-0">👤</div>
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{randevu.HastaAdi}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${durumRenk[randevu.Durum] ?? ''}`}>{randevu.Durum}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{randevu.RandevuTarihi.split('T')[0]}</p>
                      <p className="text-xs text-gray-400">{String(randevu.RandevuSaati).substring(0, 5)}</p>
                    </div>
                  </div>
                  {!kayit ? (
                    <div className="flex items-center justify-between">
                      <p className="text-gray-400 text-sm italic">Tıbbi kayıt girilmemiş</p>
                      <button onClick={() => tibbiBilgiAc(randevu)} className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-600 px-3 py-1.5 rounded-lg hover:bg-violet-200 transition">+ Kayıt Ekle</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { label: '🔬 Tanı', deger: (kayit as Record<string, string | null>).Tani },
                        { label: '💊 Reçete', deger: (kayit as Record<string, string | null>).Recete },
                        { label: '🩺 Uygulanan İşlem', deger: (kayit as Record<string, string | null>).UygulananIslem },
                        { label: '🧪 Lab Notu', deger: (kayit as Record<string, string | null>).LabNotu },
                        { label: '📅 Sonraki Kontrol', deger: (kayit as Record<string, string | null>).SonrakiKontrol },
                      ].filter(f => f.deger).map(f => (
                        <div key={f.label} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl px-4 py-3">
                          <p className="text-xs font-medium text-gray-400 mb-1">{f.label}</p>
                          <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{f.deger}</p>
                        </div>
                      ))}
                      <button onClick={() => tibbiBilgiAc(randevu)} className="col-span-full text-xs text-violet-500 hover:text-violet-600 font-medium mt-1 text-left">✏️ Kaydı Düzenle</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ══ TAKVİM ══ */}
          {aktifSekme === 'takvim' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <button onClick={oncekiHafta} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-600 dark:text-gray-300 text-sm">← Önceki</button>
                <div className="text-center">
                  <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                    {haftaGunleri[0].toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} – {haftaGunleri[6].toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <button onClick={buHafta} className="text-xs text-blue-500 hover:underline mt-0.5">Bu haftaya dön</button>
                </div>
                <button onClick={sonrakiHafta} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-600 dark:text-gray-300 text-sm">Sonraki →</button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {haftaGunleri.map((gun, i) => {
                  const gunStr = tarihStr(gun)
                  const gunRandevulari = randevular.filter(r => r.RandevuTarihi.split('T')[0] === gunStr)
                  const bugünMü = gunStr === bugun
                  return (
                    <div key={gunStr} className={`rounded-xl p-2 min-h-30 ${bugünMü ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-700' : 'bg-gray-50 dark:bg-gray-700/30'}`}>
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
                Bu hafta toplam {randevular.filter(r => { const t = r.RandevuTarihi.split('T')[0]; return t >= tarihStr(haftaGunleri[0]) && t <= tarihStr(haftaGunleri[6]) }).length} randevu
              </p>
            </div>
          )}

          {/* ══ İSTATİSTİKLERİM ══ */}
          {aktifSekme === 'istatistik' && (
            <div className="space-y-5">
              {istatistikYukleniyor ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center text-gray-400 text-sm">Yükleniyor...</div>
              ) : !istatistik ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center text-gray-400 text-sm">İstatistik verisi bulunamadı.</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { icon: '👥', sayi: istatistik.ozet.benzersizHasta, etiket: 'Toplam Hasta',   color: 'from-blue-500 to-blue-600' },
                      { icon: '✅', sayi: istatistik.ozet.tamamlanan,      etiket: 'Tamamlanan',     color: 'from-emerald-500 to-emerald-600' },
                      { icon: '❌', sayi: istatistik.ozet.iptalEdilen,     etiket: 'İptal Edilen',   color: 'from-red-500 to-red-600' },
                      { icon: '🚫', sayi: istatistik.ozet.gelmedi,         etiket: 'Gelmedi',         color: 'from-orange-500 to-orange-600' },
                    ].map(k => (
                      <div key={k.etiket} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${k.color} flex items-center justify-center text-lg shrink-0`}>{k.icon}</div>
                        <div>
                          <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{k.sayi}</p>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">{k.etiket}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {istatistik.ozet.toplamRandevu > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Tamamlanma Oranı</p>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                          <div className="bg-emerald-500 h-4 rounded-full transition-all" style={{ width: `${Math.round(100 * istatistik.ozet.tamamlanan / istatistik.ozet.toplamRandevu)}%` }} />
                        </div>
                        <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 min-w-16 text-right">
                          %{Math.round(100 * istatistik.ozet.tamamlanan / istatistik.ozet.toplamRandevu)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Toplam {istatistik.ozet.toplamRandevu} randevu üzerinden</p>
                    </div>
                  )}

                  {istatistik.aylik.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Son 6 Ay — Randevu Grafiği</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={istatistik.aylik}>
                          <XAxis dataKey="ay" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9', fontSize: 12 }} />
                          <Bar dataKey="sayi" name="Toplam" fill="#93c5fd" radius={[4,4,0,0]} />
                          <Bar dataKey="tamamlanan" name="Tamamlanan" fill="#34d399" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {istatistik.topHastalar.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">En Sık Gelen Hastalar (Top 5)</p>
                      <div className="flex flex-col gap-2">
                        {istatistik.topHastalar.map((h, i) => (
                          <div key={h.hastaAdi} className="flex items-center gap-3">
                            <span className="text-xs font-bold text-gray-400 w-5 text-right">{i + 1}.</span>
                            <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-7 overflow-hidden relative">
                              <div className="bg-blue-400 dark:bg-blue-600 h-7 rounded-full" style={{ width: `${(h.randevuSayisi / istatistik.topHastalar[0].randevuSayisi) * 100}%` }} />
                              <span className="absolute inset-0 flex items-center px-3 text-xs font-medium text-gray-700 dark:text-gray-100">{h.hastaAdi}</span>
                            </div>
                            <span className="text-sm font-bold text-gray-600 dark:text-gray-300 min-w-8 text-right">{h.randevuSayisi}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ══ ÇALIŞMA SAATLERİ ══ */}
          {aktifSekme === 'calisma' && (
            <div className="max-w-2xl">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Çalışma Saatleri</h2>
                <p className="text-gray-400 text-sm mb-5">Hangi günler ve saatler arasında randevu alınabileceğini ayarlayın.</p>
                {calismaYukleniyor ? <p className="text-gray-400 text-sm">Yükleniyor...</p> : (
                  <div className="flex flex-col gap-3">
                    {calismaSaatleri.map((s, i) => (
                      <div key={s.gun} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border transition ${s.aktif ? 'border-blue-200 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-100 dark:border-gray-700 opacity-60'}`}>
                        <div className="flex items-center gap-3 min-w-32.5">
                          <input type="checkbox" checked={s.aktif}
                            onChange={e => setCalismaSaatleri(prev => prev.map((x, j) => j === i ? { ...x, aktif: e.target.checked } : x))}
                            className="w-4 h-4 accent-blue-600" />
                          <span className="font-medium text-gray-700 dark:text-gray-200 text-sm">{s.gun}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                          <input type="time" value={s.baslangicSaat} disabled={!s.aktif}
                            onChange={e => setCalismaSaatleri(prev => prev.map((x, j) => j === i ? { ...x, baslangicSaat: e.target.value } : x))}
                            className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-40" />
                          <span className="text-gray-400 text-sm">—</span>
                          <input type="time" value={s.bitisSaat} disabled={!s.aktif}
                            onChange={e => setCalismaSaatleri(prev => prev.map((x, j) => j === i ? { ...x, bitisSaat: e.target.value } : x))}
                            className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-40" />
                        </div>
                      </div>
                    ))}
                    {calismaBasari && <p className="text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2">{calismaBasari}</p>}
                    {calismaHata   && <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{calismaHata}</p>}
                    <button
                      onClick={async () => {
                        setCalismaKaydediyor(true); setCalismaBasari(''); setCalismaHata('')
                        try {
                          await api.doktorCalismaSaatleriGuncelle(calismaSaatleri.filter(s => s.aktif).map(s => ({ gun: s.gun, baslangicSaat: s.baslangicSaat, bitisSaat: s.bitisSaat })))
                          setCalismaBasari('Çalışma saatleri kaydedildi.')
                        } catch (err: unknown) { setCalismaHata(err instanceof Error ? err.message : 'Kayıt başarısız') }
                        setCalismaKaydediyor(false)
                      }}
                      disabled={calismaKaydediyor}
                      className="bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 font-medium text-sm mt-2 disabled:opacity-50 transition"
                    >
                      {calismaKaydediyor ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ══ TIBBİ KAYIT MODAL ══ */}
      {modalRandevuId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setModalRandevuId(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Tıbbi Kayıt</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{modalHastaAdi}</p>
              </div>
              <button onClick={() => setModalRandevuId(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            {modalYukleniyor ? (
              <p className="text-gray-400 text-sm text-center py-6">Yükleniyor...</p>
            ) : (
              <div className="flex flex-col gap-3">
                <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Tanı</label><textarea rows={2} value={form.tani} onChange={e => setForm(f => ({ ...f, tani: e.target.value }))} placeholder="Konulan tanı..." className={ta} /></div>
                <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Uygulanan İşlem / Tedavi</label><textarea rows={2} value={form.uygulananIslem} onChange={e => setForm(f => ({ ...f, uygulananIslem: e.target.value }))} placeholder="Yapılan işlemler..." className={ta} /></div>
                <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Reçete</label><textarea rows={2} value={form.recete} onChange={e => setForm(f => ({ ...f, recete: e.target.value }))} placeholder="Yazılan ilaçlar..." className={ta} /></div>
                <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Lab / Tahlil Notu</label><textarea rows={2} value={form.labNotu} onChange={e => setForm(f => ({ ...f, labNotu: e.target.value }))} placeholder="Tahlil sonuçları..." className={ta} /></div>
                <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Doktor Notu <span className="text-gray-400">(hastaya gösterilmez)</span></label><textarea rows={2} value={form.doktorNotu} onChange={e => setForm(f => ({ ...f, doktorNotu: e.target.value }))} placeholder="Özel notlarınız..." className={ta} /></div>
                <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Sonraki Kontrol Tarihi</label><input type="date" value={form.sonrakiKontrol} onChange={e => setForm(f => ({ ...f, sonrakiKontrol: e.target.value }))} className={inp} /></div>
                {modalBasari && <p className="text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2">{modalBasari}</p>}
                {modalHata   && <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{modalHata}</p>}
                <button onClick={tibbiBilgiKaydet} disabled={modalKaydediyor}
                  className="bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 font-medium text-sm mt-1 disabled:opacity-50 disabled:cursor-not-allowed transition">
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
