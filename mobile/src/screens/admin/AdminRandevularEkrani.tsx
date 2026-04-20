import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, TextInput, RefreshControl,
} from 'react-native';
import { api } from '../../api';
import { useTheme } from '../../theme';
import { KartSkeleton } from '../../components/Skeleton';

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

const DURUM_SIRASI = ['Hepsi', 'Beklemede', 'Onaylandı', 'Tamamlandı', 'İptal', 'Gelmedi'];

function tarihFormatla(t: string) {
  const [yil, ay, gun] = t.split('T')[0].split('-');
  const aylar = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  return `${gun} ${aylar[parseInt(ay)-1]} ${yil}`;
}

export default function AdminRandevularEkrani() {
  const { c } = useTheme();
  const [randevular, setRandevular] = useState<Randevu[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [arama, setArama] = useState('');
  const [filtre, setFiltre] = useState('Hepsi');

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

  async function sil(randevu: Randevu) {
    Alert.alert(
      'Randevu Sil',
      `${randevu.HastaAdi} – ${tarihFormatla(randevu.RandevuTarihi)} randevusu silinecek. Emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil', style: 'destructive', onPress: async () => {
            try {
              await api.adminRandevuSil(randevu.RandevuID);
              setRandevular(prev => prev.filter(r => r.RandevuID !== randevu.RandevuID));
            } catch (err: any) { Alert.alert('Hata', err.message); }
          },
        },
      ]
    );
  }

  const filtrelenmis = randevular.filter(r => {
    const aramaEsle = arama === '' ||
      r.HastaAdi?.toLowerCase().includes(arama.toLowerCase()) ||
      r.DoktorAdi?.toLowerCase().includes(arama.toLowerCase());
    const filtreEsle = filtre === 'Hepsi' || r.Durum === filtre;
    return aramaEsle && filtreEsle;
  });

  return (
    <View style={[styles.kapsayici, { backgroundColor: c.bg }]}>
      {/* Arama */}
      <View style={[styles.aramaKutu, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TextInput
          style={[styles.aramaGirdi, { backgroundColor: c.input, borderColor: c.border, color: c.text }]}
          placeholder="Hasta veya doktor ara..."
          placeholderTextColor={c.textFaint}
          value={arama}
          onChangeText={setArama}
        />
      </View>

      {/* Filtre çipleri */}
      <FlatList
        horizontal
        data={DURUM_SIRASI}
        keyExtractor={d => d}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}
        style={{ maxHeight: 52, flexGrow: 0 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setFiltre(item)}
            style={[
              styles.filtreCip,
              { borderColor: c.border, backgroundColor: filtre === item ? '#8b5cf6' : c.card },
            ]}
          >
            <Text style={[styles.filtreCipYazi, { color: filtre === item ? '#fff' : c.textMuted }]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {yukleniyor ? (
        <View style={{ padding: 16 }}>
          {[1,2,3].map(i => <KartSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={filtrelenmis}
          keyExtractor={item => String(item.RandevuID)}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={yenileniyor}
              onRefresh={() => { setYenileniyor(true); yukle(); }}
              tintColor="#8b5cf6"
            />
          }
          ListEmptyComponent={
            <Text style={[styles.bosYazi, { color: c.textFaint }]}>Randevu bulunamadı.</Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.kart, { backgroundColor: c.card }]}>
              <View style={styles.kartUst}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.hastaAd, { color: c.text }]}>{item.HastaAdi}</Text>
                  <Text style={[styles.doktorAd, { color: c.textMuted }]}>
                    Dr. {item.DoktorAdi} · {item.UzmanlikAdi}
                  </Text>
                  <Text style={[styles.tarih, { color: c.textFaint }]}>
                    📅 {tarihFormatla(item.RandevuTarihi)} · {String(item.RandevuSaati).substring(0, 5)}
                  </Text>
                </View>
                <View style={[styles.durumEtiket, { backgroundColor: DURUM_RENK[item.Durum] ?? '#9ca3af' }]}>
                  <Text style={styles.durumYazi}>{item.Durum}</Text>
                </View>
              </View>

              <View style={[styles.aksiyon, { borderTopColor: c.border }]}>
                {item.Durum === 'Beklemede' && (
                  <TouchableOpacity
                    style={[styles.akBtn, { backgroundColor: '#dcfce7' }]}
                    onPress={() => durumGuncelle(item.RandevuID, 'Onaylandı')}
                  >
                    <Text style={[styles.akBtnYazi, { color: '#16a34a' }]}>Onayla</Text>
                  </TouchableOpacity>
                )}
                {(item.Durum === 'Beklemede' || item.Durum === 'Onaylandı') && (
                  <TouchableOpacity
                    style={[styles.akBtn, { backgroundColor: '#fef9c3' }]}
                    onPress={() => Alert.alert('İptal Et', 'Emin misiniz?', [
                      { text: 'Vazgeç', style: 'cancel' },
                      { text: 'İptal Et', style: 'destructive', onPress: () => durumGuncelle(item.RandevuID, 'İptal') },
                    ])}
                  >
                    <Text style={[styles.akBtnYazi, { color: '#92400e' }]}>İptal</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.akBtn, { backgroundColor: '#fef2f2' }]}
                  onPress={() => sil(item)}
                >
                  <Text style={[styles.akBtnYazi, { color: '#dc2626' }]}>Sil</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  aramaKutu: { padding: 12, borderBottomWidth: 1 },
  aramaGirdi: { borderWidth: 1, borderRadius: 10, padding: 11, fontSize: 14 },
  filtreCip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filtreCipYazi: { fontSize: 12, fontWeight: '600' },
  bosYazi: { textAlign: 'center', marginTop: 40 },
  kart: {
    borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  kartUst: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  hastaAd: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  doktorAd: { fontSize: 12, marginBottom: 3 },
  tarih: { fontSize: 12 },
  durumEtiket: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  durumYazi: { color: '#fff', fontSize: 11, fontWeight: '700' },
  aksiyon: { flexDirection: 'row', gap: 8, paddingTop: 10, borderTopWidth: 1 },
  akBtn: { flex: 1, borderRadius: 8, padding: 8, alignItems: 'center' },
  akBtnYazi: { fontWeight: '600', fontSize: 13 },
});
