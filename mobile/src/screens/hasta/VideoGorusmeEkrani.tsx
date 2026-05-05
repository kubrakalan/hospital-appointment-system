import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Linking, Alert, ScrollView,
} from 'react-native';
import { api } from '../../api';
import { useTheme } from '../../ThemeContext';

interface OdaBilgi {
  odaId: string;
  jitsiUrl: string;
  displayAd: string;
  isHasta: boolean;
  randevuBilgi: {
    tarih: string;
    saat: string;
    doktorAdi: string;
    hastaAdi: string;
    uzmanlik: string;
  };
}

export default function VideoGorusmeEkrani({ route, navigation }: any) {
  const { randevuId } = route.params as { randevuId: number };
  const { c } = useTheme();
  const [oda, setOda] = useState<OdaBilgi | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');

  useEffect(() => {
    api.videoOdaGetir(randevuId)
      .then(setOda)
      .catch((e: Error) => setHata(e.message))
      .finally(() => setYukleniyor(false));
  }, [randevuId]);

  async function gorusmeyeKatil() {
    if (!oda) return;
    const url = oda.jitsiUrl;
    const destekleniyor = await Linking.canOpenURL(url);
    if (destekleniyor) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Hata', 'Tarayıcı açılamadı. Lütfen manuel olarak ziyaret edin: ' + url);
    }
  }

  if (yukleniyor) {
    return (
      <View style={[styles.orta, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={[styles.yukleniyorYazi, { color: c.textMuted }]}>Görüşme odası yükleniyor...</Text>
      </View>
    );
  }

  if (hata) {
    return (
      <View style={[styles.orta, { backgroundColor: c.bg }]}>
        <Text style={styles.hataEmoji}>⚠️</Text>
        <Text style={[styles.hataBaslik, { color: c.text }]}>Görüşmeye Katılılamadı</Text>
        <Text style={[styles.hataYazi, { color: c.textMuted }]}>{hata}</Text>
        <TouchableOpacity style={styles.geriButon} onPress={() => navigation.goBack()}>
          <Text style={styles.geriButonYazi}>← Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.kapsayici, { backgroundColor: c.bg }]} contentContainerStyle={styles.icerik}>

      {/* Başlık */}
      <View style={[styles.baslikKart, { backgroundColor: c.card }]}>
        <View style={styles.canliGosterge}>
          <View style={styles.canliNokta} />
          <Text style={styles.canliYazi}>Görüşme Hazır</Text>
        </View>
        <Text style={[styles.karsiTaraf, { color: c.text }]}>
          {oda?.isHasta ? `Dr. ${oda.randevuBilgi.doktorAdi}` : oda?.randevuBilgi.hastaAdi}
        </Text>
        <Text style={[styles.uzmanlik, { color: c.textMuted }]}>
          {oda?.randevuBilgi.uzmanlik}
        </Text>
        <Text style={[styles.zamanYazi, { color: c.textFaint }]}>
          📅 {oda?.randevuBilgi.tarih}  🕐 {oda?.randevuBilgi.saat}
        </Text>
      </View>

      {/* Katıl butonu */}
      <TouchableOpacity style={styles.katilButon} onPress={gorusmeyeKatil} activeOpacity={0.85}>
        <Text style={styles.katilIcon}>📹</Text>
        <Text style={styles.katilYazi}>Görüşmeye Katıl</Text>
        <Text style={styles.katilAlt}>Tarayıcıda açılacak</Text>
      </TouchableOpacity>

      {/* Bilgi kartı */}
      <View style={[styles.bilgiKart, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.bilgiBaslik, { color: c.text }]}>📋 Görüşme Hakkında</Text>
        <Text style={[styles.bilgiMadde, { color: c.textMuted }]}>
          • Görüşme tarayıcıda açılır — Jitsi Meet kullanılır
        </Text>
        <Text style={[styles.bilgiMadde, { color: c.textMuted }]}>
          • Mikrofon ve kamera izni istenebilir
        </Text>
        <Text style={[styles.bilgiMadde, { color: c.textMuted }]}>
          • Görüşme bağlantısı sadece randevu saatinde aktiftir
        </Text>
        <Text style={[styles.bilgiMadde, { color: c.textMuted }]}>
          • Tarayıcıyı kapatarak görüşmeden ayrılabilirsin
        </Text>
      </View>

      <TouchableOpacity style={[styles.geriLink, { borderColor: c.border }]} onPress={() => navigation.goBack()}>
        <Text style={[styles.geriLinkYazi, { color: c.textMuted }]}>← Randevularıma Dön</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  icerik: { padding: 20, paddingBottom: 40 },
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  yukleniyorYazi: { marginTop: 16, fontSize: 15 },
  hataEmoji: { fontSize: 48, marginBottom: 12 },
  hataBaslik: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  hataYazi: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  geriButon: {
    backgroundColor: '#0ea5e9', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  geriButonYazi: { color: '#fff', fontWeight: '700', fontSize: 15 },
  baslikKart: {
    borderRadius: 16, padding: 20, marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  canliGosterge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#dcfce7', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12,
  },
  canliNokta: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a',
  },
  canliYazi: { color: '#16a34a', fontWeight: '700', fontSize: 12 },
  karsiTaraf: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  uzmanlik: { fontSize: 14, marginBottom: 8 },
  zamanYazi: { fontSize: 13 },
  katilButon: {
    backgroundColor: '#16a34a', borderRadius: 16,
    paddingVertical: 20, alignItems: 'center', marginBottom: 20,
    shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  katilIcon: { fontSize: 36, marginBottom: 6 },
  katilYazi: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 2 },
  katilAlt: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  bilgiKart: {
    borderRadius: 14, padding: 16, marginBottom: 20,
    borderWidth: 1,
  },
  bilgiBaslik: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  bilgiMadde: { fontSize: 13, lineHeight: 22 },
  geriLink: {
    borderRadius: 12, borderWidth: 1,
    paddingVertical: 12, alignItems: 'center',
  },
  geriLinkYazi: { fontSize: 14, fontWeight: '600' },
});
