import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { api } from '../../api';

interface Doktor {
  DoktorID: number;
  Ad: string;
  Soyad: string;
  Email: string;
  UzmanlikAdi: string;
  Telefon: string | null;
  Durum: string;
}

const DURUM_RENK: Record<string, string> = {
  'Aktif': '#10b981', 'İzinli': '#f59e0b', 'Ayrıldı': '#ef4444',
};

export default function AdminDoktorlarEkrani() {
  const [doktorlar, setDoktorlar] = useState<Doktor[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const data = await api.adminDoktorlar();
      setDoktorlar(Array.isArray(data) ? data : data.doktorlar ?? []);
    } catch { } finally { setYukleniyor(false); setYenileniyor(false); }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  if (yukleniyor) return <View style={styles.orta}><ActivityIndicator size="large" color="#8b5cf6" /></View>;

  return (
    <FlatList
      data={doktorlar}
      keyExtractor={item => String(item.DoktorID)}
      style={{ backgroundColor: '#faf5ff' }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); yukle(); }} />}
      ListEmptyComponent={<Text style={styles.bosYazi}>Doktor bulunamadı.</Text>}
      renderItem={({ item }) => (
        <View style={styles.kart}>
          <View style={styles.kartUst}>
            <View style={styles.avatar}>
              <Text style={styles.avatarHarf}>{item.Ad?.[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ad}>Dr. {item.Ad} {item.Soyad}</Text>
              <Text style={styles.uzmanlik}>{item.UzmanlikAdi}</Text>
              <Text style={styles.email}>{item.Email}</Text>
            </View>
            <View style={[styles.durumEtiket, { backgroundColor: DURUM_RENK[item.Durum] ?? '#9ca3af' }]}>
              <Text style={styles.durumYazi}>{item.Durum}</Text>
            </View>
          </View>
          {item.Telefon && <Text style={styles.telefon}>📱 {item.Telefon}</Text>}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bosYazi: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  kart: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },
  kartUst: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center' },
  avatarHarf: { color: '#fff', fontSize: 18, fontWeight: '700' },
  ad: { fontSize: 15, fontWeight: '700', color: '#111827' },
  uzmanlik: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  email: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  durumEtiket: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  durumYazi: { color: '#fff', fontSize: 11, fontWeight: '700' },
  telefon: { fontSize: 12, color: '#6b7280', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
});
