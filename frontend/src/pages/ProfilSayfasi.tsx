import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { api } from '../api'
import Navbar from '../components/Navbar'

const inputCls = "w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
const selectCls = inputCls

export default function ProfilSayfasi() {
  const { kullanici, girisYap, token } = useAuth()
  const navigate = useNavigate()

  const [ad, setAd] = useState('')
  const [soyad, setSoyad] = useState('')
  const [email, setEmail] = useState('')
  const [telefon, setTelefon] = useState('')
  const [tcKimlik, setTcKimlik] = useState('')
  const [dogumTarihi, setDogumTarihi] = useState('')
  const [cinsiyet, setCinsiyet] = useState('')
  const [kanGrubu, setKanGrubu] = useState('')
  const [kronikHastaliklar, setKronikHastaliklar] = useState('')
  const [alerjiler, setAlerjiler] = useState('')
  const [surekliIlaclar, setSurekliIlaclar] = useState('')
  const [acilKisiAd, setAcilKisiAd] = useState('')
  const [acilKisiTelefon, setAcilKisiTelefon] = useState('')
  const [adres, setAdres] = useState('')

  const [yukleniyor, setYukleniyor] = useState(true)
  const [kaydediyor, setKaydediyor] = useState(false)
  const [hata, setHata] = useState('')
  const [basari, setBasari] = useState('')

  useEffect(() => {
    if (!kullanici) { navigate('/giris'); return }
    api.profilim().then((veri) => {
      setAd(veri.Ad ?? '')
      setSoyad(veri.Soyad ?? '')
      setEmail(veri.Email ?? '')
      setTelefon(veri.Telefon ?? '')
      setTcKimlik(veri.TCKimlik ?? '')
      setDogumTarihi(veri.DogumTarihi ? veri.DogumTarihi.substring(0, 10) : '')
      setCinsiyet(veri.Cinsiyet ?? '')
      setKanGrubu(veri.KanGrubu ?? '')
      setKronikHastaliklar(veri.KronikHastaliklar ?? '')
      setAlerjiler(veri.Alerjiler ?? '')
      setSurekliIlaclar(veri.SurekliIlaclar ?? '')
      setAcilKisiAd(veri.AcilKisiAd ?? '')
      setAcilKisiTelefon(veri.AcilKisiTelefon ?? '')
      setAdres(veri.Adres ?? '')
    }).catch(() => setHata('Profil yüklenemedi')).finally(() => setYukleniyor(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setHata('')
    setBasari('')
    setKaydediyor(true)
    try {
      await api.profilGuncelle({
        ad, soyad,
        telefon: telefon || undefined,
        tcKimlik: tcKimlik || undefined,
        dogumTarihi: dogumTarihi || undefined,
        cinsiyet: cinsiyet || undefined,
        kanGrubu: kanGrubu || undefined,
        kronikHastaliklar: kronikHastaliklar || undefined,
        alerjiler: alerjiler || undefined,
        surekliIlaclar: surekliIlaclar || undefined,
        acilKisiAd: acilKisiAd || undefined,
        acilKisiTelefon: acilKisiTelefon || undefined,
        adres: adres || undefined,
      })
      if (kullanici && token) {
        girisYap(token, { ...kullanici, ad, soyad })
      }
      setBasari('Profil başarıyla güncellendi!')
    } catch (err: unknown) {
      setHata(err instanceof Error ? err.message : 'Güncelleme başarısız')
    } finally {
      setKaydediyor(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Navbar kullaniciIcon="👤" />

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 sm:p-8">

          {/* Başlık */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-3xl">
              👤
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                {kullanici?.ad} {kullanici?.soyad}
              </h1>
              <p className="text-gray-400 text-sm">{email}</p>
            </div>
          </div>

          {yukleniyor ? (
            <p className="text-gray-400 text-sm text-center py-8">Yükleniyor...</p>
          ) : (
            <>
              {hata && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
                  {hata}
                </div>
              )}
              {basari && (
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-600 dark:text-green-400 rounded-lg px-4 py-3 text-sm mb-4">
                  {basari}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                {/* Kişisel Bilgiler */}
                <section>
                  <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Kişisel Bilgiler</h2>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Ad *</label>
                        <input type="text" value={ad} onChange={e => setAd(e.target.value)} required className={inputCls} />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Soyad *</label>
                        <input type="text" value={soyad} onChange={e => setSoyad(e.target.value)} required className={inputCls} />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">E-posta</label>
                      <input type="email" value={email} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
                      <p className="text-xs text-gray-400 mt-1">E-posta adresi değiştirilemez</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">TC Kimlik No</label>
                        <input
                          type="text"
                          placeholder="11 haneli TC No"
                          value={tcKimlik}
                          onChange={e => setTcKimlik(e.target.value)}
                          maxLength={11}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Telefon</label>
                        <input
                          type="tel"
                          placeholder="05XX XXX XX XX"
                          value={telefon}
                          onChange={e => setTelefon(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Doğum Tarihi</label>
                        <input
                          type="date"
                          value={dogumTarihi}
                          onChange={e => setDogumTarihi(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Cinsiyet</label>
                        <select value={cinsiyet} onChange={e => setCinsiyet(e.target.value)} className={selectCls}>
                          <option value="">Seçin</option>
                          <option value="Erkek">Erkek</option>
                          <option value="Kadın">Kadın</option>
                          <option value="Belirtmek istemiyorum">Belirtmek istemiyorum</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Kan Grubu</label>
                        <select value={kanGrubu} onChange={e => setKanGrubu(e.target.value)} className={selectCls}>
                          <option value="">Seçin</option>
                          {['A+','A-','B+','B-','AB+','AB-','0+','0-'].map(kg => (
                            <option key={kg} value={kg}>{kg}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Adres</label>
                      <textarea
                        placeholder="Ev adresiniz"
                        value={adres}
                        onChange={e => setAdres(e.target.value)}
                        rows={2}
                        className={`${inputCls} resize-none`}
                      />
                    </div>
                  </div>
                </section>

                {/* Sağlık Bilgileri */}
                <section>
                  <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Sağlık Bilgileri</h2>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Kronik Hastalıklar</label>
                      <input
                        type="text"
                        placeholder="Örn: Diyabet, Tansiyon, Astım"
                        value={kronikHastaliklar}
                        onChange={e => setKronikHastaliklar(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Alerjiler</label>
                      <input
                        type="text"
                        placeholder="Örn: Penisilin, Aspirin, Polen"
                        value={alerjiler}
                        onChange={e => setAlerjiler(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Sürekli Kullandığı İlaçlar</label>
                      <input
                        type="text"
                        placeholder="Örn: Metformin 500mg, Beloc 25mg"
                        value={surekliIlaclar}
                        onChange={e => setSurekliIlaclar(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </section>

                {/* Acil İletişim */}
                <section>
                  <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Acil İletişim</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Kişi Adı</label>
                      <input
                        type="text"
                        placeholder="Ad Soyad"
                        value={acilKisiAd}
                        onChange={e => setAcilKisiAd(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Telefon</label>
                      <input
                        type="tel"
                        placeholder="05XX XXX XX XX"
                        value={acilKisiTelefon}
                        onChange={e => setAcilKisiTelefon(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </section>

                {/* Butonlar */}
                <div className="flex gap-3 mt-2">
                  <button
                    type="submit"
                    disabled={kaydediyor}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium text-sm transition disabled:opacity-60"
                  >
                    {kaydediyor ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/hasta')}
                    className="px-4 py-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm font-medium border border-gray-200 dark:border-gray-600 rounded-lg transition"
                  >
                    Geri
                  </button>
                </div>

              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
