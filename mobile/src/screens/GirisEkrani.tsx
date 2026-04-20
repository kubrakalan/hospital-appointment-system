import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api';
import { useTheme } from '../theme';

export default function GirisEkrani({ navigation }: any) {
  const { c } = useTheme();
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');

  async function girisYap() {
    if (!email || !sifre) { setHata('E-posta ve şifre giriniz.'); return; }
    setHata('');
    setYukleniyor(true);
    try {
      const data = await api.login(email.trim(), sifre);
      await AsyncStorage.setItem('token', data.token);
      if (data.refreshToken) await AsyncStorage.setItem('refreshToken', data.refreshToken);
      await AsyncStorage.setItem('kullanici', JSON.stringify(data.kullanici));

      const rol = (data.kullanici.rol as string).toLowerCase();
      if (rol === 'hasta') navigation.replace('HastaAnaSayfa');
      else if (rol === 'doktor') navigation.replace('DoktorAnaSayfa');
      else if (rol === 'admin') navigation.replace('AdminAnaSayfa');
      else setHata('Bu rol mobil uygulamada desteklenmiyor.');
    } catch (err: any) {
      setHata(err.message);
    } finally {
      setYukleniyor(false);
    }
  }

  const girdi = {
    ...styles.girdi,
    backgroundColor: c.input,
    borderColor: c.border,
    color: c.text,
  };

  return (
    <KeyboardAvoidingView
      style={[styles.kapsayici, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoAlani}>
          <View style={styles.logoKutu}>
            <Text style={styles.logoEmoji}>🏥</Text>
          </View>
          <Text style={styles.logoYazi}>MediRandevu</Text>
          <Text style={[styles.slogan, { color: c.textMuted }]}>Sağlığınız için akıllı randevu</Text>
        </View>

        {/* Form kartı */}
        <View style={[styles.kart, { backgroundColor: c.card }]}>
          <Text style={[styles.karBaslik, { color: c.text }]}>Giriş Yap</Text>

          {hata ? (
            <View style={styles.hataKutu}>
              <Text style={styles.hataYazi}>{hata}</Text>
            </View>
          ) : null}

          <Text style={[styles.etiket, { color: c.textMuted }]}>E-posta</Text>
          <TextInput
            style={girdi}
            placeholder="ornek@mail.com"
            placeholderTextColor={c.textFaint}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[styles.etiket, { color: c.textMuted }]}>Şifre</Text>
          <TextInput
            style={girdi}
            placeholder="••••••"
            placeholderTextColor={c.textFaint}
            value={sifre}
            onChangeText={setSifre}
            secureTextEntry
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('SifremiUnuttum')}
            style={styles.unuttumLink}
          >
            <Text style={styles.unuttumYazi}>Şifremi Unuttum</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buton, yukleniyor && styles.butonDevre]}
            onPress={girisYap}
            disabled={yukleniyor}
          >
            {yukleniyor
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.butonYazi}>Giriş Yap</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Kayıt linki */}
        <TouchableOpacity style={styles.kayitLink} onPress={() => navigation.navigate('Kayit')}>
          <Text style={[styles.kayitYazi, { color: c.textMuted }]}>
            Hesabınız yok mu?{'  '}
            <Text style={styles.kayitVurgu}>Kayıt Ol</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  icerik: { flexGrow: 1, padding: 24, justifyContent: 'center', paddingBottom: 40 },
  logoAlani: { alignItems: 'center', marginBottom: 32 },
  logoKutu: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: '#0ea5e9', justifyContent: 'center',
    alignItems: 'center', marginBottom: 12,
    shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  logoEmoji: { fontSize: 36 },
  logoYazi: { fontSize: 26, fontWeight: '800', color: '#0ea5e9', marginBottom: 4 },
  slogan: { fontSize: 13 },
  kart: {
    borderRadius: 20, padding: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
  },
  karBaslik: { fontSize: 20, fontWeight: '700', marginBottom: 18 },
  hataKutu: {
    backgroundColor: '#fef2f2', borderRadius: 10, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#fca5a5',
  },
  hataYazi: { color: '#dc2626', fontSize: 13 },
  etiket: { fontSize: 12, fontWeight: '600', marginBottom: 7 },
  girdi: {
    borderWidth: 1, borderRadius: 10, padding: 13,
    fontSize: 15, marginBottom: 16,
  },
  unuttumLink: { alignSelf: 'flex-end', marginBottom: 18, marginTop: -8 },
  unuttumYazi: { color: '#0ea5e9', fontSize: 13, fontWeight: '600' },
  buton: {
    backgroundColor: '#0ea5e9', borderRadius: 12,
    padding: 15, alignItems: 'center',
  },
  butonDevre: { backgroundColor: '#7dd3fc' },
  butonYazi: { color: '#fff', fontSize: 16, fontWeight: '700' },
  kayitLink: { alignItems: 'center', marginTop: 24 },
  kayitYazi: { fontSize: 14 },
  kayitVurgu: { color: '#0ea5e9', fontWeight: '700' },
});
