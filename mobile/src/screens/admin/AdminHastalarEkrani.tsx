import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, Modal, ScrollView,
} from 'react-native';
import { api } from '../../api';
import { useTheme } from '../../theme';
import { KartSkeleton } from '../../components/Skeleton';

interface Hasta {
  HastaID: number;
  Ad: string;
  Soyad: string;
  Email: string;
  Telefon: string | null;
  TCKimlik: string | null;
  DogumTarihi: string | null;
  Cinsiyet: string | null;
  KanGrubu: string | null;
  KronikHastaliklar: string | null;
  Alerjiler: string | null;
  SurekliIlaclar: string | null;
  AcilKisiAd: string | null;
  AcilKisiTelefon: string | null;
  Adres: string | null;
  ToplamRandevu: number;
}

function tarihFormatla(tarih: string) {
  const [yil, ay, gun] = tarih.split('T')[0].split('-');
  const aylar = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  return `${gun} ${aylar[parseInt(ay)-1]} ${yil}`;
}

export default function AdminHastalarEkrani() {
  const { c } = useTheme();
  const [hastalar, setHastalar] = useState<Hasta[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [arama, setArama] = useState('');
  const [secili, setSecili] = useState<Hasta | null>(null);

  const yukle = useCallback(async () => {
    try {
      const data = await api.adminHastalar();
      setHastalar(Array.isArray(data) ? data : []);
    } catch { }
    finally { setYukleniyor(false); setYenileniyor(false); }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  const filtrelenmis = hastalar.filter(h =>
    arama === '' ||
    `${h.Ad} ${h.Soyad}`.toLowerCase().includes(arama.toLowerCase()) ||
    h.Email.toLowerCase().includes(arama.toLowerCase()) ||
    (h.TCKimlik ?? '').includes(arama)
  );

  return (
    <View style={[styles.kapsayici, { backgroundColor: c.bg }]}>
      {/* Arama */}
      <View style={[styles.aramaKutu, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TextInput
          style={[styles.aramaGirdi, { backgroundColor: c.input, borderColor: c.border, color: c.text }]}
          placeholder="Ad, e-posta veya TC ara..."
          placeholderTextColor={c.textFaint}
          value={arama}
          onChangeText={setArama}
        />
        <Text style={[styles.sayac, { color: c.textFaint }]}>{filtrelenmis.length} hasta</Text>
      </View>

      {yukleniyor ? (
        <View style={{ padding: 16 }}>
          {[1,2,3,4].map(i => <KartSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={filtrelenmis}
          keyExtractor={item => String(item.HastaID)}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={yenileniyor}
              onRefresh={() => { setYenileniyor(true); yukle(); }}
              tintColor="#8b5cf6"
            />
          }
          ListEmptyComponent={
            <Text style={[styles.bosYazi, { color: c.textFaint }]}>Hasta bulunamadı.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.kart, { backgroundColor: c.card }]}
              onPress={() => setSecili(item)}
              activeOpacity={0.7}
            >
              <View style={styles.kartIc}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarHarf}>{item.Ad?.[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ad, { color: c.text }]}>{item.Ad} {item.Soyad}</Text>
                  <Text style={[styles.email, { color: c.textMuted }]}>{item.Email}</Text>
                  {item.Telefon && (
                    <Text style={[styles.telefon, { color: c.textFaint }]}>📱 {item.Telefon}</Text>
                  )}
                </View>
                <View style={[styles.randevuBadge, { backgroundColor: '#ede9fe' }]}>
                  <Text style={styles.randevuSayi}>{item.ToplamRandevu}</Text>
                  <Text style={styles.randevuLabel}>randevu</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Detay Modalı */}
      <Modal visible={!!secili} animationType="slide" presentationStyle="pageSheet">
        {secili && (
          <View style={{ flex: 1, backgroundColor: c.bg }}>
            <View style={[styles.modalHeader, { backgroundColor: c.card, borderBottomColor: c.border }]}>
              <View />
              <Text style={[styles.modalBaslik, { color: c.text }]}>{secili.Ad} {secili.Soyad}</Text>
              <TouchableOpacity onPress={() => setSecili(null)}>
                <Text style={{ color: '#8b5cf6', fontSize: 15, fontWeight: '600' }}>Kapat</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }}>
              {[
                { label: '📧 E-posta', deger: secili.Email },
                { label: '📱 Telefon', deger: secili.Telefon },
                { label: '🪪 TC Kimlik', deger: secili.TCKimlik },
                { label: '🎂 Doğum Tarihi', deger: secili.DogumTarihi ? tarihFormatla(secili.DogumTarihi) : null },
                { label: '👤 Cinsiyet', deger: secili.Cinsiyet },
                { label: '🩸 Kan Grubu', deger: secili.KanGrubu },
                { label: '🏥 Kronik Hastalıklar', deger: secili.KronikHastaliklar },
                { label: '⚠️ Alerjiler', deger: secili.Alerjiler },
                { label: '💊 Sürekli İlaçlar', deger: secili.SurekliIlaclar },
                { label: '🆘 Acil Kişi', deger: secili.AcilKisiAd },
                { label: '📞 Acil Telefon', deger: secili.AcilKisiTelefon },
                { label: '🏠 Adres', deger: secili.Adres },
              ].filter(f => f.deger).map(f => (
                <View key={f.label} style={[styles.detaySatir, { backgroundColor: c.surface }]}>
                  <Text style={[styles.detayLabel, { color: c.textMuted }]}>{f.label}</Text>
                  <Text style={[styles.detayDeger, { color: c.text }]}>{f.deger}</Text>
                </View>
              ))}
              <View style={[styles.detaySatir, { backgroundColor: '#ede9fe' }]}>
                <Text style={[styles.detayLabel, { color: '#7c3aed' }]}>📅 Toplam Randevu</Text>
                <Text style={[styles.detayDeger, { color: '#7c3aed', fontWeight: '700' }]}>{secili.ToplamRandevu}</Text>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  aramaKutu: { padding: 12, borderBottomWidth: 1, gap: 8 },
  aramaGirdi: { borderWidth: 1, borderRadius: 10, padding: 11, fontSize: 14 },
  sayac: { fontSize: 12, textAlign: 'right' },
  bosYazi: { textAlign: 'center', marginTop: 40 },
  kart: {
    borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  kartIc: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center',
  },
  avatarHarf: { color: '#fff', fontSize: 18, fontWeight: '700' },
  ad: { fontSize: 15, fontWeight: '700' },
  email: { fontSize: 12, marginTop: 1 },
  telefon: { fontSize: 11, marginTop: 1 },
  randevuBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  randevuSayi: { fontSize: 16, fontWeight: '700', color: '#7c3aed' },
  randevuLabel: { fontSize: 9, color: '#7c3aed' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1,
  },
  modalBaslik: { fontSize: 16, fontWeight: '700' },
  detaySatir: { borderRadius: 10, padding: 12 },
  detayLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  detayDeger: { fontSize: 14, lineHeight: 20 },
});
