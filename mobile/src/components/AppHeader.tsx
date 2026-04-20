import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  kullanici: { ad: string; soyad: string; rol: string } | null;
  onCikis: () => void;
  renk?: string;
}

export default function AppHeader({ kullanici, onCikis, renk = '#0ea5e9' }: Props) {
  async function cikisYap() {
    await AsyncStorage.multiRemove(['token', 'kullanici']);
    onCikis();
  }

  return (
    <View style={[styles.header, { backgroundColor: renk }]}>
      <View>
        <Text style={styles.uygulama}>MediRandevu</Text>
        {kullanici && (
          <Text style={styles.kullanici}>
            {kullanici.ad} {kullanici.soyad}
            <Text style={styles.rol}> · {kullanici.rol}</Text>
          </Text>
        )}
      </View>
      <TouchableOpacity style={styles.cikisButon} onPress={cikisYap}>
        <Text style={styles.cikisYazi}>Çıkış</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 54, paddingBottom: 14, paddingHorizontal: 20,
  },
  uygulama: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  kullanici: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 2 },
  rol: { color: 'rgba(255,255,255,0.7)', fontWeight: '400', fontSize: 13 },
  cikisButon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
  },
  cikisYazi: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
