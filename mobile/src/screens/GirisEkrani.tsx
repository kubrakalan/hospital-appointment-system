import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api';

export default function GirisEkrani({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  async function girisYap() {
    if (!email || !sifre) {
      Alert.alert('Hata', 'Email ve şifre giriniz');
      return;
    }
    setYukleniyor(true);
    try {
      const data = await api.login(email.trim(), sifre);
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('kullanici', JSON.stringify(data.kullanici));

      const rol = (data.kullanici.rol as string).toLowerCase();
      if (rol === 'hasta') navigation.replace('HastaAnaSayfa');
      else if (rol === 'doktor') navigation.replace('DoktorAnaSayfa');
      else if (rol === 'admin') navigation.replace('AdminAnaSayfa');
      else Alert.alert('Hata', 'Bu rol mobil uygulamada desteklenmiyor');
    } catch (err: any) {
      Alert.alert('Giriş Başarısız', err.message);
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.kapsayici}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.kart}>
        <Text style={styles.baslik}>MediRandevu</Text>
        <Text style={styles.altBaslik}>Hesabınıza giriş yapın</Text>

        <TextInput
          style={styles.girdi}
          placeholder="E-posta adresi"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.girdi}
          placeholder="Şifre"
          placeholderTextColor="#9ca3af"
          value={sifre}
          onChangeText={setSifre}
          secureTextEntry
        />

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    flex: 1,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    padding: 24,
  },
  kart: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  baslik: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0ea5e9',
    textAlign: 'center',
    marginBottom: 4,
  },
  altBaslik: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 28,
  },
  girdi: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  buton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  butonDevre: {
    backgroundColor: '#7dd3fc',
  },
  butonYazi: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
