import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, RefreshControl, Modal, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { api } from '../../api';
import { useTheme } from '../../theme';
import { KartSkeleton } from '../../components/Skeleton';

interface Odeme {
  OdemeID: number;
  HastaAdi: string;
  DoktorAdi: string;
  UzmanlikAdi: string;
  RandevuTarihi: string;
  Tutar: number;
  Durum: string;
  OdemeYontemi: string;
}

interface Ozet {
  toplamGelir: number;
  bekleyenTutar: number;
  odenenSayi: number;
  bekleyenSayi: number;
}

const DURUM_RENK: Record<string, string> = {
  'Ödendi': '#10b981', 'Bekliyor': '#f59e0b', 'İptal': '#ef4444',
};

const YONTEMLER = ['Nakit', 'Kredi Kartı', 'Havale'];

function tarihFormatla(t: string) {
  const [yil, ay, gun] = t.split('T')[0].split('-');
  const aylar = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  return `${gun} ${aylar[parseInt(ay)-1]} ${yil}`;
}

export default function AdminOdemelerEkrani() {
  const { c } = useTheme();
  const [odemeler, setOdemeler] = useState<Odeme[]>([]);
  const [ozet, setOzet] = useState<Ozet | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [filtre, setFiltre] = useState('Hepsi');
  const [modalGoster, setModalGoster] = useState(false);
  const [form, setForm] = useState({ randevuId: '', tutar: '', yontem: 'Nakit', notlar: '' });
  const [kaydediyor, setKaydediyor] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const [od, oz] = await Promise.all([api.adminOdemeler(), api.adminOdemeOzet().catch(() => null)]);
      setOdemeler(Array.isArray(od) ? od : []);
      if (oz) setOzet(oz);
    } catch { }
    finally { setYukleniyor(false); setYenileniyor(false); }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  async function durumDegistir(odeme: Odeme) {
    Alert.alert(`Ödeme #${odeme.OdemeID}`, 'Durum seçin:', [
      { text: 'Ödendi', onPress: () => guncelle(odeme.OdemeID, 'Ödendi') },
      { text: 'Bekliyor', onPress: () => guncelle(odeme.OdemeID, 'Bekliyor') },
      { text: 'İptal', style: 'destructive', onPress: () => guncelle(odeme.OdemeID, 'İptal') },
      { text: 'Vazgeç', style: 'cancel' },
    ]);
  }

  async function guncelle(id: number, durum: string) {
    try {
      await api.adminOdemeDurumGuncelle(id, durum);
      setOdemeler(prev => prev.map(o => o.OdemeID === id ? { ...o, Durum: durum } : o));
    } catch (err: any) { Alert.alert('Hata', err.message); }
  }

  async function ekle() {
    if (!form.randevuId || !form.tutar) {
      Alert.alert('Eksik', 'Randevu ID ve tutar zorunludur.');
      return;
    }
    setKaydediyor(true);
    try {
      await api.adminOdemeEkle({
        randevuId: parseInt(form.randevuId),
        tutar: parseFloat(form.tutar),
        odemeYontemi: form.yontem,
        notlar: form.notlar || undefined,
      });
      Alert.alert('Başarılı', 'Ödeme eklendi.');
      setModalGoster(false);
      setForm({ randevuId: '', tutar: '', yontem: 'Nakit', notlar: '' });
      yukle();
    } catch (err: any) { Alert.alert('Hata', err.message); }
    finally { setKaydediyor(false); }
  }

  const filtrelenmis = odemeler.filter(o => filtre === 'Hepsi' || o.Durum === filtre);

  return (
    <View style={[styles.kapsayici, { backgroundColor: c.bg }]}>
      {/* Özet şerit */}
      {ozet && (
        <View style={[styles.ozetBar, { backgroundColor: c.card, borderBottomColor: c.border }]}>
          <View style={styles.ozetKutu}>
            <Text style={[styles.ozetSayi, { color: '#10b981' }]}>₺{(ozet.toplamGelir ?? 0).toLocaleString('tr-TR')}</Text>
            <Text style={[styles.ozetLabel, { color: c.textFaint }]}>Toplam Gelir</Text>
          </View>
          <View style={[styles.ozetAyrac, { backgroundColor: c.border }]} />
          <View style={styles.ozetKutu}>
            <Text style={[styles.ozetSayi, { color: '#f59e0b' }]}>₺{(ozet.bekleyenTutar ?? 0).toLocaleString('tr-TR')}</Text>
            <Text style={[styles.ozetLabel, { color: c.textFaint }]}>Bekleyen</Text>
          </View>
          <View style={[styles.ozetAyrac, { backgroundColor: c.border }]} />
          <View style={styles.ozetKutu}>
            <Text style={[styles.ozetSayi, { color: '#8b5cf6' }]}>{ozet.odenenSayi ?? 0}</Text>
            <Text style={[styles.ozetLabel, { color: c.textFaint }]}>Ödenen</Text>
          </View>
        </View>
      )}

      {/* Filtre + Ekle butonu */}
      <View style={[styles.filtreBar, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <FlatList
          horizontal
          data={['Hepsi', 'Ödendi', 'Bekliyor', 'İptal']}
          keyExtractor={d => d}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 8 }}
          style={{ flex: 1 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setFiltre(item)}
              style={[styles.cip, { borderColor: c.border, backgroundColor: filtre === item ? '#8b5cf6' : c.surface }]}
            >
              <Text style={[styles.cipYazi, { color: filtre === item ? '#fff' : c.textMuted }]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
        <TouchableOpacity style={styles.ekleBtn} onPress={() => setModalGoster(true)}>
          <Text style={styles.ekleYazi}>+ Ekle</Text>
        </TouchableOpacity>
      </View>

      {yukleniyor ? (
        <View style={{ padding: 16 }}>
          {[1,2,3].map(i => <KartSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={filtrelenmis}
          keyExtractor={item => String(item.OdemeID)}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={yenileniyor}
              onRefresh={() => { setYenileniyor(true); yukle(); }}
              tintColor="#8b5cf6"
            />
          }
          ListEmptyComponent={
            <Text style={[styles.bosYazi, { color: c.textFaint }]}>Ödeme bulunamadı.</Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.kart, { backgroundColor: c.card }]}>
              <View style={styles.kartUst}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.hastaAd, { color: c.text }]}>{item.HastaAdi}</Text>
                  <Text style={[styles.doktorAd, { color: c.textMuted }]}>
                    Dr. {item.DoktorAdi} · {item.UzmanlikAdi}
                  </Text>
                  <Text style={[styles.tarih, { color: c.textFaint }]}>
                    📅 {tarihFormatla(item.RandevuTarihi)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <View style={[styles.durumEtiket, { backgroundColor: DURUM_RENK[item.Durum] ?? '#9ca3af' }]}>
                    <Text style={styles.durumYazi}>{item.Durum}</Text>
                  </View>
                  <Text style={[styles.tutar, { color: c.text }]}>₺{item.Tutar.toLocaleString('tr-TR')}</Text>
                </View>
              </View>
              <Text style={[styles.yontem, { color: c.textFaint, borderTopColor: c.border }]}>
                💳 {item.OdemeYontemi}
              </Text>
              <TouchableOpacity
                style={[styles.durumBtn, { backgroundColor: c.surface }]}
                onPress={() => durumDegistir(item)}
              >
                <Text style={[styles.durumBtnYazi, { color: '#8b5cf6' }]}>Durum Değiştir</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Ödeme Ekle Modalı */}
      <Modal visible={modalGoster} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: c.bg }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalHeader, { backgroundColor: c.card, borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={() => setModalGoster(false)}>
              <Text style={{ color: '#0ea5e9', fontSize: 15 }}>İptal</Text>
            </TouchableOpacity>
            <Text style={[styles.modalBaslik, { color: c.text }]}>Ödeme Ekle</Text>
            <TouchableOpacity onPress={ekle} disabled={kaydediyor}>
              {kaydediyor
                ? <ActivityIndicator color="#8b5cf6" />
                : <Text style={{ color: '#8b5cf6', fontSize: 15, fontWeight: '700' }}>Kaydet</Text>
              }
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
            {[
              { alan: 'randevuId', label: 'Randevu ID', kb: 'numeric' as const },
              { alan: 'tutar', label: 'Tutar (₺)', kb: 'decimal-pad' as const },
              { alan: 'notlar', label: 'Notlar (opsiyonel)', kb: 'default' as const },
            ].map(({ alan, label, kb }) => (
              <View key={alan}>
                <Text style={[styles.etiket, { color: c.textMuted }]}>{label}</Text>
                <TextInput
                  style={[styles.girdi, { backgroundColor: c.input, borderColor: c.border, color: c.text }]}
                  value={(form as any)[alan]}
                  onChangeText={v => setForm(f => ({ ...f, [alan]: v }))}
                  placeholder={label}
                  placeholderTextColor={c.textFaint}
                  keyboardType={kb}
                />
              </View>
            ))}

            <View>
              <Text style={[styles.etiket, { color: c.textMuted }]}>Ödeme Yöntemi</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {YONTEMLER.map(y => (
                  <TouchableOpacity
                    key={y}
                    onPress={() => setForm(f => ({ ...f, yontem: y }))}
                    style={[styles.cip, {
                      borderColor: c.border,
                      backgroundColor: form.yontem === y ? '#8b5cf6' : c.surface,
                    }]}
                  >
                    <Text style={[styles.cipYazi, { color: form.yontem === y ? '#fff' : c.textMuted }]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  ozetBar: { flexDirection: 'row', padding: 14, borderBottomWidth: 1 },
  ozetKutu: { flex: 1, alignItems: 'center' },
  ozetSayi: { fontSize: 17, fontWeight: '700' },
  ozetLabel: { fontSize: 10, marginTop: 2 },
  ozetAyrac: { width: 1, marginHorizontal: 4 },
  filtreBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, gap: 10,
  },
  cip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  cipYazi: { fontSize: 12, fontWeight: '600' },
  ekleBtn: { backgroundColor: '#8b5cf6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  ekleYazi: { color: '#fff', fontWeight: '700', fontSize: 12 },
  bosYazi: { textAlign: 'center', marginTop: 40 },
  kart: {
    borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  kartUst: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  hastaAd: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  doktorAd: { fontSize: 12, marginBottom: 2 },
  tarih: { fontSize: 11 },
  durumEtiket: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  durumYazi: { color: '#fff', fontSize: 11, fontWeight: '700' },
  tutar: { fontSize: 16, fontWeight: '700' },
  yontem: { fontSize: 12, paddingTop: 10, borderTopWidth: 1, marginBottom: 10 },
  durumBtn: { borderRadius: 8, padding: 8, alignItems: 'center' },
  durumBtnYazi: { fontWeight: '600', fontSize: 13 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1,
  },
  modalBaslik: { fontSize: 16, fontWeight: '700' },
  etiket: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  girdi: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
});
