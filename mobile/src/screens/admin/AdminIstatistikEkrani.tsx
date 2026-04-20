import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { api } from '../../api';

export default function AdminIstatistikEkrani() {
  const [ist, setIst] = useState<any>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  async function yukle() {
    try { setIst(await api.adminIstatistikler()); } catch { } finally { setYukleniyor(false); setYenileniyor(false); }
  }

  useEffect(() => { yukle(); }, []);

  if (yukleniyor) return <View style={styles.orta}><ActivityIndicator size="large" color="#8b5cf6" /></View>;

  const kartlar = [
    { ikon: '📅', etiket: 'Toplam Randevu', deger: ist?.toplamRandevu ?? 0, renk: '#8b5cf6' },
    { ikon: '⏳', etiket: 'Bekleyen', deger: ist?.bekleyen ?? 0, renk: '#f59e0b' },
    { ikon: '✅', etiket: 'Tamamlanan', deger: ist?.tamamlanan ?? 0, renk: '#10b981' },
    { ikon: '👥', etiket: 'Toplam Hasta', deger: ist?.toplamHasta ?? 0, renk: '#0ea5e9' },
    { ikon: '👨‍⚕️', etiket: 'Toplam Doktor', deger: ist?.toplamDoktor ?? 0, renk: '#ec4899' },
    { ikon: '❌', etiket: 'İptal', deger: ist?.iptalEdilen ?? 0, renk: '#ef4444' },
  ];

  return (
    <ScrollView
      style={styles.kapsayici}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); yukle(); }} />}
    >
      <Text style={styles.baslik}>Genel İstatistikler</Text>
      <View style={styles.grid}>
        {kartlar.map(k => (
          <View key={k.etiket} style={[styles.kart, { borderTopColor: k.renk }]}>
            <Text style={styles.kartIkon}>{k.ikon}</Text>
            <Text style={[styles.kartSayi, { color: k.renk }]}>{k.deger}</Text>
            <Text style={styles.kartEtiket}>{k.etiket}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1, backgroundColor: '#faf5ff' },
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  baslik: { fontSize: 17, fontWeight: '700', color: '#374151', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kart: {
    width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderTopWidth: 3, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  kartIkon: { fontSize: 28, marginBottom: 6 },
  kartSayi: { fontSize: 28, fontWeight: '700' },
  kartEtiket: { fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 2 },
});
