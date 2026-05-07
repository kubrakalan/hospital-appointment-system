import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../api';
import { useTheme } from '../../ThemeContext';

interface Randevu {
  RandevuID: number;
  RandevuTarihi: string;
  RandevuSaati: string;
  Durum: string;
  HastaAdi: string;
  Notlar: string | null;
  RandevuTipi: string;
}

interface Ozet {
  toplamRandevu: number;
  tamamlanan: number;
  bekleyen: number;
  onaylandi: number;
  bugun: number;
  benzersizHasta: number;
  gelmedi: number;
  iptalEdilen: number;
  son30Gun: number;
}

const DURUM_RENK: Record<string, string> = {
  Beklemede: '#f59e0b',
  Onaylandı: '#10b981',
  Tamamlandı: '#6b7280',
  İptal: '#ef4444',
  Gelmedi: '#f97316',
};

function selamlama() {
  const s = new Date().getHours();
  if (s < 12) return 'Günaydın';
  if (s < 17) return 'İyi günler';
  return 'İyi akşamlar';
}

export default function DoktorAnaSayfaEkrani({ navigation }: any) {
  const { c } = useTheme();
  const [doktorAd, setDoktorAd] = useState('');
  const [randevular, setRandevular] = useState<Randevu[]>([]);
  const [ozet, setOzet] = useState<Ozet | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [onaylaniyor, setOnaylaniyor] = useState<number | null>(null);

  const bugun = new Date().toISOString().split('T')[0];

  const yukle = useCallback(async () => {
    try {
      const ham = await AsyncStorage.getItem('kullanici');
      if (ham) {
        const k = JSON.parse(ham);
        setDoktorAd(`${k.ad ?? ''} ${k.soyad ?? ''}`.trim());
      }
      const [randevuData, istatistikData] = await Promise.all([
        api.doktorRandevular(),
        api.doktorIstatistikler(),
      ]);
      setRandevular(Array.isArray(randevuData) ? randevuData : []);
      setOzet(istatistikData?.ozet ?? null);
    } catch { } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  async function onayla(id: number) {
    setOnaylaniyor(id);
    try {
      await api.doktorRandevuDurum(id, 'Onaylandı');
      yukle();
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    } finally {
      setOnaylaniyor(null);
    }
  }

  const bugunRandevular = randevular
    .filter(r => r.RandevuTarihi?.split('T')[0] === bugun)
    .sort((a, b) => a.RandevuSaati.localeCompare(b.RandevuSaati));

  const bekleyenler = randevular.filter(r => r.Durum === 'Beklemede');

  if (yukleniyor) {
    return (
      <View style={[styles.orta, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      refreshControl={
        <RefreshControl
          refreshing={yenileniyor}
          onRefresh={() => { setYenileniyor(true); yukle(); }}
          tintColor="#10b981"
        />
      }
    >
      {/* Selamlama banner */}
      <View style={styles.selamKart}>
        <Text style={styles.selamUst}>{selamlama()},</Text>
        <Text style={styles.selamAd}>Dr. {doktorAd} 👨‍⚕️</Text>
        <Text style={styles.selamTarih}>
          {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
      </View>

      {/* Özet sayı kartları */}
      <View style={styles.ozetSatir}>
        {(() => {
          const toplam = ozet?.toplamRandevu ?? 0;
          const tamamlananOran = toplam > 0 ? Math.round(((ozet?.tamamlanan ?? 0) / toplam) * 100) : 0;
          const iptalOran = toplam > 0 ? Math.round(((ozet?.iptalEdilen ?? 0) / toplam) * 100) : 0;
          return [
            {
              emj: '📅', etiket: 'Bugün', sayi: ozet?.bugun ?? 0, renk: '#10b981',
              alt: `${ozet?.son30Gun ?? 0} son 30 gün`,
            },
            {
              emj: '⏳', etiket: 'Bekleyen', sayi: ozet?.bekleyen ?? 0, renk: '#f59e0b',
              alt: `${ozet?.onaylandi ?? 0} onaylı`,
            },
            {
              emj: '👥', etiket: 'Toplam Hasta', sayi: ozet?.benzersizHasta ?? 0, renk: '#6366f1',
              alt: `${toplam} randevu`,
            },
            {
              emj: '✅', etiket: 'Tamamlanan', sayi: ozet?.tamamlanan ?? 0, renk: '#0ea5e9',
              alt: `%${tamamlananOran} oran`,
            },
            {
              emj: '❌', etiket: 'İptal', sayi: ozet?.iptalEdilen ?? 0, renk: '#ef4444',
              alt: `%${iptalOran} oran`,
            },
            {
              emj: '🚫', etiket: 'Gelmedi', sayi: ozet?.gelmedi ?? 0, renk: '#f97316',
              alt: 'toplam',
            },
          ].map(item => (
            <View key={item.etiket} style={[styles.ozetKart, { backgroundColor: c.card, borderTopColor: item.renk }]}>
              <Text style={{ fontSize: 18, marginBottom: 4 }}>{item.emj}</Text>
              <Text style={[styles.ozetSayi, { color: item.renk }]}>{item.sayi}</Text>
              <Text style={[styles.ozetEtiket, { color: c.textMuted }]}>{item.etiket}</Text>
              <Text style={[styles.ozetAlt, { color: c.textFaint }]}>{item.alt}</Text>
            </View>
          ));
        })()}
      </View>

      {/* Bugünkü program */}
      <Text style={[styles.bolumBaslik, { color: c.text }]}>📅 Bugünkü Program</Text>
      {bugunRandevular.length === 0 ? (
        <View style={[styles.bosKart, { backgroundColor: c.card }]}>
          <Text style={{ fontSize: 36, marginBottom: 8 }}>🎉</Text>
          <Text style={[styles.bosYazi, { color: c.textMuted }]}>Bugün randevu yok</Text>
          <Text style={[styles.bosAlt, { color: c.textFaint }]}>Dinlenme zamanı!</Text>
        </View>
      ) : (
        bugunRandevular.map((r, idx) => {
          const renk = DURUM_RENK[r.Durum] ?? '#9ca3af';
          return (
            <View key={r.RandevuID} style={[styles.programSatir, { backgroundColor: c.card }]}>
              {/* Sol: sıra + saat */}
              <View style={styles.programSolKol}>
                <Text style={[styles.programSira, { color: c.textFaint }]}>{idx + 1}</Text>
                <View style={[styles.saatKutu, { backgroundColor: '#10b981' + '18' }]}>
                  <Text style={[styles.saatYazi, { color: '#10b981' }]}>
                    {r.RandevuSaati?.slice(0, 5)}
                  </Text>
                </View>
              </View>
              {/* Orta: hasta bilgisi */}
              <View style={{ flex: 1 }}>
                <Text style={[styles.hastaAdi, { color: c.text }]}>{r.HastaAdi}</Text>
                <Text style={[styles.randevuAlt, { color: c.textMuted }]}>
                  {r.RandevuTipi}
                </Text>
                {r.Notlar ? (
                  <Text style={[styles.hastaNotlar, { color: c.textFaint }]} numberOfLines={1}>
                    {r.Notlar}
                  </Text>
                ) : null}
              </View>
              {/* Sağ: durum */}
              <View style={[styles.durumBadge, { backgroundColor: renk + '20' }]}>
                <Text style={[styles.durumYazi, { color: renk }]}>{r.Durum}</Text>
              </View>
            </View>
          );
        })
      )}

      {/* Bekleyen onaylar */}
      {bekleyenler.length > 0 && (
        <>
          <Text style={[styles.bolumBaslik, { color: c.text }]}>
            ⏳ Bekleyen Onaylar ({bekleyenler.length})
          </Text>
          {bekleyenler.slice(0, 4).map(r => (
            <View key={r.RandevuID} style={[styles.bekleyenKart, { backgroundColor: c.card }]}>
              <View style={[styles.bekleyenIkon, { backgroundColor: '#f59e0b18' }]}>
                <Text style={{ fontSize: 20 }}>👤</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.hastaAdi, { color: c.text }]}>{r.HastaAdi}</Text>
                <Text style={[styles.randevuAlt, { color: c.textMuted }]}>
                  {r.RandevuTarihi?.split('T')[0]} • {r.RandevuSaati?.slice(0, 5)} • {r.RandevuTipi}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.onayButon, onaylaniyor === r.RandevuID && { opacity: 0.6 }]}
                onPress={() => onayla(r.RandevuID)}
                disabled={onaylaniyor === r.RandevuID}
              >
                {onaylaniyor === r.RandevuID
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.onayButonYazi}>Onayla</Text>
                }
              </TouchableOpacity>
            </View>
          ))}
          {bekleyenler.length > 4 && (
            <TouchableOpacity
              style={[styles.dahaFazlaButon, { backgroundColor: c.card }]}
              onPress={() => navigation.navigate('Randevularım')}
            >
              <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 14 }}>
                +{bekleyenler.length - 4} daha fazla gör →
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Hızlı erişim */}
      <Text style={[styles.bolumBaslik, { color: c.text }]}>⚡ Hızlı Erişim</Text>
      <View style={styles.hizliGrid}>
        {[
          { emj: '📅', ad: 'Tüm Randevular', hedef: 'Randevularım', renk: '#10b981' },
          { emj: '📊', ad: 'İstatistiklerim', hedef: 'İstatistiklerim', renk: '#6366f1' },
          { emj: '🕐', ad: 'Çalışma Saatleri', hedef: 'Çalışma Saatleri', renk: '#f59e0b' },
          { emj: '👤', ad: 'Profilim', hedef: 'Profilim', renk: '#0ea5e9' },
        ].map(item => (
          <TouchableOpacity
            key={item.ad}
            style={[styles.hizliButon, { backgroundColor: item.renk + '15' }]}
            onPress={() => navigation.navigate(item.hedef)}
          >
            <Text style={{ fontSize: 30, marginBottom: 6 }}>{item.emj}</Text>
            <Text style={[styles.hizliButonYazi, { color: item.renk }]}>{item.ad}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Son 30 gün özet */}
      {ozet && (
        <>
          <Text style={[styles.bolumBaslik, { color: c.text }]}>📈 Son 30 Gün</Text>
          <View style={[styles.son30Kart, { backgroundColor: c.card }]}>
            <View style={styles.son30Satir}>
              <Text style={[styles.son30Etiket, { color: c.textMuted }]}>Toplam randevu</Text>
              <Text style={[styles.son30Sayi, { color: c.text }]}>{ozet.son30Gun}</Text>
            </View>
            <View style={[styles.ayrac, { backgroundColor: c.border }]} />
            <View style={styles.son30Satir}>
              <Text style={[styles.son30Etiket, { color: c.textMuted }]}>Tamamlanan</Text>
              <Text style={[styles.son30Sayi, { color: '#10b981' }]}>{ozet.tamamlanan}</Text>
            </View>
            <View style={[styles.ayrac, { backgroundColor: c.border }]} />
            <View style={styles.son30Satir}>
              <Text style={[styles.son30Etiket, { color: c.textMuted }]}>İptal</Text>
              <Text style={[styles.son30Sayi, { color: '#ef4444' }]}>{ozet.iptalEdilen}</Text>
            </View>
            <View style={[styles.ayrac, { backgroundColor: c.border }]} />
            <View style={styles.son30Satir}>
              <Text style={[styles.son30Etiket, { color: c.textMuted }]}>Gelmedi</Text>
              <Text style={[styles.son30Sayi, { color: '#f97316' }]}>{ozet.gelmedi}</Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  selamKart: {
    borderRadius: 20, padding: 22, marginBottom: 18,
    backgroundColor: '#10b981',
  },
  selamUst: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' },
  selamAd: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  selamTarih: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 6 },

  ozetSatir: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  ozetKart: { width: '30%', borderRadius: 14, padding: 12, alignItems: 'center', borderTopWidth: 3, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
  ozetSayi: { fontSize: 20, fontWeight: '800' },
  ozetEtiket: { fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  ozetAlt: { fontSize: 10, marginTop: 2, textAlign: 'center' },

  bolumBaslik: { fontSize: 15, fontWeight: '700', marginBottom: 12, marginTop: 6 },

  bosKart: { borderRadius: 16, padding: 32, alignItems: 'center', marginBottom: 16 },
  bosYazi: { fontSize: 15, fontWeight: '600' },
  bosAlt: { fontSize: 12, marginTop: 4 },

  programSatir: {
    borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  programSolKol: { alignItems: 'center', gap: 4 },
  programSira: { fontSize: 10, fontWeight: '700' },
  saatKutu: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  saatYazi: { fontSize: 13, fontWeight: '800' },
  hastaAdi: { fontSize: 14, fontWeight: '700' },
  randevuAlt: { fontSize: 12, marginTop: 2 },
  hastaNotlar: { fontSize: 11, marginTop: 2 },
  durumBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  durumYazi: { fontSize: 11, fontWeight: '700' },

  bekleyenKart: {
    borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  bekleyenIkon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  onayButon: { backgroundColor: '#10b981', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  onayButonYazi: { color: '#fff', fontWeight: '700', fontSize: 13 },
  dahaFazlaButon: { borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },

  hizliGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 22 },
  hizliButon: { width: '47%', borderRadius: 18, padding: 20, alignItems: 'center' },
  hizliButonYazi: { fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 2 },

  son30Kart: { borderRadius: 14, padding: 16, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  son30Satir: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  son30Etiket: { fontSize: 14, fontWeight: '500' },
  son30Sayi: { fontSize: 16, fontWeight: '800' },
  ayrac: { height: 1 },
});
