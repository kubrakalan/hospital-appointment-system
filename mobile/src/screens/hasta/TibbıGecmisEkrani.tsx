import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl,
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

interface TibbiBilgi {
  Tani: string | null;
  UygulananIslem: string | null;
  Recete: string | null;
  LabNotu: string | null;
  SonrakiKontrol: string | null;
}

function tarihFormatla(tarih: string) {
  const [yil, ay, gun] = tarih.split('T')[0].split('-');
  const aylar = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  return `${gun} ${aylar[parseInt(ay)-1]} ${yil}`;
}

export default function TibbiGecmisEkrani() {
  const { c } = useTheme();
  const [kayitlar, setKayitlar] = useState<{ randevu: Randevu; tibbi: TibbiBilgi | null }[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const data = await api.randevularim();
      const liste: Randevu[] = Array.isArray(data) ? data : [];
      const tamamlananlar = liste.filter(r => r.Durum === 'Tamamlandı' || r.Durum === 'Gelmedi');
      const sonuclar = await Promise.all(
        tamamlananlar.map(async (rv) => {
          try {
            const tibbi = await api.tibbiBilgiHasta(rv.RandevuID);
            return { randevu: rv, tibbi };
          } catch {
            return { randevu: rv, tibbi: null };
          }
        })
      );
      setKayitlar(sonuclar);
    } catch {
    } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  if (yukleniyor) {
    return (
      <ScrollView style={[styles.kapsayici, { backgroundColor: c.bg }]} contentContainerStyle={{ padding: 16 }}>
        {[1, 2, 3].map(i => <KartSkeleton key={i} />)}
      </ScrollView>
    );
  }

  if (kayitlar.length === 0) {
    return (
      <View style={[styles.orta, { backgroundColor: c.bg }]}>
        <Text style={styles.bosEmoji}>🗂️</Text>
        <Text style={[styles.bosYazi, { color: c.textFaint }]}>Henüz tamamlanmış randevunuz yok.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.kapsayici, { backgroundColor: c.bg }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); yukle(); }} tintColor="#0ea5e9" />}
    >
      {kayitlar.map(({ randevu, tibbi }) => (
        <View key={randevu.RandevuID} style={[styles.kart, { backgroundColor: c.card }]}>
          <View style={[styles.kartBaslik, { borderBottomColor: c.border }]}>
            <View>
              <Text style={[styles.doktorAd, { color: c.text }]}>Dr. {randevu.DoktorAdi}</Text>
              <Text style={[styles.uzmanlik, { color: c.textMuted }]}>{randevu.UzmanlikAdi}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.tarih, { color: c.textMuted }]}>{tarihFormatla(randevu.RandevuTarihi)}</Text>
              <Text style={[styles.saat, { color: c.textFaint }]}>{String(randevu.RandevuSaati).substring(0, 5)}</Text>
            </View>
          </View>

          {!tibbi ? (
            <Text style={[styles.bosKayit, { color: c.textFaint }]}>Bu randevu için tıbbi kayıt girilmemiş.</Text>
          ) : (
            <View style={styles.bilgiGrid}>
              {[
                { icon: '🔬', label: 'Tanı', deger: tibbi.Tani },
                { icon: '💊', label: 'Reçete', deger: tibbi.Recete },
                { icon: '🩺', label: 'Uygulanan İşlem', deger: tibbi.UygulananIslem },
                { icon: '🧪', label: 'Lab / Tahlil', deger: tibbi.LabNotu },
                { icon: '📅', label: 'Sonraki Kontrol', deger: tibbi.SonrakiKontrol ? tarihFormatla(tibbi.SonrakiKontrol) : null },
              ].filter(f => f.deger).map(f => (
                <View key={f.label} style={[styles.bilgiSatir, { backgroundColor: c.surface }]}>
                  <Text style={[styles.bilgiLabel, { color: c.textMuted }]}>{f.icon} {f.label}</Text>
                  <Text style={[styles.bilgiDeger, { color: c.text }]}>{f.deger}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bosEmoji: { fontSize: 48, marginBottom: 12 },
  bosYazi: { fontSize: 15 },
  kart: {
    borderRadius: 14, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  kartBaslik: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1,
  },
  doktorAd: { fontSize: 15, fontWeight: '700' },
  uzmanlik: { fontSize: 12, marginTop: 2 },
  tarih: { fontSize: 12, fontWeight: '600' },
  saat: { fontSize: 11, marginTop: 2 },
  bosKayit: { fontSize: 13, fontStyle: 'italic' },
  bilgiGrid: { gap: 8 },
  bilgiSatir: { borderRadius: 10, padding: 12 },
  bilgiLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  bilgiDeger: { fontSize: 13, lineHeight: 20 },
});
