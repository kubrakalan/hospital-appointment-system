import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { api } from '../../api';
import { useTheme } from '../../ThemeContext';
import { saatFormatla, tarihFormatla } from '../../utils';

interface LabKayit {
  randevu: { RandevuID: number; DoktorAdi: string; UzmanlikAdi: string; RandevuTarihi: string; RandevuSaati: string };
  labNotu: string;
}

// Risk kelimeleri → renk/seviye
const RISK_YUKSEK = ['kritik', 'acil', 'tehlikeli', 'ciddi', 'yüksek risk', 'anormal', 'panik değer'];
const RISK_ORTA   = ['yüksek', 'düşük', 'elevated', 'low', 'high', 'borderline', 'sınırda', 'dikkat'];
const RISK_NORMAL = ['normal', 'negatif', 'negat', 'referans dahilinde', 'optimal'];

type RiskSeviye = 'yuksek' | 'orta' | 'normal' | 'belirsiz';

function riskHesapla(metin: string): RiskSeviye {
  const k = metin.toLowerCase();
  if (RISK_YUKSEK.some(s => k.includes(s))) return 'yuksek';
  if (RISK_ORTA.some(s => k.includes(s)))   return 'orta';
  if (RISK_NORMAL.some(s => k.includes(s)))  return 'normal';
  return 'belirsiz';
}

const RISK_RENK: Record<RiskSeviye, string> = {
  yuksek:   '#ef4444',
  orta:     '#f59e0b',
  normal:   '#10b981',
  belirsiz: '#6b7280',
};
const RISK_BG: Record<RiskSeviye, string> = {
  yuksek:   '#fef2f2',
  orta:     '#fffbeb',
  normal:   '#f0fdf4',
  belirsiz: '#f9fafb',
};
const RISK_ETIKET: Record<RiskSeviye, string> = {
  yuksek:   '🔴 Kritik / Anormal',
  orta:     '🟡 Dikkat Gerektiriyor',
  normal:   '🟢 Normal Sınırlar',
  belirsiz: '⚪ Sonuç Mevcut',
};
const RISK_ICON: Record<RiskSeviye, string> = {
  yuksek: '⚠️',
  orta:   '📋',
  normal: '✅',
  belirsiz: '🧪',
};

// Lab notunu satırlara böl ve her satırı analiz et
function satirlariAyir(metin: string) {
  return metin
    .split(/[\n;,]/)
    .map(s => s.trim())
    .filter(s => s.length > 2)
    .map(satir => {
      const risk = riskHesapla(satir);
      // Değer:Sonuç formatını yakala (örn. "Hemoglobin: 8.5 g/dL")
      const eslesme = satir.match(/^([^:=]+)[:\s=]+(.+)$/);
      return {
        ham: satir,
        isim: eslesme ? eslesme[1].trim() : satir,
        deger: eslesme ? eslesme[2].trim() : null,
        risk,
      };
    });
}

export default function LabSonuclariEkrani() {
  const { c } = useTheme();
  const [kayitlar, setKayitlar] = useState<LabKayit[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [acikKart, setAcikKart] = useState<number | null>(null);

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
      setYukleniyor(false);
      setYenileniyor(false);
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

  const kritikSayisi = kayitlar.filter(k => riskHesapla(k.labNotu) === 'yuksek').length;

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); yukle(); }} tintColor="#0ea5e9" />}
    >
      {/* Özet banner */}
      <View style={[styles.ozetBanner, { backgroundColor: kritikSayisi > 0 ? '#fef2f2' : '#f0fdf4', borderColor: kritikSayisi > 0 ? '#fca5a5' : '#86efac' }]}>
        <Text style={{ fontSize: 28 }}>{kritikSayisi > 0 ? '⚠️' : '✅'}</Text>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.ozetBaslik, { color: kritikSayisi > 0 ? '#dc2626' : '#16a34a' }]}>
            {kritikSayisi > 0 ? `${kritikSayisi} kritik / anormal sonuç` : 'Tüm sonuçlar incelendi'}
          </Text>
          <Text style={[styles.ozetAlt, { color: kritikSayisi > 0 ? '#ef4444' : '#10b981' }]}>
            {kayitlar.length} randevudan {kayitlar.length} lab raporu · Doktorunuzla görüşün
          </Text>
        </View>
      </View>

      {kayitlar.map(({ randevu, labNotu }) => {
        const genelRisk = riskHesapla(labNotu);
        const satirlar = satirlariAyir(labNotu);
        const renkKod = RISK_RENK[genelRisk];
        const bgKod   = RISK_BG[genelRisk];
        const acik    = acikKart === randevu.RandevuID;

        return (
          <View key={randevu.RandevuID} style={[styles.kart, { backgroundColor: c.card, borderLeftColor: renkKod }]}>
            {/* Kart başlığı */}
            <TouchableOpacity
              style={styles.kartUst}
              onPress={() => setAcikKart(acik ? null : randevu.RandevuID)}
              activeOpacity={0.7}
            >
              <View style={[styles.riskIkonKutu, { backgroundColor: bgKod }]}>
                <Text style={{ fontSize: 22 }}>{RISK_ICON[genelRisk]}</Text>
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
                <Text style={{ color: c.textFaint, fontSize: 18 }}>{acik ? '▲' : '▼'}</Text>
              </View>
            </TouchableOpacity>

            {/* Detay (açılır) */}
            {acik && (
              <View style={[styles.detay, { borderTopColor: c.border }]}>
                <Text style={[styles.detayBaslik, { color: c.textMuted }]}>🔬 Tahlil Sonuçları</Text>

                {satirlar.map((satir, i) => {
                  const sRenk = RISK_RENK[satir.risk];
                  const sBg   = RISK_BG[satir.risk];
                  const riskliMi = satir.risk === 'yuksek' || satir.risk === 'orta';
                  return (
                    <View
                      key={i}
                      style={[
                        styles.satirKutu,
                        { backgroundColor: riskliMi ? sBg : c.surface, borderColor: riskliMi ? sRenk : c.border },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        {satir.deger ? (
                          <>
                            <Text style={[styles.satirIsim, { color: riskliMi ? sRenk : c.textMuted }]}>
                              {satir.isim}
                            </Text>
                            <Text style={[styles.satirDeger, { color: riskliMi ? sRenk : c.text }]}>
                              {satir.deger}
                            </Text>
                          </>
                        ) : (
                          <Text style={[styles.satirTam, { color: riskliMi ? sRenk : c.text }]}>
                            {satir.ham}
                          </Text>
                        )}
                      </View>
                      {riskliMi && (
                        <View style={[styles.riskDot, { backgroundColor: sRenk }]} />
                      )}
                    </View>
                  );
                })}

                {/* Ham metin (yedek) */}
                {satirlar.length <= 1 && (
                  <Text style={[styles.hamMetin, { color: c.text }]}>{labNotu}</Text>
                )}

                {genelRisk === 'yuksek' && (
                  <View style={styles.uyariBanner}>
                    <Text style={styles.uyariYazi}>⚠️ Bu sonuçlar için doktorunuzu arayın veya en kısa sürede kontrol randevusu alın.</Text>
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
    borderRadius: 14, padding: 16, marginBottom: 16,
    borderWidth: 1,
  },
  ozetBaslik: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  ozetAlt: { fontSize: 12 },

  kart: {
    borderRadius: 16, marginBottom: 14, overflow: 'hidden',
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  kartUst: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  riskIkonKutu: { width: 46, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  doktorAd: { fontSize: 14, fontWeight: '700' },
  uzmanlik: { fontSize: 12, marginTop: 2, marginBottom: 6 },
  riskBadge: {
    alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1,
  },
  riskBadgeYazi: { fontSize: 11, fontWeight: '700' },
  tarih: { fontSize: 12, fontWeight: '600' },
  saat: { fontSize: 11 },

  detay: { borderTopWidth: 1, padding: 14, gap: 8 },
  detayBaslik: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },

  satirKutu: {
    borderRadius: 10, padding: 10, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  satirIsim: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  satirDeger: { fontSize: 14, fontWeight: '700' },
  satirTam: { fontSize: 13, lineHeight: 20 },
  riskDot: { width: 8, height: 8, borderRadius: 4 },
  hamMetin: { fontSize: 13, lineHeight: 22 },

  uyariBanner: {
    backgroundColor: '#fef2f2', borderRadius: 10, padding: 12, marginTop: 4,
    borderLeftWidth: 3, borderLeftColor: '#ef4444',
  },
  uyariYazi: { fontSize: 12, color: '#dc2626', lineHeight: 18, fontWeight: '600' },
});
