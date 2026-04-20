import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { api } from '../../api';

interface Doktor {
  DoktorID: number;
  Ad: string;
  UzmanlikAdi: string;
  Durum: string;
}

const SAATLER = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];

function bugundenItibaren(gunSonra = 1) {
  const d = new Date();
  d.setDate(d.getDate() + gunSonra);
  return d.toISOString().split('T')[0];
}

export default function RandevuAlEkrani() {
  const [doktorlar, setDoktorlar] = useState<Doktor[]>([]);
  const [seciliDoktor, setSeciliDoktor] = useState<Doktor | null>(null);
  const [tarih, setTarih] = useState('');
  const [saat, setSaat] = useState('');
  const [notlar, setNotlar] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gonderiyor, setGonderiyor] = useState(false);
  const [uzmanlik, setUzmanlik] = useState('');

  useEffect(() => {
    api.doktorlar().then((d: Doktor[]) => {
      setDoktorlar(d.filter(dok => dok.Durum === 'Aktif'));
    }).finally(() => setYukleniyor(false));
  }, []);

  const uzmanliklar = [...new Set(doktorlar.map(d => d.UzmanlikAdi))];
  const filtreliDoktorlar = uzmanlik ? doktorlar.filter(d => d.UzmanlikAdi === uzmanlik) : doktorlar;

  async function randevuAl() {
    if (!seciliDoktor || !tarih || !saat) {
      Alert.alert('Eksik Bilgi', 'Lütfen doktor, tarih ve saat seçin.');
      return;
    }
    setGonderiyor(true);
    try {
      await api.randevuAl(seciliDoktor.DoktorID, tarih, saat, notlar || undefined);
      Alert.alert('Başarılı', 'Randevunuz alındı!', [{ text: 'Tamam' }]);
      setSeciliDoktor(null); setTarih(''); setSaat(''); setNotlar(''); setUzmanlik('');
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    } finally {
      setGonderiyor(false);
    }
  }

  if (yukleniyor) return <View style={styles.orta}><ActivityIndicator size="large" color="#0ea5e9" /></View>;

  return (
    <ScrollView style={styles.kapsayici} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

      {/* Uzmanlık filtresi */}
      <Text style={styles.etiket}>Uzmanlık Alanı</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingRight: 16 }}>
          {['Tümü', ...uzmanliklar].map(u => (
            <TouchableOpacity
              key={u}
              onPress={() => { setUzmanlik(u === 'Tümü' ? '' : u); setSeciliDoktor(null); }}
              style={[styles.filtreCip, uzmanlik === (u === 'Tümü' ? '' : u) && styles.filtreCipSecili]}
            >
              <Text style={[styles.filtreCipYazi, uzmanlik === (u === 'Tümü' ? '' : u) && styles.filtreCipYaziSecili]}>
                {u}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Doktor seçimi */}
      <Text style={styles.etiket}>Doktor Seç</Text>
      <View style={styles.doktorGrid}>
        {filtreliDoktorlar.map(d => (
          <TouchableOpacity
            key={d.DoktorID}
            onPress={() => setSeciliDoktor(d)}
            style={[styles.doktorKart, seciliDoktor?.DoktorID === d.DoktorID && styles.doktorKartSecili]}
          >
            <Text style={styles.doktorEmoji}>👨‍⚕️</Text>
            <Text style={[styles.doktorAd, seciliDoktor?.DoktorID === d.DoktorID && styles.seciliMetin]}>
              Dr. {d.Ad}
            </Text>
            <Text style={[styles.uzmanlik, seciliDoktor?.DoktorID === d.DoktorID && styles.seciliMetin]}>
              {d.UzmanlikAdi}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tarih */}
      <Text style={styles.etiket}>Tarih (YYYY-AA-GG)</Text>
      <TextInput
        style={styles.girdi}
        value={tarih}
        onChangeText={setTarih}
        placeholder={bugundenItibaren(1)}
        placeholderTextColor="#9ca3af"
        keyboardType="numeric"
      />

      {/* Saat */}
      <Text style={styles.etiket}>Saat</Text>
      <View style={styles.saatGrid}>
        {SAATLER.map(s => (
          <TouchableOpacity
            key={s}
            onPress={() => setSaat(s)}
            style={[styles.saatButon, saat === s && styles.saatButonSecili]}
          >
            <Text style={[styles.saatYazi, saat === s && styles.saatYaziSecili]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Not */}
      <Text style={styles.etiket}>Not (opsiyonel)</Text>
      <TextInput
        style={[styles.girdi, { height: 80, textAlignVertical: 'top' }]}
        value={notlar}
        onChangeText={setNotlar}
        placeholder="Şikayetinizi yazın..."
        placeholderTextColor="#9ca3af"
        multiline
      />

      {/* Özet */}
      {seciliDoktor && tarih && saat && (
        <View style={styles.ozet}>
          <Text style={styles.ozetBaslik}>Randevu Özeti</Text>
          <Text style={styles.ozetSatir}>👨‍⚕️ Dr. {seciliDoktor.Ad} — {seciliDoktor.UzmanlikAdi}</Text>
          <Text style={styles.ozetSatir}>📅 {tarih} · {saat}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.buton, gonderiyor && styles.butonDevre]}
        onPress={randevuAl}
        disabled={gonderiyor}
      >
        {gonderiyor
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.butonYazi}>Randevu Al</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1, backgroundColor: '#f0f9ff' },
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  etiket: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  filtreCip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  filtreCipSecili: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  filtreCipYazi: { fontSize: 13, color: '#6b7280' },
  filtreCipYaziSecili: { color: '#fff', fontWeight: '600' },
  doktorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  doktorKart: {
    width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  doktorKartSecili: { borderColor: '#0ea5e9', backgroundColor: '#f0f9ff' },
  doktorEmoji: { fontSize: 28, marginBottom: 6 },
  doktorAd: { fontSize: 13, fontWeight: '700', color: '#111827', textAlign: 'center' },
  uzmanlik: { fontSize: 11, color: '#6b7280', textAlign: 'center', marginTop: 2 },
  seciliMetin: { color: '#0ea5e9' },
  girdi: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 10, padding: 13, fontSize: 14, color: '#111827', marginBottom: 18,
  },
  saatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  saatButon: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
  },
  saatButonSecili: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  saatYazi: { fontSize: 13, color: '#374151' },
  saatYaziSecili: { color: '#fff', fontWeight: '600' },
  ozet: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#0ea5e9' },
  ozetBaslik: { fontWeight: '700', color: '#1e40af', marginBottom: 6, fontSize: 13 },
  ozetSatir: { fontSize: 13, color: '#1e40af', marginBottom: 3 },
  buton: { backgroundColor: '#0ea5e9', borderRadius: 12, padding: 16, alignItems: 'center' },
  butonDevre: { backgroundColor: '#7dd3fc' },
  butonYazi: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
