import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Alert,
} from 'react-native';
import { api } from '../api';
import { useTheme } from '../theme';

export default function KayitEkrani({ navigation }: any) {
  const { c } = useTheme();
  const [ad, setAd] = useState('');
  const [soyad, setSoyad] = useState('');
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [sifreTekrar, setSifreTekrar] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  async function kayitOl() {
    if (!ad || !soyad || !email || !sifre || !sifreTekrar) {
      Alert.alert('Eksik Bilgi', 'Tüm alanları doldurunuz.');
      return;
    }
    if (sifre.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (sifre !== sifreTekrar) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor.');
      return;
    }
    setYukleniyor(true);
    try {
      await api.register(ad.trim(), soyad.trim(), email.trim().toLowerCase(), sifre);
      Alert.alert('Kayıt Başarılı', 'Hesabınız oluşturuldu. Giriş yapabilirsiniz.', [
        { text: 'Giriş Yap', onPress: () => navigation.replace('Giris') },
      ]);
    } catch (err: any) {
      Alert.alert('Kayıt Başarısız', err.message);
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
        {/* Başlık */}
        <View style={styles.baslikAlani}>
          <Text style={[styles.logo, { color: '#0ea5e9' }]}>🏥 MediRandevu</Text>
          <Text style={[styles.baslik, { color: c.text }]}>Yeni Hesap Oluştur</Text>
          <Text style={[styles.altBaslik, { color: c.textMuted }]}>Bilgilerinizi girin</Text>
        </View>

        {/* Form */}
        <View style={[styles.kart, { backgroundColor: c.card }]}>
          <View style={styles.satirGrup}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.etiket, { color: c.textMuted }]}>Ad</Text>
              <TextInput style={girdi} value={ad} onChangeText={setAd}
                placeholder="Adınız" placeholderTextColor={c.textFaint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.etiket, { color: c.textMuted }]}>Soyad</Text>
              <TextInput style={girdi} value={soyad} onChangeText={setSoyad}
                placeholder="Soyadınız" placeholderTextColor={c.textFaint} />
            </View>
          </View>

          <Text style={[styles.etiket, { color: c.textMuted }]}>E-posta</Text>
          <TextInput style={girdi} value={email} onChangeText={setEmail}
            placeholder="ornek@mail.com" placeholderTextColor={c.textFaint}
            keyboardType="email-address" autoCapitalize="none" />

          <Text style={[styles.etiket, { color: c.textMuted }]}>Şifre</Text>
          <TextInput style={girdi} value={sifre} onChangeText={setSifre}
            placeholder="En az 6 karakter" placeholderTextColor={c.textFaint}
            secureTextEntry />

          <Text style={[styles.etiket, { color: c.textMuted }]}>Şifre Tekrar</Text>
          <TextInput style={girdi} value={sifreTekrar} onChangeText={setSifreTekrar}
            placeholder="Şifrenizi tekrar girin" placeholderTextColor={c.textFaint}
            secureTextEntry />

          <TouchableOpacity
            style={[styles.buton, yukleniyor && styles.butonDevre]}
            onPress={kayitOl}
            disabled={yukleniyor}
          >
            {yukleniyor
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.butonYazi}>Kayıt Ol</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Giriş linki */}
        <TouchableOpacity style={styles.linkSatir} onPress={() => navigation.replace('Giris')}>
          <Text style={[styles.linkYazi, { color: c.textMuted }]}>
            Zaten hesabınız var mı?{' '}
            <Text style={styles.linkVurgu}>Giriş Yap</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  icerik: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  baslikAlani: { alignItems: 'center', marginBottom: 28 },
  logo: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  baslik: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  altBaslik: { fontSize: 14 },
  kart: {
    borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
  },
  satirGrup: { flexDirection: 'row', gap: 10 },
  etiket: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  girdi: {
    borderWidth: 1, borderRadius: 10, padding: 13,
    fontSize: 15, marginBottom: 2,
  },
  buton: {
    backgroundColor: '#0ea5e9', borderRadius: 12,
    padding: 15, alignItems: 'center', marginTop: 20,
  },
  butonDevre: { backgroundColor: '#7dd3fc' },
  butonYazi: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkSatir: { alignItems: 'center', marginTop: 20 },
  linkYazi: { fontSize: 14 },
  linkVurgu: { color: '#0ea5e9', fontWeight: '700' },
});
