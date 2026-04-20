import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { api } from '../api';
import { useTheme } from '../theme';

export default function SifremiUnuttumEkrani({ navigation }: any) {
  const { c } = useTheme();
  const [email, setEmail] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [gonderildi, setGonderildi] = useState(false);

  async function gonder() {
    if (!email) { Alert.alert('Hata', 'E-posta adresinizi girin.'); return; }
    setYukleniyor(true);
    try {
      await api.sifremiUnuttum(email.trim().toLowerCase());
      setGonderildi(true);
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.kapsayici, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.icerik}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.geriButon}>
          <Text style={{ color: '#0ea5e9', fontSize: 15, fontWeight: '600' }}>← Geri</Text>
        </TouchableOpacity>

        <Text style={[styles.baslik, { color: c.text }]}>Şifremi Unuttum</Text>
        <Text style={[styles.altBaslik, { color: c.textMuted }]}>
          E-posta adresinize şifre sıfırlama bağlantısı gönderilecektir.
        </Text>

        {gonderildi ? (
          <View style={[styles.basariKutu, { backgroundColor: c.card }]}>
            <Text style={styles.basariEmoji}>✅</Text>
            <Text style={[styles.basariBaslik, { color: c.text }]}>E-posta Gönderildi</Text>
            <Text style={[styles.basariYazi, { color: c.textMuted }]}>
              {email} adresine bağlantı gönderdik. Gelen kutunuzu ve spam klasörünüzü kontrol edin.
            </Text>
            <TouchableOpacity style={styles.buton} onPress={() => navigation.replace('Giris')}>
              <Text style={styles.butonYazi}>Giriş Sayfasına Dön</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.kart, { backgroundColor: c.card }]}>
            <Text style={[styles.etiket, { color: c.textMuted }]}>E-posta Adresi</Text>
            <TextInput
              style={[styles.girdi, { backgroundColor: c.input, borderColor: c.border, color: c.text }]}
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@mail.com"
              placeholderTextColor={c.textFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.buton, yukleniyor && styles.butonDevre]}
              onPress={gonder}
              disabled={yukleniyor}
            >
              {yukleniyor
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.butonYazi}>Bağlantı Gönder</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  icerik: { flex: 1, padding: 24, paddingTop: 60 },
  geriButon: { marginBottom: 28 },
  baslik: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  altBaslik: { fontSize: 14, lineHeight: 21, marginBottom: 28 },
  kart: {
    borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
  },
  etiket: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  girdi: {
    borderWidth: 1, borderRadius: 10, padding: 13,
    fontSize: 15, marginBottom: 18,
  },
  buton: {
    backgroundColor: '#0ea5e9', borderRadius: 12,
    padding: 15, alignItems: 'center',
  },
  butonDevre: { backgroundColor: '#7dd3fc' },
  butonYazi: { color: '#fff', fontSize: 16, fontWeight: '700' },
  basariKutu: {
    borderRadius: 20, padding: 28, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
  },
  basariEmoji: { fontSize: 52, marginBottom: 16 },
  basariBaslik: { fontSize: 20, fontWeight: '700', marginBottom: 10 },
  basariYazi: { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
});
