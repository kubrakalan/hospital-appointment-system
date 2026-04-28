import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { api } from '../../api';
import { useTheme } from '../../theme';
import { KartSkeleton } from '../../components/Skeleton';

interface Randevu {
  RandevuID: number;
  DoktorAdi: string;
  UzmanlikAdi: string;
  RandevuTarihi: string;
  RandevuSaati: string;
  Durum: string;
}

interface TibbiBilgi {
  Tani: string | null;
  UygulananIslem: string | null;
  Recete: string | null;
  LabNotu: string | null;
  SonrakiKontrol: string | null;
}

function tarihFormatla(tarih: string) {
  const [yil, ay, gun] = tarih.split('T')[0].split('-');
  const aylar = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  return `${gun} ${aylar[parseInt(ay)-1]} ${yil}`;
}

function YildizPuan({ puan, onChange }: { puan: number; onChange: (p: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 10 }}>
      {[1, 2, 3, 4, 5].map(y => (
        <TouchableOpacity key={y} onPress={() => onChange(y)}>
          <Text style={{ fontSize: 38, color: y <= puan ? '#f59e0b' : '#d1d5db' }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function TibbiGecmisEkrani() {
  const { c } = useTheme();
  const [kayitlar, setKayitlar] = useState<{ randevu: Randevu; tibbi: TibbiBilgi | null }[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  const [degYapildi, setDegYapildi] = useState<Record<number, boolean>>({});
  const [degModal, setDegModal] = useState(false);
  const [seciliRandevuId, setSeciliRandevuId] = useState<number | null>(null);
  const [degPuan, setDegPuan] = useState(5);
  const [degYorum, setDegYorum] = useState('');
  const [degGonderiliyor, setDegGonderiliyor] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const data = await api.randevularim();
      const liste: Randevu[] = Array.isArray(data) ? data : [];
      const tamamlananlar = liste.filter(r => r.Durum === 'Tamamlandı' || r.Durum === 'Gelmedi');
      const sonuclar = await Promise.all(
        tamamlananlar.map(async (rv) => {
          try {
            const tibbi = await api.tibbiBilgiHasta(rv.RandevuID);
            return { randevu: rv, tibbi };
          } catch {
            return { randevu: rv, tibbi: null };
          }
        })
      );
      setKayitlar(sonuclar);

      // Mevcut değerlendirmeleri kontrol et
      const yapildi: Record<number, boolean> = {};
      await Promise.all(
        tamamlananlar
          .filter(r => r.Durum === 'Tamamlandı')
          .map(async (rv) => {
            try {
              await api.degerlendirmeGetir(rv.RandevuID);
              yapildi[rv.RandevuID] = true;
            } catch {
              yapildi[rv.RandevuID] = false;
            }
          })
      );
      setDegYapildi(yapildi);
    } catch {
    } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  function degerlendirmeAc(randevuId: number) {
    setSeciliRandevuId(randevuId);
    setDegPuan(5);
    setDegYorum('');
    setDegModal(true);
  }

  async function degerlendirmeGonder() {
    if (!seciliRandevuId) return;
    setDegGonderiliyor(true);
    try {
      await api.degerlendirmeGonder(seciliRandevuId, degPuan, degYorum.trim() || undefined);
      setDegYapildi(prev => ({ ...prev, [seciliRandevuId]: true }));
      setDegModal(false);
      Alert.alert('Teşekkürler!', 'Değerlendirmeniz kaydedildi.');
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Değerlendirme gönderilemedi.');
    } finally {
      setDegGonderiliyor(false);
    }
  }

  if (yukleniyor) {
    return (
      <ScrollView style={[styles.kapsayici, { backgroundColor: c.bg }]} contentContainerStyle={{ padding: 16 }}>
        {[1, 2, 3].map(i => <KartSkeleton key={i} />)}
      </ScrollView>
    );
  }

  if (kayitlar.length === 0) {
    return (
      <View style={[styles.orta, { backgroundColor: c.bg }]}>
        <Text style={styles.bosEmoji}>🗂️</Text>
        <Text style={[styles.bosYazi, { color: c.textFaint }]}>Henüz tamamlanmış randevunuz yok.</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={[styles.kapsayici, { backgroundColor: c.bg }]}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); yukle(); }} tintColor="#0ea5e9" />}
      >
        {kayitlar.map(({ randevu, tibbi }) => (
          <View key={randevu.RandevuID} style={[styles.kart, { backgroundColor: c.card }]}>
            <View style={[styles.kartBaslik, { borderBottomColor: c.border }]}>
              <View>
                <Text style={[styles.doktorAd, { color: c.text }]}>Dr. {randevu.DoktorAdi}</Text>
                <Text style={[styles.uzmanlik, { color: c.textMuted }]}>{randevu.UzmanlikAdi}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.tarih, { color: c.textMuted }]}>{tarihFormatla(randevu.RandevuTarihi)}</Text>
                <Text style={[styles.saat, { color: c.textFaint }]}>{String(randevu.RandevuSaati).substring(0, 5)}</Text>
              </View>
            </View>

            {!tibbi ? (
              <Text style={[styles.bosKayit, { color: c.textFaint }]}>Bu randevu için tıbbi kayıt girilmemiş.</Text>
            ) : (
              <View style={styles.bilgiGrid}>
                {[
                  { icon: '🔬', label: 'Tanı', deger: tibbi.Tani },
                  { icon: '💊', label: 'Reçete', deger: tibbi.Recete },
                  { icon: '🩺', label: 'Uygulanan İşlem', deger: tibbi.UygulananIslem },
                  { icon: '🧪', label: 'Lab / Tahlil', deger: tibbi.LabNotu },
                  { icon: '📅', label: 'Sonraki Kontrol', deger: tibbi.SonrakiKontrol ? tarihFormatla(tibbi.SonrakiKontrol) : null },
                ].filter(f => f.deger).map(f => (
                  <View key={f.label} style={[styles.bilgiSatir, { backgroundColor: c.surface }]}>
                    <Text style={[styles.bilgiLabel, { color: c.textMuted }]}>{f.icon} {f.label}</Text>
                    <Text style={[styles.bilgiDeger, { color: c.text }]}>{f.deger}</Text>
                  </View>
                ))}
              </View>
            )}

            {randevu.Durum === 'Tamamlandı' && (
              <View style={{ marginTop: 12 }}>
                {degYapildi[randevu.RandevuID] ? (
                  <View style={styles.degYapildi}>
                    <Text style={styles.degYapildiYazi}>⭐ Değerlendirildi</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.degButon}
                    onPress={() => degerlendirmeAc(randevu.RandevuID)}
                  >
                    <Text style={styles.degButonYazi}>⭐ Değerlendir</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Değerlendirme Modalı */}
      <Modal visible={degModal} transparent animationType="slide" onRequestClose={() => setDegModal(false)}>
        <View style={styles.modalArka}>
          <View style={[styles.modalKutu, { backgroundColor: c.card }]}>
            <Text style={[styles.modalBaslik, { color: c.text }]}>Randevuyu Değerlendir</Text>
            <Text style={[styles.modalAlt, { color: c.textMuted }]}>Deneyiminizi puanlayın</Text>

            <YildizPuan puan={degPuan} onChange={setDegPuan} />

            <TextInput
              style={[styles.yorumGirdi, { backgroundColor: c.input, borderColor: c.border, color: c.text }]}
              placeholder="Yorumunuz (isteğe bağlı)"
              placeholderTextColor={c.textFaint}
              value={degYorum}
              onChangeText={setDegYorum}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButonlar}>
              <TouchableOpacity
                style={[styles.modalButon, { backgroundColor: c.surface }]}
                onPress={() => setDegModal(false)}
              >
                <Text style={[styles.modalButonYazi, { color: c.textMuted }]}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButon, styles.modalButonPrimary, degGonderiliyor && { opacity: 0.6 }]}
                onPress={degerlendirmeGonder}
                disabled={degGonderiliyor}
              >
                {degGonderiliyor
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={[styles.modalButonYazi, { color: '#fff' }]}>Gönder</Text>
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
  kapsayici: { flex: 1 },
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bosEmoji: { fontSize: 48, marginBottom: 12 },
  bosYazi: { fontSize: 15 },
  kart: {
    borderRadius: 14, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  kartBaslik: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1,
  },
  doktorAd: { fontSize: 15, fontWeight: '700' },
  uzmanlik: { fontSize: 12, marginTop: 2 },
  tarih: { fontSize: 12, fontWeight: '600' },
  saat: { fontSize: 11, marginTop: 2 },
  bosKayit: { fontSize: 13, fontStyle: 'italic' },
  bilgiGrid: { gap: 8 },
  bilgiSatir: { borderRadius: 10, padding: 12 },
  bilgiLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  bilgiDeger: { fontSize: 13, lineHeight: 20 },
  degButon: {
    backgroundColor: '#f59e0b', borderRadius: 10,
    paddingVertical: 9, alignItems: 'center',
  },
  degButonYazi: { color: '#fff', fontWeight: '700', fontSize: 14 },
  degYapildi: {
    borderRadius: 10, paddingVertical: 9, alignItems: 'center',
    backgroundColor: '#fef3c7',
  },
  degYapildiYazi: { color: '#92400e', fontWeight: '600', fontSize: 13 },
  modalArka: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalKutu: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
  },
  modalBaslik: { fontSize: 18, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  modalAlt: { fontSize: 13, textAlign: 'center', marginBottom: 4 },
  yorumGirdi: {
    borderWidth: 1, borderRadius: 12, padding: 12,
    fontSize: 14, marginTop: 12, minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButonlar: { flexDirection: 'row', gap: 12, marginTop: 18 },
  modalButon: {
    flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  modalButonPrimary: { backgroundColor: '#f59e0b' },
  modalButonYazi: { fontWeight: '700', fontSize: 15 },
});
