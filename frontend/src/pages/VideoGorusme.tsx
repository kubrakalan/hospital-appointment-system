import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'

interface OdaBilgi {
  odaId: string
  jitsiUrl: string
  displayAd: string
  isHasta: boolean
  randevuBilgi: {
    tarih: string
    saat: string
    doktorAdi: string
    hastaAdi: string
    uzmanlik: string
  }
}

export default function VideoGorusme() {
  const { randevuId } = useParams<{ randevuId: string }>()
  const navigate = useNavigate()
  const [oda, setOda] = useState<OdaBilgi | null>(null)
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(true)
  const [gorusmeBitti, setGorusmeBitti] = useState(false)
  const [notlar, setNotlar] = useState('')
  const [notKaydediliyor, setNotKaydediliyor] = useState(false)
  const [notKaydedildi, setNotKaydedildi] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!randevuId) return
    api.videoOdaGetir(parseInt(randevuId))
      .then(setOda)
      .catch((e: Error) => setHata(e.message))
      .finally(() => setYukleniyor(false))
  }, [randevuId])

  async function notKaydet() {
    if (!notlar.trim() || !randevuId) return
    setNotKaydediliyor(true)
    try {
      await api.doktorTibbiBilgiKaydet(parseInt(randevuId), { doktorNotu: notlar })
      setNotKaydedildi(true)
    } catch {
      // sessizce geç — doktor değilse endpoint reddeder
    } finally {
      setNotKaydediliyor(false)
    }
  }

  if (yukleniyor) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-4xl mb-4 animate-pulse">📹</div>
          <p className="text-lg">Görüşme odası yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (hata) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-3">Görüşmeye Katılılamadı</h2>
          <p className="text-red-400 text-sm mb-6">{hata}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium transition"
          >
            ← Geri Dön
          </button>
        </div>
      </div>
    )
  }

  if (gorusmeBitti) {
    const panelYolu = oda?.isHasta ? '/hasta' : '/doktor'
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-white mb-2">Görüşme Tamamlandı</h2>
          <p className="text-gray-400 text-sm mb-6">
            {oda?.isHasta
              ? `Dr. ${oda.randevuBilgi.doktorAdi} ile görüşmeniz sona erdi.`
              : `${oda?.randevuBilgi.hastaAdi} ile görüşmeniz sona erdi.`}
          </p>
          <button
            onClick={() => navigate(panelYolu)}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium transition w-full"
          >
            Panele Dön
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Üst bilgi şeridi */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <div>
            <p className="text-white font-semibold text-sm">
              {oda?.isHasta ? `Dr. ${oda.randevuBilgi.doktorAdi}` : oda?.randevuBilgi.hastaAdi}
            </p>
            <p className="text-gray-400 text-xs">
              {oda?.randevuBilgi.uzmanlik} · {oda?.randevuBilgi.tarih} {oda?.randevuBilgi.saat}
            </p>
          </div>
        </div>
        <button
          onClick={() => setGorusmeBitti(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
        >
          📵 Görüşmeyi Bitir
        </button>
      </div>

      {/* Ana alan */}
      <div className="flex flex-1 overflow-hidden">
        {/* Jitsi iframe */}
        <div className="flex-1 relative">
          {oda && (
            <iframe
              ref={iframeRef}
              src={`https://meet.jit.si/medirandevu-${oda.odaId}#userInfo.displayName="${encodeURIComponent(oda.displayAd)}"&config.prejoinPageEnabled=false&config.disableDeepLinking=true&config.startWithAudioMuted=false&config.startWithVideoMuted=false&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.TOOLBAR_BUTTONS=["microphone","camera","hangup","chat","tileview","settings"]`}
              allow="camera; microphone; fullscreen; display-capture"
              className="w-full h-full border-0"
              title="Video Görüşme"
            />
          )}
        </div>

        {/* Sağ panel — muayene notu (sadece doktora göster) */}
        {oda && !oda.isHasta && (
          <div className="w-72 bg-gray-800 border-l border-gray-700 flex flex-col p-4 shrink-0">
            <h3 className="text-white font-semibold text-sm mb-1">📋 Muayene Notu</h3>
            <p className="text-gray-400 text-xs mb-3">
              {oda.randevuBilgi.hastaAdi} · görüşme sırasında not al
            </p>
            <textarea
              value={notlar}
              onChange={e => setNotlar(e.target.value)}
              placeholder="Tanı, reçete, notlar..."
              rows={10}
              className="flex-1 bg-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 resize-none border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
            />
            <button
              onClick={notKaydet}
              disabled={!notlar.trim() || notKaydediliyor}
              className="mt-3 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {notKaydedildi ? '✓ Kaydedildi' : notKaydediliyor ? 'Kaydediliyor...' : 'Notu Kaydet'}
            </button>
            <p className="text-gray-500 text-xs mt-2 text-center">
              Not kaydedilince randevu detaylarında görünür
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
