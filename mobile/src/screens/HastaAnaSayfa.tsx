import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api';

interface Randevu {
  RandevuID: number;
  DoktorAd: string;
  DoktorSoyad: string;
  UzmanlikAdi: string;
  Tarih: string;
  Saat: string;
  Durum: string;
}

const DURUM_RENK: Record<string, string> = {
  'Bekliyor': '#f59e0b',
  'Onaylandı': '#10b981',
  'Tamamlandı': '#6b7280',
  'İptal': '#ef4444',
};

export default function HastaAnaSayfa({ navigation }: any) {
  const [randevular, setRandevular] = useState<Randevu[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kullanici, setKullanici] = useState<any>(null);

  useEffect(() => {
    AsyncStorage.getItem('kullanici').then(k => k && setKullanici(JSON.parse(k)));
    yukle();
  }, []);

  async function yukle() {
    try {
      const data = await api.randevularim();
      setRandevular(data.randevular || []);
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    } finally {
      setYukleniyor(false);
    }
  }

  async function cikisYap() {
    await AsyncStorage.multiRemove(['token', 'kullanici']);
    navigation.replace('Giris');
  }

  function tarihFormatla(tarih: string) {
    return new Date(tarih).toLocaleDateString('tr-TR');
  }

  return (
    <View style={styles.kapsayici}>
      <View style={styles.baslikBar}>
        <View>
          <Text style={styles.hosgeldin}>Hoş geldiniz,</Text>
          <Text style={styles.ad}>{kullanici?.ad} {kullanici?.soyad}</Text>
        </View>
        <TouchableOpacity onPress={cikisYap} style={styles.cikisButon}>
          <Text style={styles.cikisYazi}>Çıkış</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.bolumBaslik}>Randevularım</Text>

      {yukleniyor ? (
        <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 40 }} />
      ) : randevular.length === 0 ? (
        <Text style={styles.bosYazi}>Henüz randevunuz yok.</Text>
      ) : (
        <FlatList
          data={randevular}
          keyExtractor={item => String(item.RandevuID)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.kart}>
              <View style={styles.kartUst}>
                <Text style={styles.doktorAd}>
                  Dr. {item.DoktorAd} {item.DoktorSoyad}
                </Text>
                <View style={[styles.durumEtiket, { backgroundColor: DURUM_RENK[item.Durum] || '#9ca3af' }]}>
                  <Text style={styles.durumYazi}>{item.Durum}</Text>
                </View>
              </View>
              <Text style={styles.uzmanlik}>{item.UzmanlikAdi}</Text>
              <Text style={styles.tarihYazi}>
                {tarihFormatla(item.Tarih)} — {item.Saat?.slice(0, 5)}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1, backgroundColor: '#f0f9ff' },
  baslikBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0ea5e9',
    padding: 20,
    paddingTop: 60,
  },
  hosgeldin: { color: '#e0f2fe', fontSize: 13 },
  ad: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cikisButon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  cikisYazi: { color: '#fff', fontWeight: '600' },
  bolumBaslik: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 4,
  },
  bosYazi: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
  kart: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  kartUst: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  doktorAd: { fontSize: 15, fontWeight: '600', color: '#111827' },
  durumEtiket: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  durumYazi: { color: '#fff', fontSize: 11, fontWeight: '600' },
  uzmanlik: { color: '#6b7280', fontSize: 13, marginBottom: 4 },
  tarihYazi: { color: '#374151', fontSize: 13 },
});
