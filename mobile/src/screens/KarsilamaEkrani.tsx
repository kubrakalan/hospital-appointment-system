import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';

export default function KarsilamaEkrani({ navigation }: any) {
  useEffect(() => {
    const timer = setTimeout(() => navigation.replace('Giris'), 3000);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.kapsayici}>
      <StatusBar barStyle="light-content" backgroundColor="#0ea5e9" />

      {/* Logo alanı */}
      <View style={styles.logoAlani}>
        <View style={styles.logoKutu}>
          <Text style={styles.logoIkon}>🏥</Text>
        </View>
        <Text style={styles.baslik}>MediRandevu</Text>
        <Text style={styles.slogan}>Sağlığınız için akıllı randevu sistemi</Text>
      </View>

      {/* Özellikler */}
      <View style={styles.ozellikler}>
        {[
          { ikon: '📅', yazi: 'Kolayca randevu alın' },
          { ikon: '👨‍⚕️', yazi: 'Uzman doktorlarınızla buluşun' },
          { ikon: '🗂️', yazi: 'Tıbbi geçmişinizi takip edin' },
        ].map(o => (
          <View key={o.yazi} style={styles.ozellikSatir}>
            <Text style={styles.ozellikIkon}>{o.ikon}</Text>
            <Text style={styles.ozellikYazi}>{o.yazi}</Text>
          </View>
        ))}
      </View>

      {/* Buton */}
      <TouchableOpacity style={styles.buton} onPress={() => navigation.replace('Giris')}>
        <Text style={styles.butonYazi}>Başla →</Text>
      </TouchableOpacity>

      <Text style={styles.altYazi}>3 saniye içinde otomatik yönlendirileceksiniz</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    flex: 1,
    backgroundColor: '#0ea5e9',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 60,
    paddingHorizontal: 32,
  },
  logoAlani: { alignItems: 'center' },
  logoKutu: {
    width: 100, height: 100, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  logoIkon: { fontSize: 52 },
  baslik: { fontSize: 34, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  slogan: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 8, textAlign: 'center' },
  ozellikler: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, padding: 24, gap: 16,
  },
  ozellikSatir: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ozellikIkon: { fontSize: 24 },
  ozellikYazi: { color: '#fff', fontSize: 15, fontWeight: '500' },
  buton: {
    backgroundColor: '#fff',
    paddingHorizontal: 48, paddingVertical: 15,
    borderRadius: 50,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
  butonYazi: { color: '#0ea5e9', fontSize: 17, fontWeight: '800' },
  altYazi: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
});
