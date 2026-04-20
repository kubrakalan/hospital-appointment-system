import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { api } from '../../api';
import { useTheme } from '../../theme';

interface Doktor {
  DoktorID: number;
  Ad: string;
  UzmanlikAdi: string;
  Durum: string;
}

const TUM_SAATLER = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];

function bugundenItibaren(gunSonra = 1) {
  const d = new Date();
  d.setDate(d.getDate() + gunSonra);
  return d.toISOString().split('T')[0];
}

export default function RandevuAlEkrani() {
  const { c } = useTheme();
  const [doktorlar, setDoktorlar] = useState<Doktor[]>([]);
  const [seciliDoktor, setSeciliDoktor] = useState<Doktor | null>(null);
  const [tarih, setTarih] = useState('');
  const [saat, setSaat] = useState('');
  const [notlar, setNotlar] = useState('');
  const [uzmanlik, setUzmanlik] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gonderiyor, setGonderiyor] = useState(false);
  const [doluSaatler, setDoluSaatler] = useState<string[]>([]);
  const [saatYukleniyor, setSaatYukleniyor] = useState(false);

  useEffect(() => {
    api.doktorlar().then((d: Doktor[]) => {
      setDoktorlar(d.filter(dok => dok.Durum === 'Aktif'));
    }).finally(() => setYukleniyor(false));
  }, []);

  // Doktor ve tarih seçildiğinde dolu saatleri çek
  useEffect(() => {
    if (!seciliDoktor || !tarih) { setDoluSaatler([]); setSaat(''); return; }
    setSaatYukleniyor(true);
    setSaat('');
    api.doluSaatler(seciliDoktor.DoktorID, tarih)
      .then((data: string[]) => setDoluSaatler(Array.isArray(data) ? data : []))
      .catch(() => setDoluSaatler([]))
      .finally(() => setSaatYukleniyor(false));
  }, [seciliDoktor, tarih]);

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
      setSeciliDoktor(null); setTarih(''); setSaat('');
      setNotlar(''); setUzmanlik(''); setDoluSaatler([]);
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    } finally {
      setGonderiyor(false);
    }
  }

  if (yukleniyor) return <View style={[styles.orta, { backgroundColor: c.bg }]}><ActivityIndicator size="large" color="#0ea5e9" /></View>;

  return (
    <ScrollView style={[styles.kapsayici, { backgroundColor: c.bg }]} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

      {/* Uzmanlık filtresi */}
      <Text style={[styles.etiket, { color: c.textMuted }]}>Uzmanlık Alanı</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['Tümü', ...uzmanliklar].map(u => (
            <TouchableOpacity
              key={u}
              onPress={() => { setUzmanlik(u === 'Tümü' ? '' : u); setSeciliDoktor(null); }}
              style={[styles.cip, { borderColor: c.border, backgroundColor: uzmanlik === (u === 'Tümü' ? '' : u) ? '#0ea5e9' : c.card }]}
            >
              <Text style={[styles.cipYazi, { color: uzmanlik === (u === 'Tümü' ? '' : u) ? '#fff' : c.textMuted }]}>
                {u}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Doktor seçimi */}
      <Text style={[styles.etiket, { color: c.textMuted }]}>Doktor Seç</Text>
      <View style={styles.doktorGrid}>
        {filtreliDoktorlar.map(d => {
          const secili = seciliDoktor?.DoktorID === d.DoktorID;
          return (
            <TouchableOpacity
              key={d.DoktorID}
              onPress={() => setSeciliDoktor(d)}
              style={[styles.doktorKart, { backgroundColor: c.card, borderColor: secili ? '#0ea5e9' : 'transparent' }]}
            >
              <Text style={styles.doktorEmoji}>👨‍⚕️</Text>
              <Text style={[styles.doktorAd, { color: secili ? '#0ea5e9' : c.text }]}>Dr. {d.Ad}</Text>
              <Text style={[styles.uzmanlik, { color: c.textMuted }]}>{d.UzmanlikAdi}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tarih */}
      <Text style={[styles.etiket, { color: c.textMuted }]}>Tarih (YYYY-AA-GG)</Text>
      <TextInput
        style={[styles.girdi, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
        value={tarih}
        onChangeText={setTarih}
        placeholder={bugundenItibaren(1)}
        placeholderTextColor={c.textFaint}
        keyboardType="numeric"
      />

      {/* Saat */}
      <Text style={[styles.etiket, { color: c.textMuted }]}>
        Saat {saatYukleniyor && <ActivityIndicator size="small" color="#0ea5e9" />}
      </Text>
      {!seciliDoktor || !tarih ? (
        <Text style={[styles.saatIpucu, { color: c.textFaint }]}>Önce doktor ve tarih seçin.</Text>
      ) : (
        <View style={styles.saatGrid}>
          {TUM_SAATLER.map(s => {
            const dolu = doluSaatler.some(ds => String(ds).substring(0, 5) === s);
            const secili = saat === s;
            return (
              <TouchableOpacity
                key={s}
                onPress={() => !dolu && setSaat(s)}
                disabled={dolu}
                style={[
                  styles.saatButon,
                  {
                    backgroundColor: dolu ? (c.surface) : secili ? '#0ea5e9' : c.card,
                    borderColor: dolu ? c.border : secili ? '#0ea5e9' : c.border,
                    opacity: dolu ? 0.5 : 1,
                  },
                ]}
              >
                <Text style={[styles.saatYazi, { color: dolu ? c.textFaint : secili ? '#fff' : c.text }]}>
                  {s}
                </Text>
                {dolu && <Text style={[styles.doluYazi, { color: c.textFaint }]}>Dolu</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Not */}
      <Text style={[styles.etiket, { color: c.textMuted, marginTop: 4 }]}>Not (opsiyonel)</Text>
      <TextInput
        style={[styles.girdi, { backgroundColor: c.card, borderColor: c.border, color: c.text, height: 80, textAlignVertical: 'top' }]}
        value={notlar}
        onChangeText={setNotlar}
        placeholder="Şikayetinizi yazın..."
        placeholderTextColor={c.textFaint}
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
        {gonderiyor ? <ActivityIndicator color="#fff" /> : <Text style={styles.butonYazi}>Randevu Al</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  etiket: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  cip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  cipYazi: { fontSize: 13, fontWeight: '500' },
  doktorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  doktorKart: {
    width: '47%', borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  doktorEmoji: { fontSize: 28, marginBottom: 6 },
  doktorAd: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  uzmanlik: { fontSize: 11, textAlign: 'center', marginTop: 2 },
  girdi: {
    borderWidth: 1, borderRadius: 10, padding: 13, fontSize: 14, marginBottom: 18,
  },
  saatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  saatButon: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, alignItems: 'center',
  },
  saatYazi: { fontSize: 13, fontWeight: '600' },
  doluYazi: { fontSize: 9, marginTop: 1 },
  saatIpucu: { fontSize: 13, marginBottom: 20, fontStyle: 'italic' },
  ozet: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#0ea5e9' },
  ozetBaslik: { fontWeight: '700', color: '#1e40af', marginBottom: 6, fontSize: 13 },
  ozetSatir: { fontSize: 13, color: '#1e40af', marginBottom: 3 },
  buton: { backgroundColor: '#0ea5e9', borderRadius: 12, padding: 16, alignItems: 'center' },
  butonDevre: { backgroundColor: '#7dd3fc' },
  butonYazi: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
