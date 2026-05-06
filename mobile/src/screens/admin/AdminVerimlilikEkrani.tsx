import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, TouchableOpacity, TextInput,
} from 'react-native';
import { api } from '../../api';
import { useTheme } from '../../ThemeContext';

interface DoktorPerf {
  doktorAdi: string;
  UzmanlikAdi: string;
  toplamRandevu: number;
  tamamlanan: number;
  iptalEdilen: number;
  gelmedi: number;
  tamamlanmaOrani: number;
}

type SiralamaTip = 'tamamlanan' | 'toplamRandevu' | 'tamamlanmaOrani' | 'gelmedi';

export default function AdminVerimlilikEkrani() {
  const { c } = useTheme();
  const [doktorlar, setDoktorlar] = useState<DoktorPerf[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [arama, setArama] = useState('');
  const [siralama, setSiralama] = useState<SiralamaTip>('tamamlanan');

  const yukle = useCallback(async () => {
    try {
      const data = await api.adminVerimlilik();
      setDoktorlar(Array.isArray(data) ? data : []);
    } catch { } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  const siralamaSecenekleri: { key: SiralamaTip; etiket: string }[] = [
    { key: 'tamamlanan', etiket: 'Tamamlanan' },
    { key: 'toplamRandevu', etiket: 'Toplam' },
    { key: 'tamamlanmaOrani', etiket: '% Oran' },
    { key: 'gelmedi', etiket: 'Gelmedi' },
  ];

  const filtreli = doktorlar
    .filter(d =>
      d.doktorAdi.toLowerCase().includes(arama.toLowerCase()) ||
      d.UzmanlikAdi.toLowerCase().includes(arama.toLowerCase())
    )
    .sort((a, b) => (b[siralama] as number) - (a[siralama] as number));

  // Toplam özet
  const toplam = doktorlar.reduce((acc, d) => ({
    randevu: acc.randevu + d.toplamRandevu,
    tamamlanan: acc.tamamlanan + d.tamamlanan,
    iptal: acc.iptal + d.iptalEdilen,
    gelmedi: acc.gelmedi + d.gelmedi,
  }), { randevu: 0, tamamlanan: 0, iptal: 0, gelmedi: 0 });

  const genelOran = toplam.randevu > 0
    ? Math.round((toplam.tamamlanan / toplam.randevu) * 100) : 0;

  if (yukleniyor) {
    return (
      <View style={[styles.orta, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={yenileniyor}
          onRefresh={() => { setYenileniyor(true); yukle(); }}
          tintColor="#6366f1"
        />
      }
    >
      {/* Genel özet banner */}
      <View style={[styles.banner, { backgroundColor: '#6366f1' }]}>
        <Text style={styles.bannerBaslik}>Genel Sistem Performansı</Text>
        <View style={styles.bannerGrid}>
          {[
            { etiket: 'Toplam', deger: toplam.randevu, renk: '#fff' },
            { etiket: 'Tamamlanan', deger: toplam.tamamlanan, renk: '#86efac' },
            { etiket: 'İptal', deger: toplam.iptal, renk: '#fca5a5' },
            { etiket: 'Gelmedi', deger: toplam.gelmedi, renk: '#fdba74' },
          ].map(item => (
            <View key={item.etiket} style={styles.bannerItem}>
              <Text style={[styles.bannerSayi, { color: item.renk }]}>{item.deger}</Text>
              <Text style={styles.bannerEtiket}>{item.etiket}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.oranBar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <View style={[styles.oranDolu, { width: `${genelOran}%` }]} />
        </View>
        <Text style={styles.oranYazi}>Genel Tamamlanma Oranı: %{genelOran}</Text>
      </View>

      {/* Arama + sıralama */}
      <TextInput
        style={[styles.aramaInput, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
        value={arama}
        onChangeText={setArama}
        placeholder="🔍 Doktor adı veya uzmanlık ara..."
        placeholderTextColor={c.textFaint}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {siralamaSecenekleri.map(s => (
            <TouchableOpacity
              key={s.key}
              style={[
                styles.siralamaBtn,
                { borderColor: siralama === s.key ? '#6366f1' : c.border },
                siralama === s.key && { backgroundColor: '#6366f1' },
              ]}
              onPress={() => setSiralama(s.key)}
            >
              <Text style={[
                styles.siralamaBtnYazi,
                { color: siralama === s.key ? '#fff' : c.textMuted },
              ]}>
                {siralama === s.key ? '↓ ' : ''}{s.etiket}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Text style={[styles.doktorSayisi, { color: c.textFaint }]}>
        {filtreli.length} doktor listeleniyor
      </Text>

      {/* Doktor kartları */}
      {filtreli.map((d, i) => {
        const oran = d.tamamlanmaOrani ?? 0;
        const oranRenk = oran >= 80 ? '#10b981' : oran >= 60 ? '#f59e0b' : '#ef4444';
        return (
          <View key={`${d.doktorAdi}-${i}`} style={[styles.kart, { backgroundColor: c.card }]}>
            {/* Üst satır */}
            <View style={styles.kartUst}>
              <View style={[styles.siraNo, { backgroundColor: i < 3 ? '#6366f1' : c.border }]}>
                <Text style={[styles.siraNoYazi, { color: i < 3 ? '#fff' : c.textMuted }]}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.doktorAdi, { color: c.text }]}>Dr. {d.doktorAdi}</Text>
                <Text style={[styles.uzmanlik, { color: c.textMuted }]}>{d.UzmanlikAdi}</Text>
              </View>
              <View style={[styles.oranKutu, { backgroundColor: oranRenk + '18' }]}>
                <Text style={[styles.oranYaziKutu, { color: oranRenk }]}>%{oran.toFixed(0)}</Text>
                <Text style={[styles.oranEtiket, { color: oranRenk }]}>başarı</Text>
              </View>
            </View>

            {/* İstatistik satırı */}
            <View style={styles.statSatir}>
              {[
                { etiket: 'Toplam', deger: d.toplamRandevu, renk: '#6366f1' },
                { etiket: 'Tamam', deger: d.tamamlanan, renk: '#10b981' },
                { etiket: 'İptal', deger: d.iptalEdilen, renk: '#ef4444' },
                { etiket: 'Gelmedi', deger: d.gelmedi, renk: '#f97316' },
              ].map(s => (
                <View key={s.etiket} style={styles.statItem}>
                  <Text style={[styles.statSayi, { color: s.renk }]}>{s.deger}</Text>
                  <Text style={[styles.statEtiket, { color: c.textFaint }]}>{s.etiket}</Text>
                </View>
              ))}
            </View>

            {/* İlerleme çubuğu */}
            <View style={[styles.ilerlemeArka, { backgroundColor: c.border }]}>
              <View style={[styles.ilerlemeDolu, { width: `${oran}%`, backgroundColor: oranRenk }]} />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  banner: { borderRadius: 18, padding: 20, marginBottom: 16 },
  bannerBaslik: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', marginBottom: 14 },
  bannerGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  bannerItem: { alignItems: 'center' },
  bannerSayi: { fontSize: 22, fontWeight: '800' },
  bannerEtiket: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  oranBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  oranDolu: { height: 8, backgroundColor: '#86efac', borderRadius: 4 },
  oranYazi: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },

  aramaInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, marginBottom: 12 },
  siralamaBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  siralamaBtnYazi: { fontSize: 12, fontWeight: '700' },
  doktorSayisi: { fontSize: 12, marginBottom: 10 },

  kart: {
    borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  kartUst: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  siraNo: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  siraNoYazi: { fontSize: 12, fontWeight: '800' },
  doktorAdi: { fontSize: 14, fontWeight: '700' },
  uzmanlik: { fontSize: 12, marginTop: 2 },
  oranKutu: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  oranYaziKutu: { fontSize: 16, fontWeight: '800' },
  oranEtiket: { fontSize: 9, fontWeight: '600' },

  statSatir: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  statItem: { alignItems: 'center' },
  statSayi: { fontSize: 16, fontWeight: '800' },
  statEtiket: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  ilerlemeArka: { height: 6, borderRadius: 3, overflow: 'hidden' },
  ilerlemeDolu: { height: 6, borderRadius: 3 },
});
