import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Modal,
  TextInput, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { api } from '../../api';
import { useTheme } from '../../theme';

interface Doktor {
  DoktorID: number;
  Ad: string;
  Soyad: string;
  Email: string;
  UzmanlikAdi: string;
  Telefon: string | null;
  Durum: string;
}

const DURUM_RENK: Record<string, string> = {
  'Aktif': '#10b981', 'İzinli': '#f59e0b', 'Ayrıldı': '#ef4444',
};

const bosForm = { ad: '', soyad: '', email: '', sifre: '', uzmanlikAdi: '', telefon: '' };

export default function AdminDoktorlarEkrani() {
  const { c } = useTheme();
  const [doktorlar, setDoktorlar] = useState<Doktor[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [modalGoster, setModalGoster] = useState(false);
  const [form, setForm] = useState(bosForm);
  const [kaydediyor, setKaydediyor] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const data = await api.adminDoktorlar();
      setDoktorlar(Array.isArray(data) ? data : data.doktorlar ?? []);
    } catch { } finally { setYukleniyor(false); setYenileniyor(false); }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  async function ekle() {
    if (!form.ad || !form.soyad || !form.email || !form.sifre || !form.uzmanlikAdi) {
      Alert.alert('Eksik Bilgi', 'Ad, soyad, e-posta, şifre ve uzmanlık zorunludur.');
      return;
    }
    setKaydediyor(true);
    try {
      await api.adminDoktorEkle({
        ad: form.ad, soyad: form.soyad, email: form.email,
        sifre: form.sifre, uzmanlikAdi: form.uzmanlikAdi,
        telefon: form.telefon || undefined,
      });
      Alert.alert('Başarılı', 'Doktor eklendi.');
      setModalGoster(false);
      setForm(bosForm);
      yukle();
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    } finally { setKaydediyor(false); }
  }

  function durumDegistir(doktor: Doktor) {
    Alert.alert(`Dr. ${doktor.Ad} ${doktor.Soyad}`, 'Durum seçin:', [
      { text: 'Aktif', onPress: () => guncelle(doktor.DoktorID, 'Aktif') },
      { text: 'İzinli', onPress: () => guncelle(doktor.DoktorID, 'İzinli') },
      { text: 'Ayrıldı', style: 'destructive', onPress: () => guncelle(doktor.DoktorID, 'Ayrıldı') },
      { text: 'Vazgeç', style: 'cancel' },
    ]);
  }

  async function guncelle(id: number, durum: string) {
    try {
      await api.adminDoktorDurumGuncelle(id, durum);
      setDoktorlar(prev => prev.map(d => d.DoktorID === id ? { ...d, Durum: durum } : d));
    } catch (err: any) { Alert.alert('Hata', err.message); }
  }

  async function sil(doktor: Doktor) {
    Alert.alert('Doktor Sil', `Dr. ${doktor.Ad} ${doktor.Soyad} silinecek. Emin misiniz?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive', onPress: async () => {
          try {
            await api.adminDoktorSil(doktor.DoktorID);
            setDoktorlar(prev => prev.filter(d => d.DoktorID !== doktor.DoktorID));
          } catch (err: any) { Alert.alert('Hata', err.message); }
        },
      },
    ]);
  }

  const girdi = (extra?: object) => ({
    ...styles.girdi, backgroundColor: c.input, borderColor: c.border, color: c.text, ...extra,
  });

  return (
    <View style={[styles.kapsayici, { backgroundColor: c.bg }]}>
      {/* Üst başlık + ekle butonu */}
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Text style={[styles.headerBaslik, { color: c.text }]}>Doktorlar ({doktorlar.length})</Text>
        <TouchableOpacity style={styles.ekleButon} onPress={() => setModalGoster(true)}>
          <Text style={styles.ekleYazi}>+ Ekle</Text>
        </TouchableOpacity>
      </View>

      {yukleniyor ? (
        <View style={styles.orta}><ActivityIndicator size="large" color="#8b5cf6" /></View>
      ) : (
        <FlatList
          data={doktorlar}
          keyExtractor={item => String(item.DoktorID)}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); yukle(); }} tintColor="#8b5cf6" />}
          ListEmptyComponent={<Text style={[styles.bosYazi, { color: c.textFaint }]}>Doktor bulunamadı.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.kart, { backgroundColor: c.card }]}>
              <View style={styles.kartUst}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarHarf}>{item.Ad?.[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ad, { color: c.text }]}>Dr. {item.Ad} {item.Soyad}</Text>
                  <Text style={[styles.uzmanlik, { color: c.textMuted }]}>{item.UzmanlikAdi}</Text>
                  <Text style={[styles.email, { color: c.textFaint }]}>{item.Email}</Text>
                </View>
                <View style={[styles.durumEtiket, { backgroundColor: DURUM_RENK[item.Durum] ?? '#9ca3af' }]}>
                  <Text style={styles.durumYazi}>{item.Durum}</Text>
                </View>
              </View>
              {item.Telefon && <Text style={[styles.telefon, { color: c.textMuted, borderTopColor: c.border }]}>📱 {item.Telefon}</Text>}
              <View style={[styles.aksiyon, { borderTopColor: c.border }]}>
                <TouchableOpacity style={[styles.akBtn, { backgroundColor: '#ede9fe' }]} onPress={() => durumDegistir(item)}>
                  <Text style={[styles.akBtnYazi, { color: '#7c3aed' }]}>Durum</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.akBtn, { backgroundColor: '#fef2f2' }]} onPress={() => sil(item)}>
                  <Text style={[styles.akBtnYazi, { color: '#dc2626' }]}>Sil</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Doktor Ekle Modalı */}
      <Modal visible={modalGoster} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalHeader, { backgroundColor: c.card, borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={() => { setModalGoster(false); setForm(bosForm); }}>
              <Text style={{ color: '#0ea5e9', fontSize: 15 }}>İptal</Text>
            </TouchableOpacity>
            <Text style={[styles.modalBaslik, { color: c.text }]}>Yeni Doktor Ekle</Text>
            <TouchableOpacity onPress={ekle} disabled={kaydediyor}>
              {kaydediyor ? <ActivityIndicator color="#8b5cf6" /> : <Text style={{ color: '#8b5cf6', fontSize: 15, fontWeight: '700' }}>Kaydet</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
            {[
              { alan: 'ad', ph: 'Ad', kb: 'default' },
              { alan: 'soyad', ph: 'Soyad', kb: 'default' },
              { alan: 'email', ph: 'E-posta', kb: 'email-address' },
              { alan: 'sifre', ph: 'Şifre (en az 6 karakter)', kb: 'default', secure: true },
              { alan: 'uzmanlikAdi', ph: 'Uzmanlık (örn: Kardiyoloji)', kb: 'default' },
              { alan: 'telefon', ph: 'Telefon (opsiyonel)', kb: 'phone-pad' },
            ].map(({ alan, ph, kb, secure }) => (
              <View key={alan}>
                <Text style={[styles.etiket, { color: c.textMuted }]}>{ph}</Text>
                <TextInput
                  style={girdi()}
                  value={(form as any)[alan]}
                  onChangeText={v => setForm(f => ({ ...f, [alan]: v }))}
                  placeholder={ph}
                  placeholderTextColor={c.textFaint}
                  keyboardType={kb as any}
                  secureTextEntry={secure}
                  autoCapitalize={kb === 'email-address' ? 'none' : 'words'}
                />
              </View>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1 },
  headerBaslik: { fontSize: 15, fontWeight: '700' },
  ekleButon: { backgroundColor: '#8b5cf6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  ekleYazi: { color: '#fff', fontWeight: '700', fontSize: 13 },
  bosYazi: { textAlign: 'center', marginTop: 40 },
  kart: { borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },
  kartUst: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center' },
  avatarHarf: { color: '#fff', fontSize: 18, fontWeight: '700' },
  ad: { fontSize: 15, fontWeight: '700' },
  uzmanlik: { fontSize: 12, marginTop: 1 },
  email: { fontSize: 11, marginTop: 1 },
  durumEtiket: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  durumYazi: { color: '#fff', fontSize: 11, fontWeight: '700' },
  telefon: { fontSize: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  aksiyon: { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  akBtn: { flex: 1, borderRadius: 8, padding: 8, alignItems: 'center' },
  akBtnYazi: { fontWeight: '600', fontSize: 13 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  modalBaslik: { fontSize: 16, fontWeight: '700' },
  etiket: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  girdi: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
});
