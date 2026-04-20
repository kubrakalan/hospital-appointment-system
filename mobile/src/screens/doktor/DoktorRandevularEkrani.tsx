import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { api } from '../../api';

interface Randevu {
  RandevuID: number;
  HastaAdi: string;
  RandevuTarihi: string;
  RandevuSaati: string;
  Durum: string;
  Notlar?: string;
}

const DURUM_RENK: Record<string, string> = {
  'Beklemede': '#f59e0b',
  'Onaylandı': '#10b981',
  'Tamamlandı': '#6b7280',
  'İptal': '#ef4444',
  'Gelmedi': '#f97316',
};

function tarihFormatla(tarih: string) {
  const [yil, ay, gun] = tarih.split('T')[0].split('-');
  const aylar = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  return `${gun} ${aylar[parseInt(ay)-1]} ${yil}`;
}

export default function DoktorRandevularEkrani() {
  const [randevular, setRandevular] = useState<Randevu[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const data = await api.doktorRandevular();
      setRandevular(Array.isArray(data) ? data : []);
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  async function durumGuncelle(id: number, yeniDurum: string) {
    try {
      await api.doktorRandevuDurum(id, yeniDurum);
      setRandevular(prev => prev.map(r => r.RandevuID === id ? { ...r, Durum: yeniDurum } : r));
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    }
  }

  function durumSecenekleri(durum: string, id: number) {
    if (durum === 'Beklemede') {
      Alert.alert('Durum Güncelle', 'Randevu durumunu değiştir:', [
        { text: 'Onayla', onPress: () => durumGuncelle(id, 'Onaylandı') },
        { text: 'İptal Et', style: 'destructive', onPress: () => durumGuncelle(id, 'İptal') },
        { text: 'Vazgeç', style: 'cancel' },
      ]);
    } else if (durum === 'Onaylandı') {
      Alert.alert('Durum Güncelle', 'Randevu durumunu değiştir:', [
        { text: 'Tamamlandı', onPress: () => durumGuncelle(id, 'Tamamlandı') },
        { text: 'Gelmedi', onPress: () => durumGuncelle(id, 'Gelmedi') },
        { text: 'İptal Et', style: 'destructive', onPress: () => durumGuncelle(id, 'İptal') },
        { text: 'Vazgeç', style: 'cancel' },
      ]);
    }
  }

  if (yukleniyor) return <View style={styles.orta}><ActivityIndicator size="large" color="#10b981" /></View>;

  return (
    <FlatList
      data={randevular}
      keyExtractor={item => String(item.RandevuID)}
      style={styles.liste}
      contentContainerStyle={randevular.length === 0 ? styles.bos : { padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); yukle(); }} />}
      ListEmptyComponent={
        <View style={styles.orta}>
          <Text style={styles.bosEmoji}>📋</Text>
          <Text style={styles.bosYazi}>Randevu bulunamadı.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.kart}>
          <View style={styles.kartUst}>
            <View style={{ flex: 1 }}>
              <Text style={styles.hastaAd}>{item.HastaAdi}</Text>
              <Text style={styles.tarih}>📅 {tarihFormatla(item.RandevuTarihi)} · {String(item.RandevuSaati).substring(0, 5)}</Text>
            </View>
            <View style={[styles.durumEtiket, { backgroundColor: DURUM_RENK[item.Durum] ?? '#9ca3af' }]}>
              <Text style={styles.durumYazi}>{item.Durum}</Text>
            </View>
          </View>
          {item.Notlar ? <Text style={styles.notYazi}>💬 {item.Notlar}</Text> : null}
          {(item.Durum === 'Beklemede' || item.Durum === 'Onaylandı') && (
            <TouchableOpacity style={styles.guncelleButon} onPress={() => durumSecenekleri(item.Durum, item.RandevuID)}>
              <Text style={styles.guncelleYazi}>Durumu Güncelle</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  liste: { flex: 1, backgroundColor: '#f0fdf4' },
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  bos: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bosEmoji: { fontSize: 48, marginBottom: 12 },
  bosYazi: { color: '#9ca3af', fontSize: 15 },
  kart: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    marginBottom: 12, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  kartUst: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  hastaAd: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 3 },
  tarih: { fontSize: 13, color: '#374151' },
  durumEtiket: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  durumYazi: { color: '#fff', fontSize: 11, fontWeight: '700' },
  notYazi: { fontSize: 12, color: '#6b7280', marginTop: 6 },
  guncelleButon: {
    marginTop: 10, backgroundColor: '#10b981',
    borderRadius: 8, paddingVertical: 8, alignItems: 'center',
  },
  guncelleYazi: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
