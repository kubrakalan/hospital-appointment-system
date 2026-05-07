import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { api } from '../../api';
import { useTheme } from '../../ThemeContext';
import { saatFormatla, tarihFormatla } from '../../utils';

interface LabKayit {
  randevu: {
    RandevuID: number; DoktorAdi: string; UzmanlikAdi: string;
    RandevuTarihi: string; RandevuSaati: string;
  };
  labNotu: string;
}

interface LabSatir {
  isim: string;
  deger: string;
  birim: string;
  referans: string;
  durum: string;
  risk: 'kritik' | 'yuksek' | 'normal' | 'belirsiz';
  // referans min/max sayısal (opsiyonel, bar için)
  refMin?: number;
  refMax?: number;
  degerSayi?: number;
}

// "Ad|deger|birim|ref|durum" formatını parse et
function labSatiriParse(satir: string): LabSatir | null {
  const parcalar = satir.split('|');
  if (parcalar.length >= 4) {
    const isim    = parcalar[0].trim();
    const deger   = parcalar[1].trim();
    const birim   = parcalar[2].trim();
    const referans = parcalar[3].trim();
    const durum   = parcalar[4]?.trim() ?? '';

    const durumKucuk = durum.toLowerCase();
    let risk: LabSatir['risk'] = 'belirsiz';
    if (durumKucuk.includes('kritik') || durumKucuk.includes('tehlikeli')) risk = 'kritik';
    else if (durumKucuk.includes('yüksek') || durumKucuk.includes('yuksek') || durumKucuk.includes('anormal') || durumKucuk.includes('risk') || durumKucuk.includes('bozuk') || durumKucuk.includes('inflamasyon')) risk = 'yuksek';
    else if (durumKucuk.includes('normal')) risk = 'normal';

    // Referans aralığı parse (örn: "12.0-16.0")
    let refMin: number | undefined, refMax: number | undefined, degerSayi: number | undefined;
    const refEslesmesi = referans.match(/([\d.]+)-([\d.]+)/);
    if (refEslesmesi) {
      refMin = parseFloat(refEslesmesi[1]);
      refMax = parseFloat(refEslesmesi[2]);
    }
    const degerSayi_ = parseFloat(deger.replace(',', '.'));
    if (!isNaN(degerSayi_)) degerSayi = degerSayi_;

    return { isim, deger, birim, referans, durum, risk, refMin, refMax, degerSayi };
  }

  // Eski format fallback: "Ad: deger (durum)"
  const eskiEslesmesi = satir.match(/^([^:]+):\s*(.+?)(?:\s*\((.+)\))?$/);
  if (eskiEslesmesi) {
    const durum = eskiEslesmesi[3] ?? '';
    const durumKucuk = durum.toLowerCase();
    let risk: LabSatir['risk'] = 'belirsiz';
    if (durumKucuk.includes('kritik') || durumKucuk.includes('tehlikeli')) risk = 'kritik';
    else if (durumKucuk.includes('yüksek') || durumKucuk.includes('anormal') || durumKucuk.includes('risk')) risk = 'yuksek';
    else if (durumKucuk.includes('normal')) risk = 'normal';
    return { isim: eskiEslesmesi[1].trim(), deger: eskiEslesmesi[2].trim(), birim: '', referans: '', durum, risk };
  }
  return null;
}

function labNotunuParse(metin: string): LabSatir[] {
  return metin
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 2)
    .map(labSatiriParse)
    .filter((s): s is LabSatir => s !== null);
}

function genelRiskHesapla(satirlar: LabSatir[]): 'kritik' | 'yuksek' | 'normal' | 'belirsiz' {
  if (satirlar.some(s => s.risk === 'kritik')) return 'kritik';
  if (satirlar.some(s => s.risk === 'yuksek')) return 'yuksek';
  if (satirlar.every(s => s.risk === 'normal')) return 'normal';
  return 'belirsiz';
}

const RISK_RENK = { kritik: '#ef4444', yuksek: '#f59e0b', normal: '#10b981', belirsiz: '#6b7280' };
const RISK_BG   = { kritik: '#fef2f2', yuksek: '#fffbeb', normal: '#f0fdf4', belirsiz: '#f9fafb' };
const RISK_ETIKET = {
  kritik:   '🔴 Kritik / Tehlikeli',
  yuksek:   '🟡 Anormal / Dikkat',
  normal:   '🟢 Normal Sınırlar',
  belirsiz: '⚪ Sonuç Mevcut',
};

// Bar pozisyon hesabı (0-100 arası %)
function barPozisyon(deger: number, min: number, max: number): number {
  const aralik = max - min;
  const gosterimMin = min - aralik * 0.3;
  const gosterimMax = max + aralik * 0.3;
  return Math.min(100, Math.max(0, ((deger - gosterimMin) / (gosterimMax - gosterimMin)) * 100));
}

export default function LabSonuclariEkrani() {
  const { c } = useTheme();
  const [kayitlar, setKayitlar]   = useState<LabKayit[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [acikKart, setAcikKart]   = useState<number | null>(null);

  const yukle = useCallback(async () => {
    try {
      const randevular = await api.randevularim();
      const tamamlananlar = Array.isArray(randevular)
        ? randevular.filter((r: any) => r.Durum === 'Tamamlandı' || r.Durum === 'Gelmedi')
        : [];
      const sonuclar = await Promise.allSettled(
        tamamlananlar.map(async (rv: any) => {
          const tibbi = await api.tibbiBilgiHasta(rv.RandevuID);
          return { randevu: rv, labNotu: tibbi?.LabNotu };
        })
      );
      setKayitlar(
        sonuclar
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && !!r.value.labNotu)
          .map(r => r.value)
      );
    } catch { } finally {
      setYukleniyor(false); setYenileniyor(false);
    }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  if (yukleniyor) return (
    <View style={[styles.orta, { backgroundColor: c.bg }]}>
      <ActivityIndicator size="large" color="#0ea5e9" />
    </View>
  );

  if (kayitlar.length === 0) return (
    <View style={[styles.orta, { backgroundColor: c.bg }]}>
      <Text style={styles.bosEmoji}>🧪</Text>
      <Text style={[styles.bosYazi, { color: c.text }]}>Lab sonucu bulunamadı</Text>
      <Text style={[styles.bosAlt, { color: c.textFaint }]}>Doktorunuz tahlil notu ekledikçe burada görünür.</Text>
    </View>
  );

  const kritikSayisi = kayitlar.filter(k => {
    const s = labNotunuParse(k.labNotu);
    return genelRiskHesapla(s) === 'kritik';
  }).length;

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); yukle(); }} tintColor="#0ea5e9" />}
    >
      {/* Özet banner */}
      <View style={[styles.ozetBanner, {
        backgroundColor: kritikSayisi > 0 ? '#fef2f2' : '#f0fdf4',
        borderColor: kritikSayisi > 0 ? '#fca5a5' : '#86efac',
      }]}>
        <Text style={{ fontSize: 28 }}>{kritikSayisi > 0 ? '⚠️' : '✅'}</Text>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.ozetBaslik, { color: kritikSayisi > 0 ? '#dc2626' : '#16a34a' }]}>
            {kritikSayisi > 0 ? `${kritikSayisi} kritik sonuç mevcut` : 'Tüm sonuçlar incelendi'}
          </Text>
          <Text style={[styles.ozetAlt, { color: kritikSayisi > 0 ? '#ef4444' : '#10b981' }]}>
            {kayitlar.length} tahlil raporu · Doktorunuzla paylaşın
          </Text>
        </View>
      </View>

      {kayitlar.map(({ randevu, labNotu }) => {
        const satirlar  = labNotunuParse(labNotu);
        const genelRisk = genelRiskHesapla(satirlar);
        const renkKod   = RISK_RENK[genelRisk];
        const bgKod     = RISK_BG[genelRisk];
        const acik      = acikKart === randevu.RandevuID;
        const kritikSayisiKart = satirlar.filter(s => s.risk === 'kritik').length;
        const anormalSayisi    = satirlar.filter(s => s.risk === 'yuksek').length;

        return (
          <View key={randevu.RandevuID} style={[styles.kart, { backgroundColor: c.card, borderLeftColor: renkKod }]}>

            {/* Başlık satırı */}
            <TouchableOpacity style={styles.kartUst} onPress={() => setAcikKart(acik ? null : randevu.RandevuID)} activeOpacity={0.7}>
              <View style={[styles.riskIkon, { backgroundColor: bgKod }]}>
                <Text style={{ fontSize: 22 }}>🧪</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.doktorAd, { color: c.text }]}>Dr. {randevu.DoktorAdi}</Text>
                <Text style={[styles.uzmanlik, { color: c.textMuted }]}>{randevu.UzmanlikAdi}</Text>
                <View style={[styles.riskBadge, { backgroundColor: bgKod, borderColor: renkKod }]}>
                  <Text style={[styles.riskBadgeYazi, { color: renkKod }]}>{RISK_ETIKET[genelRisk]}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={[styles.tarih, { color: c.textMuted }]}>{tarihFormatla(randevu.RandevuTarihi)}</Text>
                <Text style={[styles.saat, { color: c.textFaint }]}>{saatFormatla(randevu.RandevuSaati)}</Text>
                <Text style={{ color: c.textFaint, fontSize: 16 }}>{acik ? '▲' : '▼'}</Text>
              </View>
            </TouchableOpacity>

            {/* Özet sayaçlar (kapalıyken) */}
            {!acik && (kritikSayisiKart > 0 || anormalSayisi > 0) && (
              <View style={[styles.ozet, { borderTopColor: c.border }]}>
                {kritikSayisiKart > 0 && (
                  <View style={styles.ozetCip}>
                    <Text style={styles.ozetCipYazi}>🔴 {kritikSayisiKart} kritik</Text>
                  </View>
                )}
                {anormalSayisi > 0 && (
                  <View style={[styles.ozetCip, { backgroundColor: '#fffbeb' }]}>
                    <Text style={[styles.ozetCipYazi, { color: '#d97706' }]}>🟡 {anormalSayisi} anormal</Text>
                  </View>
                )}
                <Text style={[{ fontSize: 11, color: c.textFaint, marginLeft: 4 }]}>
                  · {satirlar.length} test
                </Text>
              </View>
            )}

            {/* Detay tablosu (açıkken) */}
            {acik && (
              <View style={[styles.detay, { borderTopColor: c.border }]}>
                <Text style={[styles.detayBaslik, { color: c.textMuted }]}>📋 Tahlil Sonuçları</Text>

                {satirlar.map((satir, i) => {
                  const sRenk = RISK_RENK[satir.risk];
                  const sBg   = RISK_BG[satir.risk];
                  const riskliMi = satir.risk === 'kritik' || satir.risk === 'yuksek';

                  // Bar göstergesi için pozisyon
                  let barPos: number | null = null;
                  if (satir.degerSayi !== undefined && satir.refMin !== undefined && satir.refMax !== undefined) {
                    barPos = barPozisyon(satir.degerSayi, satir.refMin, satir.refMax);
                  }

                  return (
                    <View key={i} style={[styles.satirKart, {
                      backgroundColor: riskliMi ? sBg : c.surface,
                      borderColor: riskliMi ? sRenk : c.border,
                    }]}>
                      {/* Test adı + durum */}
                      <View style={styles.satirUst}>
                        <Text style={[styles.satirIsim, { color: riskliMi ? sRenk : c.text }]}>
                          {satir.isim}
                        </Text>
                        {satir.durum ? (
                          <View style={[styles.durumBadge, { backgroundColor: riskliMi ? sRenk + '22' : '#f0fdf4' }]}>
                            <Text style={[styles.durumBadgeYazi, { color: riskliMi ? sRenk : '#10b981' }]}>
                              {satir.risk === 'kritik' ? '🔴' : satir.risk === 'yuksek' ? '🟡' : '🟢'} {satir.durum}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Değer karşılaştırma */}
                      <View style={styles.satirOrta}>
                        <View>
                          <Text style={[styles.degerEtiket, { color: c.textFaint }]}>Sonucunuz</Text>
                          <Text style={[styles.degerYazi, { color: riskliMi ? sRenk : '#10b981' }]}>
                            {satir.deger} <Text style={styles.birimYazi}>{satir.birim}</Text>
                          </Text>
                        </View>
                        {satir.referans ? (
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.degerEtiket, { color: c.textFaint }]}>Normal Aralık</Text>
                            <Text style={[styles.referansYazi, { color: c.textMuted }]}>
                              {satir.referans} {satir.birim}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Görsel bar */}
                      {barPos !== null && satir.refMin !== undefined && satir.refMax !== undefined && (
                        <View style={styles.barKapsayici}>
                          {/* Normal bölge */}
                          <View style={[styles.barArka, { backgroundColor: c.border }]}>
                            <View style={styles.normalBolge} />
                          </View>
                          {/* Değer işaretçisi */}
                          <View style={[styles.isaret, { left: `${barPos}%` as any, backgroundColor: sRenk }]} />
                          <View style={styles.barEtiketler}>
                            <Text style={[styles.barEtiket, { color: c.textFaint }]}>Düşük</Text>
                            <Text style={[styles.barEtiket, { color: '#10b981' }]}>Normal</Text>
                            <Text style={[styles.barEtiket, { color: c.textFaint }]}>Yüksek</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* Kritik uyarı */}
                {genelRisk === 'kritik' && (
                  <View style={styles.uyariBanner}>
                    <Text style={styles.uyariYazi}>
                      ⚠️ Kritik değerler tespit edildi. Lütfen en kısa sürede doktorunuzla iletişime geçin.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  bosEmoji: { fontSize: 52, marginBottom: 12 },
  bosYazi: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  bosAlt: { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  ozetBanner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1,
  },
  ozetBaslik: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  ozetAlt: { fontSize: 12 },

  kart: {
    borderRadius: 16, marginBottom: 14, overflow: 'hidden',
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  kartUst: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  riskIkon: { width: 46, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  doktorAd: { fontSize: 14, fontWeight: '700' },
  uzmanlik: { fontSize: 12, marginTop: 2, marginBottom: 6 },
  riskBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  riskBadgeYazi: { fontSize: 11, fontWeight: '700' },
  tarih: { fontSize: 12, fontWeight: '600' },
  saat: { fontSize: 11 },

  ozet: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  ozetCip: { backgroundColor: '#fef2f2', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6 },
  ozetCipYazi: { fontSize: 11, fontWeight: '700', color: '#dc2626' },

  detay: { borderTopWidth: 1, padding: 14, gap: 10 },
  detayBaslik: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },

  satirKart: {
    borderRadius: 12, padding: 12, borderWidth: 1, gap: 8,
  },
  satirUst: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  satirIsim: { fontSize: 14, fontWeight: '700', flex: 1 },
  durumBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  durumBadgeYazi: { fontSize: 11, fontWeight: '600' },

  satirOrta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  degerEtiket: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  degerYazi: { fontSize: 22, fontWeight: '800' },
  birimYazi: { fontSize: 12, fontWeight: '500' },
  referansYazi: { fontSize: 14, fontWeight: '600' },

  barKapsayici: { marginTop: 4 },
  barArka: { height: 8, borderRadius: 4, overflow: 'hidden', position: 'relative' },
  normalBolge: {
    position: 'absolute', left: '23%', right: '23%', top: 0, bottom: 0,
    backgroundColor: '#10b98130', borderRadius: 4,
  },
  isaret: {
    position: 'absolute', width: 12, height: 12, borderRadius: 6,
    top: -2, marginLeft: -6, borderWidth: 2, borderColor: '#fff',
  },
  barEtiketler: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  barEtiket: { fontSize: 9, fontWeight: '600' },

  uyariBanner: {
    backgroundColor: '#fef2f2', borderRadius: 10, padding: 12, marginTop: 4,
    borderLeftWidth: 3, borderLeftColor: '#ef4444',
  },
  uyariYazi: { fontSize: 12, color: '#dc2626', lineHeight: 18, fontWeight: '600' },
});
