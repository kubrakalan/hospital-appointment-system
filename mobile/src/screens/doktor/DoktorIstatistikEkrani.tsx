import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { api } from '../../api';

interface Istatistik {
  ozet: { toplamRandevu: number; tamamlanan: number; bekleyen: number; iptalEdilen: number; gelmedi: number };
  aylik: { ay: string; sayi: number }[];
  topHastalar: { hastaAdi: string; randevuSayisi: number }[];
}

export default function DoktorIstatistikEkrani() {
  const [istatistik, setIstatistik] = useState<Istatistik | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const data = await api.doktorIstatistikler();
      setIstatistik(data);
    } catch {
    } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  if (yukleniyor) return <View style={styles.orta}><ActivityIndicator size="large" color="#10b981" /></View>;
  if (!istatistik) return <View style={styles.orta}><Text style={styles.bosYazi}>Veri yüklenemedi.</Text></View>;

  const { ozet, aylik, topHastalar } = istatistik;
  const tamamlanmaOrani = ozet.toplamRandevu > 0
    ? Math.round((ozet.tamamlanan / ozet.toplamRandevu) * 100) : 0;
  const maxAylik = Math.max(...aylik.map((a: any) => a.sayi), 1);

  return (
    <ScrollView
      style={styles.kapsayici}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); yukle(); }} />}
    >
      {/* Özet kartlar */}
      <View style={styles.gridIkili}>
        {[
          { label: 'Toplam', deger: ozet.toplamRandevu, renk: '#0ea5e9' },
          { label: 'Tamamlanan', deger: ozet.tamamlanan, renk: '#10b981' },
          { label: 'Bekleyen', deger: ozet.bekleyen, renk: '#f59e0b' },
          { label: 'İptal', deger: ozet.iptalEdilen, renk: '#ef4444' },
        ].map(k => (
          <View key={k.label} style={[styles.ozetKart, { borderTopColor: k.renk }]}>
            <Text style={[styles.ozetSayi, { color: k.renk }]}>{k.deger}</Text>
            <Text style={styles.ozetLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      {/* Tamamlanma oranı */}
      <View style={styles.bolum}>
        <Text style={styles.bolumBaslik}>Tamamlanma Oranı</Text>
        <View style={styles.barArka}>
          <View style={[styles.barOn, { width: `${tamamlanmaOrani}%` }]} />
        </View>
        <Text style={styles.oranYazi}>%{tamamlanmaOrani}</Text>
      </View>

      {/* Aylık dağılım */}
      {aylik.length > 0 && (
        <View style={styles.bolum}>
          <Text style={styles.bolumBaslik}>Son 6 Ay</Text>
          {aylik.map(a => (
            <View key={a.ay} style={styles.aylikSatir}>
              <Text style={styles.ayYazi}>{a.ay}</Text>
              <View style={styles.ayBarArka}>
                <View style={[styles.ayBarOn, { width: `${(a.sayi / maxAylik) * 100}%` }]} />
              </View>
              <Text style={styles.ayliSayi}>{a.sayi}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Top hastalar */}
      {topHastalar.length > 0 && (
        <View style={styles.bolum}>
          <Text style={styles.bolumBaslik}>En Sık Gelen Hastalar</Text>
          {topHastalar.map((h, i) => (
            <View key={h.hastaAdi} style={styles.hastaKart}>
              <Text style={styles.hastaNo}>{i + 1}</Text>
              <Text style={styles.hastaAd}>{h.hastaAdi}</Text>
              <Text style={styles.hastaSayi}>{h.randevuSayisi} randevu</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1, backgroundColor: '#f0fdf4' },
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4' },
  bosYazi: { color: '#9ca3af', fontSize: 15 },
  gridIkili: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  ozetKart: {
    flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12,
    padding: 14, borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  ozetSayi: { fontSize: 26, fontWeight: '700' },
  ozetLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  bolum: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  bolumBaslik: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 },
  barArka: { height: 10, backgroundColor: '#e5e7eb', borderRadius: 5, overflow: 'hidden' },
  barOn: { height: 10, backgroundColor: '#10b981', borderRadius: 5 },
  oranYazi: { fontSize: 13, color: '#10b981', fontWeight: '700', marginTop: 6 },
  aylikSatir: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  ayYazi: { width: 40, fontSize: 12, color: '#6b7280' },
  ayBarArka: { flex: 1, height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  ayBarOn: { height: 8, backgroundColor: '#10b981', borderRadius: 4 },
  ayliSayi: { width: 24, fontSize: 12, color: '#374151', textAlign: 'right' },
  hastaKart: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 10 },
  hastaNo: { width: 22, height: 22, backgroundColor: '#10b981', borderRadius: 11, color: '#fff', fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 22 },
  hastaAd: { flex: 1, fontSize: 14, color: '#111827' },
  hastaSayi: { fontSize: 12, color: '#6b7280' },
});
