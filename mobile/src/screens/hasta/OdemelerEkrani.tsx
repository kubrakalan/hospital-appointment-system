import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { api } from '../../api';

interface Odeme {
  OdemeID: number;
  Tutar: number;
  Durum: string;
  OdemeYontemi: string;
  Notlar: string | null;
  OdemeTarihi: string | null;
  RandevuTarihi: string;
  RandevuSaati: string;
  DoktorAdi: string;
  UzmanlikAdi: string;
}

function tarihFormatla(tarih: string) {
  const [yil, ay, gun] = tarih.split('T')[0].split('-');
  const aylar = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  return `${gun} ${aylar[parseInt(ay)-1]} ${yil}`;
}

export default function OdemelerEkrani() {
  const [odemeler, setOdemeler] = useState<Odeme[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const data = await api.hastaOdemelerim();
      setOdemeler(data);
    } catch {
    } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  const toplamOdendi = odemeler.filter(o => o.Durum === 'Ödendi').reduce((t, o) => t + o.Tutar, 0);
  const bekleyen = odemeler.filter(o => o.Durum === 'Bekliyor').reduce((t, o) => t + o.Tutar, 0);

  if (yukleniyor) return <View style={styles.orta}><ActivityIndicator size="large" color="#0ea5e9" /></View>;

  if (odemeler.length === 0) {
    return (
      <View style={styles.orta}>
        <Text style={styles.bosEmoji}>💳</Text>
        <Text style={styles.bosYazi}>Henüz ödeme kaydınız yok.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.kapsayici}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); yukle(); }} />}
    >
      {/* Özet kartlar */}
      <View style={styles.ozetSatir}>
        <View style={[styles.ozetKart, { borderLeftColor: '#10b981' }]}>
          <Text style={[styles.ozetTutar, { color: '#10b981' }]}>₺{toplamOdendi.toLocaleString('tr-TR')}</Text>
          <Text style={styles.ozetLabel}>Toplam Ödenen</Text>
        </View>
        <View style={[styles.ozetKart, { borderLeftColor: '#f59e0b' }]}>
          <Text style={[styles.ozetTutar, { color: '#f59e0b' }]}>₺{bekleyen.toLocaleString('tr-TR')}</Text>
          <Text style={styles.ozetLabel}>Bekleyen</Text>
        </View>
      </View>

      {/* Ödeme listesi */}
      {odemeler.map(o => {
        const durumRenk = o.Durum === 'Ödendi' ? '#10b981' : o.Durum === 'Bekliyor' ? '#f59e0b' : '#9ca3af';
        return (
          <View key={o.OdemeID} style={styles.kart}>
            <View style={styles.kartUst}>
              <View style={{ flex: 1 }}>
                <Text style={styles.doktorAd}>Dr. {o.DoktorAdi}</Text>
                <Text style={styles.uzmanlik}>{o.UzmanlikAdi}</Text>
              </View>
              <View style={[styles.durumEtiket, { backgroundColor: durumRenk }]}>
                <Text style={styles.durumYazi}>{o.Durum}</Text>
              </View>
            </View>

            <View style={styles.detaySatir}>
              <View style={styles.detayKutu}>
                <Text style={styles.detayLabel}>Randevu</Text>
                <Text style={styles.detayDeger}>{tarihFormatla(o.RandevuTarihi)}</Text>
              </View>
              <View style={styles.detayKutu}>
                <Text style={styles.detayLabel}>Yöntem</Text>
                <Text style={styles.detayDeger}>{o.OdemeYontemi}</Text>
              </View>
              <View style={styles.detayKutu}>
                <Text style={styles.detayLabel}>Tutar</Text>
                <Text style={[styles.detayDeger, { fontWeight: '700', color: '#111827' }]}>₺{o.Tutar.toLocaleString('tr-TR')}</Text>
              </View>
            </View>

            {o.Notlar ? (
              <Text style={styles.notYazi}>{o.Notlar}</Text>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1, backgroundColor: '#f0f9ff' },
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f9ff' },
  bosEmoji: { fontSize: 48, marginBottom: 12 },
  bosYazi: { color: '#9ca3af', fontSize: 15 },
  ozetSatir: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  ozetKart: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12,
    padding: 14, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  ozetTutar: { fontSize: 20, fontWeight: '700' },
  ozetLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  kart: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    marginBottom: 12, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  kartUst: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  doktorAd: { fontSize: 15, fontWeight: '700', color: '#111827' },
  uzmanlik: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  durumEtiket: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  durumYazi: { color: '#fff', fontSize: 11, fontWeight: '700' },
  detaySatir: { flexDirection: 'row', gap: 8 },
  detayKutu: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 8, padding: 10 },
  detayLabel: { fontSize: 10, color: '#9ca3af', marginBottom: 3 },
  detayDeger: { fontSize: 13, color: '#374151' },
  notYazi: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic', marginTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 8 },
});
