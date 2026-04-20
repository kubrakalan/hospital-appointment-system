import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, SafeAreaView, Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

const OZELLIKLER = [
  { ikon: '📅', baslik: 'Hızlı Randevu', aciklama: 'Dakikalar içinde randevunuzu alın' },
  { ikon: '👨‍⚕️', baslik: 'Uzman Doktorlar', aciklama: 'Alanında uzman hekimlerle buluşun' },
  { ikon: '🗂️', baslik: 'Tıbbi Geçmiş', aciklama: 'Sağlık kayıtlarınıza her zaman ulaşın' },
];

export default function KarsilamaEkrani({ navigation }: any) {
  return (
    <SafeAreaView style={styles.kapsayici}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Üst dekorasyon dairesi */}
      <View style={styles.dekorDaire1} />
      <View style={styles.dekorDaire2} />

      {/* Logo */}
      <View style={styles.logoAlani}>
        <View style={styles.logoHalka}>
          <View style={styles.logoKutu}>
            <Text style={styles.logoIkon}>🏥</Text>
          </View>
        </View>
        <Text style={styles.baslik}>MediRandevu</Text>
        <Text style={styles.slogan}>Sağlığınız için akıllı randevu sistemi</Text>
      </View>

      {/* Özellik kartları */}
      <View style={styles.kartlar}>
        {OZELLIKLER.map((o, i) => (
          <View key={i} style={styles.kart}>
            <View style={styles.kartIkonKutu}>
              <Text style={styles.kartIkon}>{o.ikon}</Text>
            </View>
            <View style={styles.kartMetin}>
              <Text style={styles.kartBaslik}>{o.baslik}</Text>
              <Text style={styles.kartAciklama}>{o.aciklama}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Alt buton alanı */}
      <View style={styles.altAlan}>
        <TouchableOpacity
          style={styles.anaButon}
          onPress={() => navigation.replace('Giris')}
          activeOpacity={0.85}
        >
          <Text style={styles.anaButonYazi}>Hemen Başla</Text>
          <Text style={styles.anaButonOk}>→</Text>
        </TouchableOpacity>
        <Text style={styles.altYazi}>Ücretsiz · Güvenli · Hızlı</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 40,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },

  // Dekor daireleri
  dekorDaire1: {
    position: 'absolute',
    width: 320, height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(14,165,233,0.12)',
    top: -80, right: -80,
  },
  dekorDaire2: {
    position: 'absolute',
    width: 220, height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(99,102,241,0.1)',
    bottom: 60, left: -60,
  },

  // Logo
  logoAlani: { alignItems: 'center', marginTop: 20 },
  logoHalka: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(14,165,233,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.3)',
  },
  logoKutu: {
    width: 88, height: 88, borderRadius: 24,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 16,
    elevation: 10,
  },
  logoIkon: { fontSize: 44 },
  baslik: {
    fontSize: 36, fontWeight: '800', color: '#f8fafc',
    letterSpacing: 0.5, marginBottom: 8,
  },
  slogan: {
    fontSize: 14, color: '#94a3b8',
    textAlign: 'center', lineHeight: 20,
  },

  // Kartlar
  kartlar: { width: '100%', gap: 12 },
  kart: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  kartIkonKutu: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(14,165,233,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  kartIkon: { fontSize: 22 },
  kartMetin: { flex: 1 },
  kartBaslik: { fontSize: 15, fontWeight: '700', color: '#f1f5f9', marginBottom: 2 },
  kartAciklama: { fontSize: 12, color: '#64748b', lineHeight: 17 },

  // Alt alan
  altAlan: { width: '100%', alignItems: 'center', gap: 14 },
  anaButon: {
    width: width - 48,
    backgroundColor: '#0ea5e9',
    paddingVertical: 17,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12,
    elevation: 8,
  },
  anaButonYazi: { color: '#fff', fontSize: 17, fontWeight: '800' },
  anaButonOk: { color: 'rgba(255,255,255,0.8)', fontSize: 20, fontWeight: '700' },
  altYazi: { color: '#475569', fontSize: 12, letterSpacing: 0.5 },
});
