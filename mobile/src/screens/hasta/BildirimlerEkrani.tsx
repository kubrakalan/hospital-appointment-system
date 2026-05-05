import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { api } from '../../api';
import { useTheme } from '../../ThemeContext';

interface Bildirim {
  BildirimID: number;
  Mesaj: string;
  tarih: string;
  Okundu: boolean;
}

export default function BildirimlerEkrani() {
  const { c } = useTheme();
  const [bildirimler, setBildirimler] = useState<Bildirim[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const data = await api.bildirimler();
      setBildirimler(Array.isArray(data) ? data : []);
      await api.bildirimleriOkudu();
    } catch { } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  if (yukleniyor) return (
    <View style={[styles.orta, { backgroundColor: c.bg }]}>
      <ActivityIndicator size="large" color="#0ea5e9" />
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
      data={bildirimler}
      keyExtractor={b => String(b.BildirimID)}
      refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); yukle(); }} tintColor="#0ea5e9" />}
      ListEmptyComponent={
        <View style={styles.bos}>
          <Text style={styles.bosEmoji}>🔔</Text>
          <Text style={[styles.bosYazi, { color: c.textFaint }]}>Henüz bildirim yok.</Text>
        </View>
      }
      renderItem={({ item: b }) => (
        <View style={[styles.kart, { backgroundColor: c.card, borderLeftColor: b.Okundu ? c.border : '#0ea5e9' }]}>
          <View style={styles.ust}>
            <Text style={[styles.mesaj, { color: c.text, fontWeight: b.Okundu ? '400' : '600' }]}>{b.Mesaj}</Text>
            {!b.Okundu && <View style={styles.yeniNokta} />}
          </View>
          <Text style={[styles.tarih, { color: c.textFaint }]}>{b.tarih}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bos: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  bosEmoji: { fontSize: 48, marginBottom: 12 },
  bosYazi: { fontSize: 15 },
  kart: {
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  ust: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  baslik: { fontSize: 14, fontWeight: '700', flex: 1 },
  yeniNokta: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0ea5e9', marginLeft: 8 },
  mesaj: { fontSize: 13, lineHeight: 20, marginBottom: 6 },
  tarih: { fontSize: 11 },
});
