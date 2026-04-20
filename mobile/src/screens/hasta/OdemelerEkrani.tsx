import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl,
} from 'react-native';
import { api } from '../../api';
import { useTheme } from '../../theme';
import { KartSkeleton } from '../../components/Skeleton';

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
  const { c } = useTheme();
  const [odemeler, setOdemeler] = useState<Odeme[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const data = await api.hastaOdemelerim();
      setOdemeler(Array.isArray(data) ? data : []);
    } catch { }
    finally { setYukleniyor(false); setYenileniyor(false); }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  const toplamOdendi = odemeler.filter(o => o.Durum === 'Ödendi').reduce((t, o) => t + o.Tutar, 0);
  const bekleyen = odemeler.filter(o => o.Durum === 'Bekliyor').reduce((t, o) => t + o.Tutar, 0);

  if (yukleniyor) {
    return (
      <ScrollView style={[styles.kapsayici, { backgroundColor: c.bg }]} contentContainerStyle={{ padding: 16 }}>
        {[1,2,3].map(i => <KartSkeleton key={i} />)}
      </ScrollView>
    );
  }

  if (odemeler.length === 0) {
    return (
      <View style={[styles.orta, { backgroundColor: c.bg }]}>
        <Text style={styles.bosEmoji}>💳</Text>
        <Text style={[styles.bosYazi, { color: c.textFaint }]}>Henüz ödeme kaydınız yok.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.kapsayici, { backgroundColor: c.bg }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={yenileniyor}
          onRefresh={() => { setYenileniyor(true); yukle(); }}
          tintColor="#0ea5e9"
        />
      }
    >
      {/* Özet kartlar */}
      <View style={styles.ozetSatir}>
        <View style={[styles.ozetKart, { backgroundColor: c.card, borderLeftColor: '#10b981' }]}>
          <Text style={[styles.ozetTutar, { color: '#10b981' }]}>₺{toplamOdendi.toLocaleString('tr-TR')}</Text>
          <Text style={[styles.ozetLabel, { color: c.textFaint }]}>Toplam Ödenen</Text>
        </View>
        <View style={[styles.ozetKart, { backgroundColor: c.card, borderLeftColor: '#f59e0b' }]}>
          <Text style={[styles.ozetTutar, { color: '#f59e0b' }]}>₺{bekleyen.toLocaleString('tr-TR')}</Text>
          <Text style={[styles.ozetLabel, { color: c.textFaint }]}>Bekleyen</Text>
        </View>
      </View>

      {odemeler.map(o => {
        const durumRenk = o.Durum === 'Ödendi' ? '#10b981' : o.Durum === 'Bekliyor' ? '#f59e0b' : '#9ca3af';
        return (
          <View key={o.OdemeID} style={[styles.kart, { backgroundColor: c.card }]}>
            <View style={styles.kartUst}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.doktorAd, { color: c.text }]}>Dr. {o.DoktorAdi}</Text>
                <Text style={[styles.uzmanlik, { color: c.textMuted }]}>{o.UzmanlikAdi}</Text>
              </View>
              <View style={[styles.durumEtiket, { backgroundColor: durumRenk }]}>
                <Text style={styles.durumYazi}>{o.Durum}</Text>
              </View>
            </View>

            <View style={styles.detaySatir}>
              <View style={[styles.detayKutu, { backgroundColor: c.surface }]}>
                <Text style={[styles.detayLabel, { color: c.textFaint }]}>Randevu</Text>
                <Text style={[styles.detayDeger, { color: c.text }]}>{tarihFormatla(o.RandevuTarihi)}</Text>
              </View>
              <View style={[styles.detayKutu, { backgroundColor: c.surface }]}>
                <Text style={[styles.detayLabel, { color: c.textFaint }]}>Yöntem</Text>
                <Text style={[styles.detayDeger, { color: c.text }]}>{o.OdemeYontemi}</Text>
              </View>
              <View style={[styles.detayKutu, { backgroundColor: c.surface }]}>
                <Text style={[styles.detayLabel, { color: c.textFaint }]}>Tutar</Text>
                <Text style={[styles.detayDeger, { color: c.text, fontWeight: '700' }]}>₺{o.Tutar.toLocaleString('tr-TR')}</Text>
              </View>
            </View>

            {o.Notlar ? (
              <Text style={[styles.notYazi, { color: c.textFaint, borderTopColor: c.border }]}>{o.Notlar}</Text>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bosEmoji: { fontSize: 48, marginBottom: 12 },
  bosYazi: { fontSize: 15 },
  ozetSatir: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  ozetKart: {
    flex: 1, borderRadius: 12, padding: 14, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  ozetTutar: { fontSize: 20, fontWeight: '700' },
  ozetLabel: { fontSize: 11, marginTop: 2 },
  kart: {
    borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  kartUst: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  doktorAd: { fontSize: 15, fontWeight: '700' },
  uzmanlik: { fontSize: 12, marginTop: 2 },
  durumEtiket: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  durumYazi: { color: '#fff', fontSize: 11, fontWeight: '700' },
  detaySatir: { flexDirection: 'row', gap: 8 },
  detayKutu: { flex: 1, borderRadius: 8, padding: 10 },
  detayLabel: { fontSize: 10, marginBottom: 3 },
  detayDeger: { fontSize: 13 },
  notYazi: { fontSize: 12, fontStyle: 'italic', marginTop: 10, borderTopWidth: 1, paddingTop: 8 },
});
