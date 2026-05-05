import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { api } from '../../api';
import { useTheme } from '../../ThemeContext';
import { saatFormatla, tarihFormatla } from '../../utils';

interface LabKayit {
  randevu: { RandevuID: number; DoktorAdi: string; UzmanlikAdi: string; RandevuTarihi: string; RandevuSaati: string };
  labNotu: string;
}

export default function LabSonuclariEkrani() {
  const { c } = useTheme();
  const [kayitlar, setKayitlar] = useState<LabKayit[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const randevular = await api.randevularim();
      const tamamlananlar = Array.isArray(randevular)
        ? randevular.filter((r: any) => r.Durum === 'Tamamlandı' || r.Durum === 'Gelmedi')
        : [];

      const sonuclar = await Promise.allSettled(
        tamamlananlar.map(async (rv: any) => {
          const tibbi = await api.tibbiBilgiHasta(rv.RandevuID);
          return { randevu: rv, labNotu: tibbi?.LabNotu };
        })
      );

      setKayitlar(
        sonuclar
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && !!r.value.labNotu)
          .map(r => r.value)
      );
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

  if (kayitlar.length === 0) return (
    <View style={[styles.orta, { backgroundColor: c.bg }]}>
      <Text style={styles.bosEmoji}>🧪</Text>
      <Text style={[styles.bosYazi, { color: c.textFaint }]}>Lab sonucu bulunamadı.</Text>
      <Text style={[styles.bosAlt, { color: c.textFaint }]}>Doktorunuz tahlil notu ekledikçe burada görünür.</Text>
    </View>
  );

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); yukle(); }} tintColor="#0ea5e9" />}
    >
      {kayitlar.map(({ randevu, labNotu }) => (
        <View key={randevu.RandevuID} style={[styles.kart, { backgroundColor: c.card }]}>
          <View style={[styles.kartUst, { borderBottomColor: c.border }]}>
            <View style={styles.ikonKutu}>
              <Text style={styles.ikon}>🧪</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.doktorAd, { color: c.text }]}>Dr. {randevu.DoktorAdi}</Text>
              <Text style={[styles.uzmanlik, { color: c.textMuted }]}>{randevu.UzmanlikAdi}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.tarih, { color: c.textMuted }]}>{tarihFormatla(randevu.RandevuTarihi)}</Text>
              <Text style={[styles.saat, { color: c.textFaint }]}>{saatFormatla(randevu.RandevuSaati)}</Text>
            </View>
          </View>
          <View style={[styles.sonucKutu, { backgroundColor: c.surface }]}>
            <Text style={[styles.sonucBaslik, { color: c.textMuted }]}>🔬 Tahlil / Lab Notu</Text>
            <Text style={[styles.sonucMetin, { color: c.text }]}>{labNotu}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  bosEmoji: { fontSize: 48, marginBottom: 12 },
  bosYazi: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  bosAlt: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  kart: {
    borderRadius: 16, marginBottom: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  kartUst: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1 },
  ikonKutu: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#ecfdf5', justifyContent: 'center', alignItems: 'center' },
  ikon: { fontSize: 20 },
  doktorAd: { fontSize: 14, fontWeight: '700' },
  uzmanlik: { fontSize: 12, marginTop: 2 },
  tarih: { fontSize: 12, fontWeight: '600' },
  saat: { fontSize: 11, marginTop: 2 },
  sonucKutu: { padding: 14 },
  sonucBaslik: { fontSize: 11, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  sonucMetin: { fontSize: 13, lineHeight: 22 },
});
