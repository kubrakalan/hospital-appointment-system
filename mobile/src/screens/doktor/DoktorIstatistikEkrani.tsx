import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import { api } from '../../api';
import { useTheme } from '../../ThemeContext';

interface Ozet {
  toplamRandevu: number; tamamlanan: number; bekleyen: number;
  iptalEdilen: number; gelmedi: number; benzersizHasta: number;
  bugun: number; son30Gun: number; onaylandi: number;
}
interface Istatistik {
  ozet: Ozet;
  aylik: { ay: string; sayi: number; tamamlanan: number }[];
  topHastalar: { hastaAdi: string; randevuSayisi: number }[];
}

export default function DoktorIstatistikEkrani() {
  const { c } = useTheme();
  const [istatistik, setIstatistik] = useState<Istatistik | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [hata, setHata] = useState(false);

  const yukle = useCallback(async () => {
    setHata(false);
    try {
      const data = await api.doktorIstatistikler();
      setIstatistik(data);
    } catch {
      setHata(true);
    } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  if (yukleniyor) {
    return (
      <View style={[styles.orta, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (hata || !istatistik) {
    return (
      <View style={[styles.orta, { backgroundColor: c.bg }]}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
        <Text style={[styles.bosYazi, { color: c.textMuted }]}>Veri yüklenemedi</Text>
        <TouchableOpacity
          style={[styles.retryButon, { backgroundColor: '#10b981' }]}
          onPress={() => { setYukleniyor(true); yukle(); }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { ozet, aylik, topHastalar } = istatistik;
  const tamamlanmaOrani = ozet.toplamRandevu > 0
    ? Math.round((ozet.tamamlanan / ozet.toplamRandevu) * 100) : 0;
  const maxAylik = Math.max(...aylik.map(a => a.sayi), 1);

  const ozetKartlar = [
    { label: 'Toplam', deger: ozet.toplamRandevu, renk: '#0ea5e9', emj: '📊' },
    { label: 'Tamamlanan', deger: ozet.tamamlanan, renk: '#10b981', emj: '✅' },
    { label: 'Bekleyen', deger: ozet.bekleyen, renk: '#f59e0b', emj: '⏳' },
    { label: 'İptal', deger: ozet.iptalEdilen, renk: '#ef4444', emj: '❌' },
    { label: 'Gelmedi', deger: ozet.gelmedi, renk: '#f97316', emj: '🚫' },
    { label: 'Benzersiz Hasta', deger: ozet.benzersizHasta, renk: '#6366f1', emj: '👥' },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={yenileniyor}
          onRefresh={() => { setYenileniyor(true); yukle(); }}
          tintColor="#10b981"
        />
      }
    >
      {/* Bugün & Son 30 gün banner */}
      <View style={[styles.bannerKart, { backgroundColor: '#10b981' }]}>
        <View style={styles.bannerIkili}>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.bannerSayi}>{ozet.bugun}</Text>
            <Text style={styles.bannerEtiket}>Bugün</Text>
          </View>
          <View style={[styles.bannerAyrac]} />
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.bannerSayi}>{ozet.son30Gun}</Text>
            <Text style={styles.bannerEtiket}>Son 30 Gün</Text>
          </View>
          <View style={styles.bannerAyrac} />
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.bannerSayi}>{ozet.benzersizHasta}</Text>
            <Text style={styles.bannerEtiket}>Toplam Hasta</Text>
          </View>
        </View>
      </View>

      {/* 6'lı özet grid */}
      <View style={styles.gridIkili}>
        {ozetKartlar.map(k => (
          <View key={k.label} style={[styles.ozetKart, { backgroundColor: c.card, borderTopColor: k.renk }]}>
            <Text style={{ fontSize: 20, marginBottom: 4 }}>{k.emj}</Text>
            <Text style={[styles.ozetSayi, { color: k.renk }]}>{k.deger}</Text>
            <Text style={[styles.ozetLabel, { color: c.textMuted }]}>{k.label}</Text>
          </View>
        ))}
      </View>

      {/* Tamamlanma oranı */}
      <View style={[styles.bolum, { backgroundColor: c.card }]}>
        <Text style={[styles.bolumBaslik, { color: c.text }]}>Tamamlanma Oranı</Text>
        <View style={[styles.barArka, { backgroundColor: c.border }]}>
          <View style={[styles.barOn, { width: `${tamamlanmaOrani}%` }]} />
        </View>
        <Text style={[styles.oranYazi, { color: '#10b981' }]}>
          %{tamamlanmaOrani} · {ozet.tamamlanan}/{ozet.toplamRandevu} randevu tamamlandı
        </Text>
      </View>

      {/* Aylık dağılım */}
      {aylik.length > 0 && (
        <View style={[styles.bolum, { backgroundColor: c.card }]}>
          <Text style={[styles.bolumBaslik, { color: c.text }]}>📈 Son 6 Ay</Text>
          {aylik.map(a => (
            <View key={a.ay} style={styles.aylikSatir}>
              <Text style={[styles.ayYazi, { color: c.textMuted }]}>{a.ay.slice(5)}/{a.ay.slice(2, 4)}</Text>
              <View style={[styles.ayBarArka, { backgroundColor: c.border }]}>
                <View style={[styles.ayBarOn, { width: `${(a.sayi / maxAylik) * 100}%` }]} />
              </View>
              <Text style={[styles.ayliSayi, { color: c.text }]}>{a.sayi}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Top hastalar */}
      {topHastalar.length > 0 && (
        <View style={[styles.bolum, { backgroundColor: c.card }]}>
          <Text style={[styles.bolumBaslik, { color: c.text }]}>🏆 En Sık Gelen Hastalar</Text>
          {topHastalar.map((h, i) => (
            <View key={h.hastaAdi} style={[styles.hastaKart, { borderBottomColor: c.border }]}>
              <View style={[styles.hastaNo, { backgroundColor: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : '#cd7c32' }]}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{i + 1}</Text>
              </View>
              <Text style={[styles.hastaAd, { color: c.text }]}>{h.hastaAdi}</Text>
              <Text style={[styles.hastaSayi, { color: c.textMuted }]}>{h.randevuSayisi} randevu</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bosYazi: { fontSize: 15, marginBottom: 16 },
  retryButon: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },

  bannerKart: { borderRadius: 16, padding: 20, marginBottom: 16 },
  bannerIkili: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  bannerSayi: { color: '#fff', fontSize: 28, fontWeight: '800' },
  bannerEtiket: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },
  bannerAyrac: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.3)' },

  gridIkili: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  ozetKart: {
    width: '31%', borderRadius: 12, padding: 12, borderTopWidth: 3,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  ozetSayi: { fontSize: 22, fontWeight: '800' },
  ozetLabel: { fontSize: 11, marginTop: 2, textAlign: 'center' },

  bolum: {
    borderRadius: 14, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  bolumBaslik: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  barArka: { height: 10, borderRadius: 5, overflow: 'hidden' },
  barOn: { height: 10, backgroundColor: '#10b981', borderRadius: 5 },
  oranYazi: { fontSize: 12, fontWeight: '700', marginTop: 8 },

  aylikSatir: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  ayYazi: { width: 40, fontSize: 12 },
  ayBarArka: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  ayBarOn: { height: 8, backgroundColor: '#10b981', borderRadius: 4 },
  ayliSayi: { width: 24, fontSize: 12, textAlign: 'right' },

  hastaKart: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 12 },
  hastaNo: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  hastaAd: { flex: 1, fontSize: 14 },
  hastaSayi: { fontSize: 12 },
});
