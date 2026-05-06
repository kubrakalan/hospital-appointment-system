import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Alert, Modal,
} from 'react-native';
import { api } from '../../api';
import { useTheme } from '../../ThemeContext';

interface Yonetici {
  KullaniciID: number;
  Ad: string;
  Soyad: string;
  Email: string;
}

const bosForm = { ad: '', soyad: '', email: '', sifre: '' };

export default function AdminYoneticilerEkrani() {
  const { c } = useTheme();
  const [yoneticiler, setYoneticiler] = useState<Yonetici[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(bosForm);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [siliyor, setSiliyor] = useState<number | null>(null);

  const yukle = useCallback(async () => {
    try {
      const data = await api.adminYoneticiler();
      setYoneticiler(Array.isArray(data) ? data : []);
    } catch { } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  async function ekle() {
    if (!form.ad.trim() || !form.soyad.trim() || !form.email.trim() || !form.sifre) {
      Alert.alert('Hata', 'Tüm alanlar zorunludur.');
      return;
    }
    if (form.sifre.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır.');
      return;
    }
    setKaydediyor(true);
    try {
      await api.adminYoneticiEkle({
        ad: form.ad.trim(),
        soyad: form.soyad.trim(),
        email: form.email.trim(),
        sifre: form.sifre,
      });
      setModal(false);
      setForm(bosForm);
      yukle();
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    } finally {
      setKaydediyor(false);
    }
  }

  function silOnay(y: Yonetici) {
    Alert.alert(
      'Yönetici Sil',
      `${y.Ad} ${y.Soyad} (${y.Email}) adlı yöneticiyi silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil', style: 'destructive', onPress: async () => {
            setSiliyor(y.KullaniciID);
            try {
              await api.adminYoneticiSil(y.KullaniciID);
              yukle();
            } catch (e: any) {
              Alert.alert('Hata', e.message);
            } finally {
              setSiliyor(null);
            }
          }
        },
      ]
    );
  }

  if (yukleniyor) {
    return (
      <View style={[styles.orta, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={{ backgroundColor: c.bg }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={yenileniyor}
            onRefresh={() => { setYenileniyor(true); yukle(); }}
            tintColor="#6366f1"
          />
        }
      >
        {/* Başlık */}
        <View style={[styles.bilgiBanner, { backgroundColor: c.card }]}>
          <Text style={{ fontSize: 28, marginBottom: 8 }}>🛡️</Text>
          <Text style={[styles.bannerBaslik, { color: c.text }]}>Yönetici Hesapları</Text>
          <Text style={[styles.bannerAlt, { color: c.textMuted }]}>
            {yoneticiler.length} aktif yönetici · Admin rolüne sahip kullanıcılar tüm sisteme erişebilir
          </Text>
        </View>

        {/* Yönetici listesi */}
        {yoneticiler.map(y => (
          <View key={y.KullaniciID} style={[styles.kart, { backgroundColor: c.card }]}>
            <View style={[styles.avatar, { backgroundColor: '#6366f120' }]}>
              <Text style={[styles.avatarHarf, { color: '#6366f1' }]}>
                {y.Ad[0]}{y.Soyad[0]}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.yoneticiAd, { color: c.text }]}>{y.Ad} {y.Soyad}</Text>
              <Text style={[styles.yoneticiEmail, { color: c.textMuted }]}>{y.Email}</Text>
              <View style={[styles.adminRozetKutu, { backgroundColor: '#6366f115' }]}>
                <Text style={[styles.adminRozet, { color: '#6366f1' }]}>🛡️ Admin</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.silButon, siliyor === y.KullaniciID && { opacity: 0.5 }]}
              onPress={() => silOnay(y)}
              disabled={siliyor === y.KullaniciID}
            >
              {siliyor === y.KullaniciID
                ? <ActivityIndicator size="small" color="#ef4444" />
                : <Text style={styles.silIkon}>✕</Text>
              }
            </TouchableOpacity>
          </View>
        ))}

        {yoneticiler.length === 0 && (
          <View style={styles.bosKutu}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>👤</Text>
            <Text style={[styles.bosYazi, { color: c.textMuted }]}>Yönetici bulunamadı</Text>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModal(true)}>
        <Text style={styles.fabYazi}>+ Yeni Yönetici</Text>
      </TouchableOpacity>

      {/* Ekleme Modal */}
      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.modalArka}>
          <View style={[styles.modalKutu, { backgroundColor: c.card }]}>
            <Text style={[styles.modalBaslik, { color: c.text }]}>🛡️ Yeni Yönetici Ekle</Text>

            {[
              { key: 'ad', label: 'Ad', ph: 'Ad', type: 'default' },
              { key: 'soyad', label: 'Soyad', ph: 'Soyad', type: 'default' },
              { key: 'email', label: 'E-posta', ph: 'admin@hastane.com', type: 'email-address' },
              { key: 'sifre', label: 'Şifre', ph: 'Min. 6 karakter', type: 'default' },
            ].map(alan => (
              <View key={alan.key} style={{ marginBottom: 12 }}>
                <Text style={[styles.etiket, { color: c.textMuted }]}>{alan.label}</Text>
                <TextInput
                  style={[styles.girdi, { backgroundColor: c.input, borderColor: c.border, color: c.text }]}
                  value={(form as any)[alan.key]}
                  onChangeText={v => setForm(f => ({ ...f, [alan.key]: v }))}
                  placeholder={alan.ph}
                  placeholderTextColor={c.textFaint}
                  keyboardType={alan.type as any}
                  secureTextEntry={alan.key === 'sifre'}
                  autoCapitalize={alan.key === 'email' || alan.key === 'sifre' ? 'none' : 'words'}
                />
              </View>
            ))}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.buton, { backgroundColor: c.surface, flex: 1 }]}
                onPress={() => { setModal(false); setForm(bosForm); }}
              >
                <Text style={{ color: c.textMuted, fontWeight: '700' }}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.buton, { backgroundColor: '#6366f1', flex: 2 }, kaydediyor && { opacity: 0.6 }]}
                onPress={ekle}
                disabled={kaydediyor}
              >
                {kaydediyor
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#fff', fontWeight: '700' }}>Ekle</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  bilgiBanner: {
    borderRadius: 16, padding: 20, marginBottom: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  bannerBaslik: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  bannerAlt: { fontSize: 13, textAlign: 'center', lineHeight: 18 },

  kart: {
    borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarHarf: { fontSize: 16, fontWeight: '800' },
  yoneticiAd: { fontSize: 15, fontWeight: '700' },
  yoneticiEmail: { fontSize: 12, marginTop: 2 },
  adminRozetKutu: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 5 },
  adminRozet: { fontSize: 11, fontWeight: '700' },
  silButon: { padding: 8 },
  silIkon: { color: '#ef4444', fontSize: 18, fontWeight: '700' },

  bosKutu: { alignItems: 'center', paddingTop: 60 },
  bosYazi: { fontSize: 15, fontWeight: '600' },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    backgroundColor: '#6366f1', borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 14,
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  fabYazi: { color: '#fff', fontWeight: '700', fontSize: 15 },

  modalArka: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalKutu: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalBaslik: { fontSize: 18, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  etiket: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  girdi: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  buton: { borderRadius: 12, padding: 14, alignItems: 'center' },
});
