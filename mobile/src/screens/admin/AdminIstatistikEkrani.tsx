import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { api } from '../../api';
import { useTheme } from '../../theme';
import { SkeletonBox } from '../../components/Skeleton';

export default function AdminIstatistikEkrani() {
  const { c } = useTheme();
  const [ist, setIst] = useState<any>(null);
  const [gunluk, setGunluk] = useState<any[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  async function yukle() {
    try {
      const [istData, gunlukData] = await Promise.all([
        api.adminIstatistikler(),
        api.adminGunlukIstatistik().catch(() => []),
      ]);
      setIst(istData);
      setGunluk(Array.isArray(gunlukData) ? gunlukData.slice(0, 7) : []);
    } catch { }
    finally { setYukleniyor(false); setYenileniyor(false); }
  }

  useEffect(() => { yukle(); }, []);

  if (yukleniyor) {
    return (
      <ScrollView style={[styles.kapsayici, { backgroundColor: c.bg }]} contentContainerStyle={{ padding: 16, gap: 12 }}>
        {[1,2,3,4,5,6].map(i => (
          <View key={i} style={[styles.skeletonKart, { backgroundColor: c.card }]}>
            <SkeletonBox width={40} height={40} borderRadius={12} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonBox width="50%" height={22} />
              <SkeletonBox width="70%" height={12} />
            </View>
          </View>
        ))}
      </ScrollView>
    );
  }

  const kartlar = [
    { ikon: '📅', etiket: 'Toplam Randevu', deger: ist?.toplamRandevu ?? 0, renk: '#8b5cf6' },
    { ikon: '⏳', etiket: 'Bekleyen', deger: ist?.bekleyen ?? 0, renk: '#f59e0b' },
    { ikon: '✅', etiket: 'Tamamlanan', deger: ist?.tamamlanan ?? 0, renk: '#10b981' },
    { ikon: '❌', etiket: 'İptal Edilen', deger: ist?.iptalEdilen ?? 0, renk: '#ef4444' },
    { ikon: '👥', etiket: 'Toplam Hasta', deger: ist?.toplamHasta ?? 0, renk: '#0ea5e9' },
    { ikon: '👨‍⚕️', etiket: 'Toplam Doktor', deger: ist?.toplamDoktor ?? 0, renk: '#ec4899' },
  ];

  const tamamlanmaOrani = ist?.toplamRandevu > 0
    ? Math.round((ist.tamamlanan / ist.toplamRandevu) * 100) : 0;

  return (
    <ScrollView
      style={[styles.kapsayici, { backgroundColor: c.bg }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); yukle(); }} tintColor="#8b5cf6" />}
    >
      {/* Ana istatistik grid */}
      <Text style={[styles.baslik, { color: c.text }]}>Genel Bakış</Text>
      <View style={styles.grid}>
        {kartlar.map(k => (
          <View key={k.etiket} style={[styles.kart, { backgroundColor: c.card, borderTopColor: k.renk }]}>
            <Text style={styles.kartIkon}>{k.ikon}</Text>
            <Text style={[styles.kartSayi, { color: k.renk }]}>{k.deger}</Text>
            <Text style={[styles.kartEtiket, { color: c.textMuted }]}>{k.etiket}</Text>
          </View>
        ))}
      </View>

      {/* Tamamlanma oranı */}
      <View style={[styles.oraniKart, { backgroundColor: c.card }]}>
        <View style={styles.oraniUst}>
          <Text style={[styles.oraniBaslik, { color: c.text }]}>Tamamlanma Oranı</Text>
          <Text style={[styles.oraniYuzde, { color: tamamlanmaOrani >= 70 ? '#10b981' : '#f59e0b' }]}>
            %{tamamlanmaOrani}
          </Text>
        </View>
        <View style={[styles.oraniBar, { backgroundColor: c.border }]}>
          <View style={[styles.oraniFill, {
            width: `${tamamlanmaOrani}%` as any,
            backgroundColor: tamamlanmaOrani >= 70 ? '#10b981' : '#f59e0b',
          }]} />
        </View>
        <Text style={[styles.oraniAciklama, { color: c.textFaint }]}>
          {ist?.tamamlanan ?? 0} tamamlandı / {ist?.toplamRandevu ?? 0} toplam
        </Text>
      </View>

      {/* Günlük tablo */}
      {gunluk.length > 0 && (
        <>
          <Text style={[styles.baslik, { color: c.text, marginTop: 8 }]}>Son 7 Gün</Text>
          <View style={[styles.gunlukKart, { backgroundColor: c.card }]}>
            {gunluk.map((g, i) => (
              <View key={i} style={[styles.gunlukSatir, i < gunluk.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border }]}>
                <Text style={[styles.gunlukTarih, { color: c.textMuted }]}>
                  {g.Tarih?.split('T')[0] ?? g.tarih ?? '—'}
                </Text>
                <View style={styles.gunlukSagSatir}>
                  <View style={styles.gunlukChip}>
                    <Text style={styles.gunlukChipYazi}>{g.ToplamRandevu ?? g.toplamRandevu ?? 0}</Text>
                    <Text style={[styles.gunlukChipEtiket, { color: c.textFaint }]}>randevu</Text>
                  </View>
                  <View style={[styles.gunlukChip, { backgroundColor: '#dcfce7' }]}>
                    <Text style={[styles.gunlukChipYazi, { color: '#15803d' }]}>{g.Tamamlanan ?? g.tamamlanan ?? 0}</Text>
                    <Text style={[styles.gunlukChipEtiket, { color: '#15803d' }]}>tamam</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Top hastalar */}
      {ist?.topHastalar?.length > 0 && (
        <>
          <Text style={[styles.baslik, { color: c.text, marginTop: 8 }]}>En Çok Randevu Alan Hastalar</Text>
          <View style={[styles.gunlukKart, { backgroundColor: c.card }]}>
            {ist.topHastalar.map((h: any, i: number) => (
              <View key={i} style={[styles.gunlukSatir, i < ist.topHastalar.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border }]}>
                <View style={styles.siraNumara}>
                  <Text style={styles.siraNumaraYazi}>{i + 1}</Text>
                </View>
                <Text style={[styles.hastaAdYazi, { color: c.text, flex: 1 }]}>{h.HastaAdi ?? h.hastaAdi}</Text>
                <Text style={[styles.sayi, { color: '#8b5cf6' }]}>{h.randevuSayisi ?? h.toplamRandevu} randevu</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  baslik: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  kart: {
    width: '47%', borderRadius: 14, padding: 14,
    borderTopWidth: 3, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  kartIkon: { fontSize: 26, marginBottom: 6 },
  kartSayi: { fontSize: 28, fontWeight: '700' },
  kartEtiket: { fontSize: 11, textAlign: 'center', marginTop: 2 },
  skeletonKart: {
    borderRadius: 14, padding: 16, flexDirection: 'row',
    alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  oraniKart: {
    borderRadius: 14, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  oraniUst: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  oraniBaslik: { fontSize: 14, fontWeight: '600' },
  oraniYuzde: { fontSize: 22, fontWeight: '800' },
  oraniBar: { height: 8, borderRadius: 4, marginBottom: 8, overflow: 'hidden' },
  oraniFill: { height: '100%', borderRadius: 4 },
  oraniAciklama: { fontSize: 11 },
  gunlukKart: {
    borderRadius: 14, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
    overflow: 'hidden',
  },
  gunlukSatir: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  gunlukTarih: { fontSize: 12, flex: 1 },
  gunlukSagSatir: { flexDirection: 'row', gap: 8 },
  gunlukChip: { backgroundColor: '#ede9fe', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' },
  gunlukChipYazi: { fontSize: 13, fontWeight: '700', color: '#7c3aed' },
  gunlukChipEtiket: { fontSize: 9 },
  siraNumara: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  siraNumaraYazi: { color: '#fff', fontSize: 11, fontWeight: '700' },
  hastaAdYazi: { fontSize: 14, fontWeight: '500' },
  sayi: { fontSize: 12, fontWeight: '700' },
});
