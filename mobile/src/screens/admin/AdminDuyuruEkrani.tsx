import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { api } from '../../api';
import { useTheme } from '../../theme';

const SABLONLAR = [
  { baslik: 'Sistem Bakımı', mesaj: 'Sistemimiz bu gece 23:00-01:00 saatleri arasında bakıma alınacaktır. Bu sürede randevu alınamayacaktır.' },
  { baslik: 'Randevu Hatırlatma', mesaj: 'Yaklaşan randevularınızı unutmayın! Randevunuzu iptal etmeniz gerekiyorsa lütfen en az 24 saat öncesinden bildiriniz.' },
  { baslik: 'Yeni Özellik', mesaj: 'Hastanemize yeni bir uzmanlık birimi eklendi. Detaylar için web sitemizi ziyaret edebilirsiniz.' },
];

export default function AdminDuyuruEkrani() {
  const { c } = useTheme();
  const [baslik, setBaslik] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [gonderiyor, setGonderiyor] = useState(false);
  const [sonGonderilen, setSonGonderilen] = useState<{ baslik: string; zaman: string } | null>(null);

  async function gonder() {
    if (!baslik.trim() || !mesaj.trim()) {
      Alert.alert('Eksik Bilgi', 'Başlık ve mesaj alanları zorunludur.');
      return;
    }
    Alert.alert(
      'Duyuru Gönder',
      `Tüm hastalara "${baslik}" başlıklı duyuru gönderilecek. Emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Gönder', onPress: async () => {
            setGonderiyor(true);
            try {
              await api.adminTopluBildirim(baslik.trim(), mesaj.trim());
              setSonGonderilen({ baslik: baslik.trim(), zaman: new Date().toLocaleTimeString('tr-TR') });
              Alert.alert('Başarılı', 'Duyuru tüm hastalara gönderildi.');
              setBaslik('');
              setMesaj('');
            } catch (err: any) {
              Alert.alert('Hata', err.message);
            } finally {
              setGonderiyor(false);
            }
          },
        },
      ]
    );
  }

  function sablonSec(sablon: typeof SABLONLAR[0]) {
    setBaslik(sablon.baslik);
    setMesaj(sablon.mesaj);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.kapsayici, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Bilgi kartı */}
        <View style={[styles.bilgiKart, { backgroundColor: '#eff6ff', borderColor: '#93c5fd' }]}>
          <Text style={styles.bilgiIkon}>📢</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.bilgiBaslik}>Toplu Bildirim</Text>
            <Text style={styles.bilgiMetin}>
              Gönderilen duyuru tüm hastalara bildirim ve e-posta olarak iletilecektir.
            </Text>
          </View>
        </View>

        {/* Son gönderilen */}
        {sonGonderilen && (
          <View style={[styles.basariKart, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
            <Text style={styles.basariIkon}>✅</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.basariBaslik}>"{sonGonderilen.baslik}" gönderildi</Text>
              <Text style={styles.basariMetin}>{sonGonderilen.zaman}</Text>
            </View>
          </View>
        )}

        {/* Hazır şablonlar */}
        <Text style={[styles.bolumBaslik, { color: c.textMuted }]}>Hazır Şablonlar</Text>
        <View style={{ gap: 8, marginBottom: 20 }}>
          {SABLONLAR.map(s => (
            <TouchableOpacity
              key={s.baslik}
              style={[styles.sablon, { backgroundColor: c.card, borderColor: c.border }]}
              onPress={() => sablonSec(s)}
            >
              <Text style={[styles.sablonBaslik, { color: c.text }]}>{s.baslik}</Text>
              <Text style={[styles.sablonMetin, { color: c.textFaint }]} numberOfLines={2}>{s.mesaj}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form */}
        <Text style={[styles.bolumBaslik, { color: c.textMuted }]}>Duyuru Yaz</Text>

        <Text style={[styles.etiket, { color: c.textMuted }]}>Başlık</Text>
        <TextInput
          style={[styles.girdi, { backgroundColor: c.input, borderColor: c.border, color: c.text }]}
          value={baslik}
          onChangeText={setBaslik}
          placeholder="Duyuru başlığı..."
          placeholderTextColor={c.textFaint}
          maxLength={100}
        />
        <Text style={[styles.karakterSayaci, { color: c.textFaint }]}>{baslik.length}/100</Text>

        <Text style={[styles.etiket, { color: c.textMuted, marginTop: 4 }]}>Mesaj</Text>
        <TextInput
          style={[styles.girdi, { backgroundColor: c.input, borderColor: c.border, color: c.text, height: 120, textAlignVertical: 'top' }]}
          value={mesaj}
          onChangeText={setMesaj}
          placeholder="Duyuru içeriğini yazın..."
          placeholderTextColor={c.textFaint}
          multiline
          maxLength={500}
        />
        <Text style={[styles.karakterSayaci, { color: c.textFaint }]}>{mesaj.length}/500</Text>

        <TouchableOpacity
          style={[styles.gonderBtn, gonderiyor && { opacity: 0.6 }]}
          onPress={gonder}
          disabled={gonderiyor}
        >
          {gonderiyor
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.gonderYazi}>📨 Tüm Hastalara Gönder</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  bilgiKart: {
    flexDirection: 'row', gap: 12, padding: 14,
    borderRadius: 12, borderWidth: 1, marginBottom: 14,
  },
  bilgiIkon: { fontSize: 24 },
  bilgiBaslik: { fontSize: 13, fontWeight: '700', color: '#1e40af', marginBottom: 3 },
  bilgiMetin: { fontSize: 12, color: '#1d4ed8', lineHeight: 18 },
  basariKart: {
    flexDirection: 'row', gap: 12, padding: 14,
    borderRadius: 12, borderWidth: 1, marginBottom: 14,
  },
  basariIkon: { fontSize: 22 },
  basariBaslik: { fontSize: 13, fontWeight: '700', color: '#15803d' },
  basariMetin: { fontSize: 11, color: '#16a34a', marginTop: 2 },
  bolumBaslik: { fontSize: 12, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  sablon: { borderRadius: 12, padding: 14, borderWidth: 1 },
  sablonBaslik: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  sablonMetin: { fontSize: 12, lineHeight: 18 },
  etiket: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  girdi: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 4 },
  karakterSayaci: { fontSize: 11, textAlign: 'right', marginBottom: 14 },
  gonderBtn: {
    backgroundColor: '#8b5cf6', borderRadius: 14,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  gonderYazi: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
