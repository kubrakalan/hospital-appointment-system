import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, RefreshControl, ScrollView,
} from 'react-native';
import { api } from '../../api';
import { useTheme } from '../../theme';
import { KartSkeleton } from '../../components/Skeleton';

interface Randevu {
  RandevuID: number;
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

function tarihFormatla(tarih: string) {
  const [yil, ay, gun] = tarih.split('T')[0].split('-');
  const aylar = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  return `${gun} ${aylar[parseInt(ay)-1]} ${yil}`;
}

function gunFarki(tarih: string) {
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const hedef = new Date(tarih.split('T')[0]);
  return Math.round((hedef.getTime() - bugun.getTime()) / 86400000);
}

export default function RandevularEkrani() {
  const { c } = useTheme();
  const [randevular, setRandevular] = useState<Randevu[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [banBitis, setBanBitis] = useState<string | null>(null);
  const [banSebebi, setBanSebebi] = useState<string | null>(null);
  const [kontrolUyarilari, setKontrolUyarilari] = useState<{ doktorAdi: string; tarih: string }[]>([]);

  const yukle = useCallback(async () => {
    try {
      const [data, profil] = await Promise.all([api.randevularim(), api.profilim()]);
      const liste: Randevu[] = Array.isArray(data) ? data : [];
      setRandevular(liste);

      // Ban kontrolü
      if (profil.BanBitisTarihi && new Date(profil.BanBitisTarihi) > new Date()) {
        setBanBitis(profil.BanBitisTarihi.split('T')[0]);
        setBanSebebi(profil.BanSebebi ?? null);
      } else {
        setBanBitis(null);
        setBanSebebi(null);
      }

      // Sonraki kontrol uyarısı (7 gün içindekiler)
      const tamamlananlar = liste.filter(r => r.Durum === 'Tamamlandı');
      const uyarilar: { doktorAdi: string; tarih: string }[] = [];
      await Promise.all(tamamlananlar.map(async (rv) => {
        try {
          const tibbi = await api.tibbiBilgiHasta(rv.RandevuID);
          if (tibbi?.SonrakiKontrol) {
            const fark = gunFarki(tibbi.SonrakiKontrol);
            if (fark >= 0 && fark <= 7) {
              uyarilar.push({ doktorAdi: rv.DoktorAdi, tarih: tibbi.SonrakiKontrol.split('T')[0] });
            }
          }
        } catch { }
      }));
      setKontrolUyarilari(uyarilar);
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  async function iptalEt(id: number) {
    Alert.alert('Randevu İptal', 'Bu randevuyu iptal etmek istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal Et', style: 'destructive', onPress: async () => {
          try {
            await api.randevuIptal(id);
            setRandevular(prev => prev.map(r => r.RandevuID === id ? { ...r, Durum: 'İptal' } : r));
          } catch (err: any) { Alert.alert('Hata', err.message); }
        },
      },
    ]);
  }

  if (yukleniyor) {
    return (
      <ScrollView style={[styles.kapsayici, { backgroundColor: c.bg }]} contentContainerStyle={{ padding: 16 }}>
        {[1,2,3].map(i => <KartSkeleton key={i} />)}
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={randevular}
      keyExtractor={item => String(item.RandevuID)}
      style={[styles.liste, { backgroundColor: c.bg }]}
      contentContainerStyle={[
        randevular.length === 0 ? styles.bos : { padding: 16, paddingBottom: 32 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={yenileniyor}
          onRefresh={() => { setYenileniyor(true); yukle(); }}
          tintColor="#0ea5e9"
        />
      }
      ListHeaderComponent={
        <>
          {/* Ban uyarısı */}
          {banBitis && (
            <View style={[styles.uyariBanner, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
              <Text style={styles.uyariIkon}>🚫</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.uyariBaslik, { color: '#991b1b' }]}>Hesabınız Askıya Alındı</Text>
                <Text style={[styles.uyariMetin, { color: '#b91c1c' }]}>
                  {banSebebi ? `Sebep: ${banSebebi}\n` : ''}Ban bitiş tarihi: {banBitis}
                </Text>
              </View>
            </View>
          )}

          {/* Sonraki kontrol uyarıları */}
          {kontrolUyarilari.map((u, i) => (
            <View key={i} style={[styles.uyariBanner, { backgroundColor: '#eff6ff', borderColor: '#93c5fd' }]}>
              <Text style={styles.uyariIkon}>📅</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.uyariBaslik, { color: '#1e40af' }]}>Kontrol Zamanı Yaklaşıyor</Text>
                <Text style={[styles.uyariMetin, { color: '#1d4ed8' }]}>
                  Dr. {u.doktorAdi} · {u.tarih}
                </Text>
              </View>
            </View>
          ))}
        </>
      }
      ListEmptyComponent={
        <View style={styles.orta}>
          <Text style={styles.bosEmoji}>📋</Text>
          <Text style={[styles.bosYazi, { color: c.textFaint }]}>Henüz randevunuz yok.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={[styles.kart, { backgroundColor: c.card }]}>
          <View style={styles.kartUst}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.doktorAd, { color: c.text }]}>Dr. {item.DoktorAdi}</Text>
              <Text style={[styles.uzmanlik, { color: c.textMuted }]}>{item.UzmanlikAdi}</Text>
            </View>
            <View style={[styles.durumEtiket, { backgroundColor: DURUM_RENK[item.Durum] ?? '#9ca3af' }]}>
              <Text style={styles.durumYazi}>{item.Durum}</Text>
            </View>
          </View>
          <Text style={[styles.tarih, { color: c.textMuted }]}>
            📅 {tarihFormatla(item.RandevuTarihi)} · {String(item.RandevuSaati).substring(0, 5)}
          </Text>
          {(item.Durum === 'Beklemede' || item.Durum === 'Onaylandı') && (
            <TouchableOpacity
              style={[styles.iptalButon, { borderColor: '#fca5a5' }]}
              onPress={() => iptalEt(item.RandevuID)}
            >
              <Text style={styles.iptalYazi}>İptal Et</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  liste: { flex: 1 },
  kapsayici: { flex: 1 },
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  bos: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bosEmoji: { fontSize: 48, marginBottom: 12 },
  bosYazi: { fontSize: 15 },
  uyariBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderWidth: 1, borderRadius: 12, padding: 14,
    marginHorizontal: 16, marginTop: 12,
  },
  uyariIkon: { fontSize: 20 },
  uyariBaslik: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  uyariMetin: { fontSize: 12, lineHeight: 18 },
  kart: {
    borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  kartUst: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  doktorAd: { fontSize: 15, fontWeight: '700' },
  uzmanlik: { fontSize: 12, marginTop: 2 },
  durumEtiket: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  durumYazi: { color: '#fff', fontSize: 11, fontWeight: '700' },
  tarih: { fontSize: 13 },
  iptalButon: { marginTop: 10, borderWidth: 1, borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
  iptalYazi: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
});
