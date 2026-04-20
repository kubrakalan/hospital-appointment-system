import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, RefreshControl,
} from 'react-native';
import { api } from '../../api';

interface Randevu {
  RandevuID: number;
  HastaAdi: string;
  DoktorAdi: string;
  UzmanlikAdi: string;
  RandevuTarihi: string;
  RandevuSaati: string;
  Durum: string;
}

const DURUM_RENK: Record<string, string> = {
  'Beklemede': '#f59e0b', 'Onaylandı': '#10b981',
  'Tamamlandı': '#6b7280', 'İptal': '#ef4444', 'Gelmedi': '#f97316',
};

function tarihFormatla(t: string) {
  const [yil, ay, gun] = t.split('T')[0].split('-');
  const aylar = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  return `${gun} ${aylar[parseInt(ay)-1]} ${yil}`;
}

export default function AdminRandevularEkrani() {
  const [randevular, setRandevular] = useState<Randevu[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [arama, setArama] = useState('');

  const yukle = useCallback(async () => {
    try {
      const data = await api.adminRandevular();
      setRandevular(Array.isArray(data) ? data : data.randevular ?? []);
    } catch (err: any) { Alert.alert('Hata', err.message); }
    finally { setYukleniyor(false); setYenileniyor(false); }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  async function durumGuncelle(id: number, durum: string) {
    try {
      await api.adminRandevuDurum(id, durum);
      setRandevular(prev => prev.map(r => r.RandevuID === id ? { ...r, Durum: durum } : r));
    } catch (err: any) { Alert.alert('Hata', err.message); }
  }

  const filtrelenmis = randevular.filter(r =>
    arama === '' ||
    r.HastaAdi?.toLowerCase().includes(arama.toLowerCase()) ||
    r.DoktorAdi?.toLowerCase().includes(arama.toLowerCase())
  );

  if (yukleniyor) return <View style={styles.orta}><ActivityIndicator size="large" color="#8b5cf6" /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: '#faf5ff' }}>
      <View style={styles.aramaKutu}>
        <TextInput
          style={styles.aramaGirdi}
          placeholder="Hasta veya doktor ara..."
          placeholderTextColor="#9ca3af"
          value={arama}
          onChangeText={setArama}
        />
      </View>
      <FlatList
        data={filtrelenmis}
        keyExtractor={item => String(item.RandevuID)}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); yukle(); }} />}
        ListEmptyComponent={<Text style={styles.bosYazi}>Randevu bulunamadı.</Text>}
        renderItem={({ item }) => (
          <View style={styles.kart}>
            <View style={styles.kartUst}>
              <View style={{ flex: 1 }}>
                <Text style={styles.hastaAd}>{item.HastaAdi}</Text>
                <Text style={styles.doktorAd}>Dr. {item.DoktorAdi} · {item.UzmanlikAdi}</Text>
                <Text style={styles.tarih}>📅 {tarihFormatla(item.RandevuTarihi)} · {String(item.RandevuSaati).substring(0,5)}</Text>
              </View>
              <View style={[styles.durumEtiket, { backgroundColor: DURUM_RENK[item.Durum] ?? '#9ca3af' }]}>
                <Text style={styles.durumYazi}>{item.Durum}</Text>
              </View>
            </View>
            {(item.Durum === 'Beklemede' || item.Durum === 'Onaylandı') && (
              <View style={styles.aksiyon}>
                {item.Durum === 'Beklemede' && (
                  <TouchableOpacity style={[styles.akBtn, { backgroundColor: '#10b981' }]}
                    onPress={() => durumGuncelle(item.RandevuID, 'Onaylandı')}>
                    <Text style={styles.akBtnYazi}>Onayla</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.akBtn, { backgroundColor: '#ef4444' }]}
                  onPress={() => Alert.alert('İptal Et', 'Emin misiniz?', [
                    { text: 'Vazgeç', style: 'cancel' },
                    { text: 'İptal Et', style: 'destructive', onPress: () => durumGuncelle(item.RandevuID, 'İptal') },
                  ])}>
                  <Text style={styles.akBtnYazi}>İptal</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  aramaKutu: { padding: 12, backgroundColor: '#faf5ff' },
  aramaGirdi: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 11, fontSize: 14, color: '#111827' },
  bosYazi: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  kart: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },
  kartUst: { flexDirection: 'row', alignItems: 'flex-start' },
  hastaAd: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  doktorAd: { fontSize: 12, color: '#6b7280', marginBottom: 3 },
  tarih: { fontSize: 12, color: '#374151' },
  durumEtiket: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  durumYazi: { color: '#fff', fontSize: 11, fontWeight: '700' },
  aksiyon: { flexDirection: 'row', gap: 8, marginTop: 10 },
  akBtn: { flex: 1, borderRadius: 8, padding: 8, alignItems: 'center' },
  akBtnYazi: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
