import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../api';
import { useTheme } from '../../ThemeContext';

interface Mesaj {
  MesajID: number;
  Mesaj: string;
  GonderenAd: string;
  GonderenRol: string;
  GonderimTarihi: string;
  OkunduMu: boolean;
}

export default function MesajlasmaEkrani({ route }: any) {
  const { randevuId, karsiAd } = route.params as { randevuId: number; karsiAd: string };
  const { c } = useTheme();
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([]);
  const [yeniMesaj, setYeniMesaj] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gonderiyor, setGonderiyor] = useState(false);
  const [benimId, setBenimId] = useState<number>(0);
  const listRef = useRef<FlatList>(null);

  const yukle = useCallback(async () => {
    try {
      const kullanici = await AsyncStorage.getItem('kullanici');
      if (kullanici) setBenimId(JSON.parse(kullanici).kullaniciId);
      const data = await api.mesajlar(randevuId);
      setMesajlar(Array.isArray(data) ? data : []);
      await api.mesajlariOkundu(randevuId);
    } catch { } finally { setYukleniyor(false); }
  }, [randevuId]);

  useEffect(() => { yukle(); }, [yukle]);
  useEffect(() => {
    const iv = setInterval(yukle, 5000);
    return () => clearInterval(iv);
  }, [yukle]);

  async function gonder() {
    if (!yeniMesaj.trim()) return;
    setGonderiyor(true);
    const gecici = yeniMesaj.trim();
    setYeniMesaj('');
    try {
      await api.mesajGonder(randevuId, gecici);
      yukle();
    } catch (e: any) {
      Alert.alert('Hata', e.message);
      setYeniMesaj(gecici);
    } finally { setGonderiyor(false); }
  }

  function zamanFormatla(tarih: string) {
    const d = new Date(tarih);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  if (yukleniyor) return (
    <View style={[styles.orta, { backgroundColor: c.bg }]}>
      <ActivityIndicator size="large" color="#0ea5e9" />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.kapsayici, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={mesajlar}
        keyExtractor={m => String(m.MesajID)}
        contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.bosAlan}>
            <Text style={[styles.bosYazi, { color: c.textFaint }]}>
              💬 {karsiAd} ile mesajlaşmaya başla.{'\n'}Sorularını buradan iletebilirsin.
            </Text>
          </View>
        }
        renderItem={({ item: m }) => {
          const benim = m.GonderenRol === 'hasta' && benimId > 0;
          return (
            <View style={[styles.baloncukSatir, benim && styles.benimSatir]}>
              {!benim && <Text style={[styles.gonderen, { color: c.textMuted }]}>{m.GonderenAd}</Text>}
              <View style={[styles.baloncuk, benim ? styles.benimBalon : { backgroundColor: c.card }]}>
                <Text style={[styles.mesajMetin, { color: benim ? '#fff' : c.text }]}>{m.Mesaj}</Text>
                <Text style={[styles.zaman, { color: benim ? 'rgba(255,255,255,0.65)' : c.textFaint }]}>
                  {zamanFormatla(m.GonderimTarihi)}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <View style={[styles.altBar, { backgroundColor: c.card, borderTopColor: c.border }]}>
        <TextInput
          style={[styles.girdi, { backgroundColor: c.input, borderColor: c.border, color: c.text }]}
          value={yeniMesaj}
          onChangeText={setYeniMesaj}
          placeholder="Mesaj yaz..."
          placeholderTextColor={c.textFaint}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.gonderButon, (!yeniMesaj.trim() || gonderiyor) && styles.gonderDevre]}
          onPress={gonder}
          disabled={!yeniMesaj.trim() || gonderiyor}
        >
          {gonderiyor ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.gonderIkon}>➤</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bosAlan: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  bosYazi: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  baloncukSatir: { marginBottom: 10, maxWidth: '78%' },
  benimSatir: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  gonderen: { fontSize: 11, marginBottom: 3, marginLeft: 4 },
  baloncuk: { borderRadius: 16, padding: 12, paddingHorizontal: 14 },
  benimBalon: { backgroundColor: '#0ea5e9', borderBottomRightRadius: 4 },
  mesajMetin: { fontSize: 14, lineHeight: 20 },
  zaman: { fontSize: 10, marginTop: 4, textAlign: 'right' },
  altBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, gap: 10, borderTopWidth: 1 },
  girdi: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
  gonderButon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#0ea5e9', justifyContent: 'center', alignItems: 'center' },
  gonderDevre: { backgroundColor: '#7dd3fc' },
  gonderIkon: { color: '#fff', fontSize: 16 },
});
