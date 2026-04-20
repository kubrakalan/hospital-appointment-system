import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api';

export default function ProfilEkrani() {
  const [profil, setProfil] = useState<any>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [duzenle, setDuzenle] = useState(false);
  const [form, setForm] = useState({ ad: '', soyad: '', telefon: '', kanGrubu: '' });
  const [kullaniciRol, setKullaniciRol] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('kullanici').then(k => {
      if (k) setKullaniciRol(JSON.parse(k).rol?.toLowerCase());
    });
    yukle();
  }, []);

  async function yukle() {
    try {
      const data = await api.profilim();
      setProfil(data);
      setForm({ ad: data.Ad || '', soyad: data.Soyad || '', telefon: data.Telefon || '', kanGrubu: data.KanGrubu || '' });
    } catch { } finally { setYukleniyor(false); }
  }

  async function kaydet() {
    setKaydediyor(true);
    try {
      await api.profilGuncelle({ ad: form.ad, soyad: form.soyad, telefon: form.telefon, kanGrubu: form.kanGrubu });
      await AsyncStorage.setItem('kullanici', JSON.stringify({ ...JSON.parse(await AsyncStorage.getItem('kullanici') || '{}'), ad: form.ad, soyad: form.soyad }));
      Alert.alert('Başarılı', 'Profil güncellendi.');
      setDuzenle(false);
      yukle();
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    } finally { setKaydediyor(false); }
  }

  if (yukleniyor) return <View style={styles.orta}><ActivityIndicator size="large" color="#0ea5e9" /></View>;

  const satirlar = [
    { ikon: '📧', etiket: 'E-posta', deger: profil?.Email },
    { ikon: '📱', etiket: 'Telefon', deger: profil?.Telefon || '—' },
    ...(kullaniciRol === 'hasta' ? [
      { ikon: '🩸', etiket: 'Kan Grubu', deger: profil?.KanGrubu || '—' },
      { ikon: '⚧', etiket: 'Cinsiyet', deger: profil?.Cinsiyet || '—' },
      { ikon: '🎂', etiket: 'Doğum Tarihi', deger: profil?.DogumTarihi ? profil.DogumTarihi.split('T')[0] : '—' },
    ] : [
      { ikon: '🏥', etiket: 'Uzmanlık', deger: profil?.UzmanlikAdi || '—' },
    ]),
  ];

  return (
    <ScrollView style={styles.kapsayici} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Avatar */}
      <View style={styles.avatarKutu}>
        <View style={styles.avatar}>
          <Text style={styles.avatarHarf}>{profil?.Ad?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={styles.tamAd}>{profil?.Ad} {profil?.Soyad}</Text>
        <Text style={styles.rolYazi}>{kullaniciRol === 'hasta' ? 'Hasta' : 'Doktor'}</Text>
      </View>

      {/* Bilgiler */}
      {!duzenle ? (
        <View style={styles.bolum}>
          {satirlar.map(s => (
            <View key={s.etiket} style={styles.satirKutu}>
              <Text style={styles.satirIcon}>{s.ikon}</Text>
              <View>
                <Text style={styles.satirEtiket}>{s.etiket}</Text>
                <Text style={styles.satirDeger}>{s.deger}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.duzenleButon} onPress={() => setDuzenle(true)}>
            <Text style={styles.duzenleYazi}>✏️ Düzenle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.bolum}>
          {[
            { alan: 'ad', etiket: 'Ad' },
            { alan: 'soyad', etiket: 'Soyad' },
            { alan: 'telefon', etiket: 'Telefon' },
            ...(kullaniciRol === 'hasta' ? [{ alan: 'kanGrubu', etiket: 'Kan Grubu (A+, B-, 0+ vb.)' }] : []),
          ].map(({ alan, etiket }) => (
            <View key={alan} style={{ marginBottom: 14 }}>
              <Text style={styles.satirEtiket}>{etiket}</Text>
              <TextInput
                style={styles.girdi}
                value={(form as any)[alan]}
                onChangeText={v => setForm(f => ({ ...f, [alan]: v }))}
                placeholder={etiket}
                placeholderTextColor="#9ca3af"
              />
            </View>
          ))}
          <View style={styles.butonSatir}>
            <TouchableOpacity style={[styles.kaydetButon, kaydediyor && { opacity: 0.6 }]} onPress={kaydet} disabled={kaydediyor}>
              {kaydediyor ? <ActivityIndicator color="#fff" /> : <Text style={styles.kaydetYazi}>Kaydet</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iptalButon} onPress={() => setDuzenle(false)}>
              <Text style={styles.iptalYazi}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1, backgroundColor: '#f0f9ff' },
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarKutu: { alignItems: 'center', paddingVertical: 28 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#0ea5e9', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarHarf: { color: '#fff', fontSize: 32, fontWeight: '700' },
  tamAd: { fontSize: 20, fontWeight: '700', color: '#111827' },
  rolYazi: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  bolum: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },
  satirKutu: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  satirIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  satirEtiket: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  satirDeger: { fontSize: 14, color: '#111827', fontWeight: '500' },
  duzenleButon: { marginTop: 14, alignItems: 'center', padding: 10 },
  duzenleYazi: { color: '#0ea5e9', fontWeight: '600', fontSize: 14 },
  girdi: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 14, color: '#111827' },
  butonSatir: { flexDirection: 'row', gap: 10, marginTop: 8 },
  kaydetButon: { flex: 1, backgroundColor: '#0ea5e9', borderRadius: 10, padding: 13, alignItems: 'center' },
  kaydetYazi: { color: '#fff', fontWeight: '700', fontSize: 14 },
  iptalButon: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 10, padding: 13, alignItems: 'center' },
  iptalYazi: { color: '#374151', fontWeight: '600', fontSize: 14 },
});
