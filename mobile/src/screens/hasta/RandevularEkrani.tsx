import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, RefreshControl, ScrollView, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../api';
import { useTheme } from '../../ThemeContext';

const CACHE_KEY = 'cache_randevularim';
import { KartSkeleton } from '../../components/Skeleton';

interface Randevu {
  RandevuID: number; DoktorAdi: string; UzmanlikAdi: string;
  RandevuTarihi: string; RandevuSaati: string; Durum: string;
  DoktorID?: number; RandevuTipi?: string; VideoOdaID?: string;
}

const DURUM_RENK: Record<string, string> = {
  'Beklemede': '#f59e0b', 'Onaylandı': '#10b981',
  'Tamamlandı': '#6b7280', 'İptal': '#ef4444', 'Gelmedi': '#f97316',
};

const TUM_SAATLER = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];

function tarihFormatla(tarih: string) {
  const [yil, ay, gun] = tarih.split('T')[0].split('-');
  const aylar = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  return `${gun} ${aylar[parseInt(ay)-1]} ${yil}`;
}

function gunFarki(tarih: string) {
  const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
  return Math.round((new Date(tarih.split('T')[0]).getTime() - bugun.getTime()) / 86400000);
}

export default function RandevularEkrani({ navigation }: any) {
  const { c } = useTheme();
  const [randevular, setRandevular] = useState<Randevu[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [banBitis, setBanBitis] = useState<string | null>(null);
  const [banSebebi, setBanSebebi] = useState<string | null>(null);
  const [cevrimdisi, setCevrimdisi] = useState(false);
  const [kontrolUyarilari, setKontrolUyarilari] = useState<{ doktorAdi: string; tarih: string }[]>([]);
  const [degYapildi, setDegYapildi] = useState<Record<number, boolean>>({});

  // Yeniden planlama modal
  const [yenidenModal, setYenidenModal] = useState<Randevu | null>(null);
  const [yeniTarih, setYeniTarih] = useState('');
  const [yeniSaat, setYeniSaat] = useState('');
  const [yenidenDoluSaatler, setYenidenDoluSaatler] = useState<string[]>([]);
  const [saatYukleniyor, setSaatYukleniyor] = useState(false);
  const [yenidenGonderiyor, setYenidenGonderiyor] = useState(false);

  // Değerlendirme modal
  const [degModal, setDegModal] = useState<Randevu | null>(null);
  const [degPuan, setDegPuan] = useState(0);
  const [degYorum, setDegYorum] = useState('');
  const [degGonderiyor, setDegGonderiyor] = useState(false);

  useEffect(() => {
    if (!yenidenModal || !yeniTarih) { setYenidenDoluSaatler([]); return; }
    setSaatYukleniyor(true);
    api.doluSaatler(yenidenModal.DoktorID || 0, yeniTarih)
      .then((d: string[]) => setYenidenDoluSaatler(Array.isArray(d) ? d : []))
      .catch(() => setYenidenDoluSaatler([]))
      .finally(() => setSaatYukleniyor(false));
  }, [yenidenModal, yeniTarih]);

  const yukle = useCallback(async () => {
    try {
      const [data, profil] = await Promise.all([api.randevularim(), api.profilim()]);
      const liste: Randevu[] = Array.isArray(data) ? data : [];
      setRandevular(liste);
      setCevrimdisi(false);
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(liste)).catch(() => {});

      if (profil.BanBitisTarihi && new Date(profil.BanBitisTarihi) > new Date()) {
        setBanBitis(profil.BanBitisTarihi.split('T')[0]); setBanSebebi(profil.BanSebebi ?? null);
      } else { setBanBitis(null); setBanSebebi(null); }

      const tamamlananlar = liste.filter(r => r.Durum === 'Tamamlandı');
      const uyarilar: { doktorAdi: string; tarih: string }[] = [];
      const yapildi: Record<number, boolean> = {};
      await Promise.all(tamamlananlar.map(async (rv) => {
        try {
          const [tibbi, deg] = await Promise.all([
            api.tibbiBilgiHasta(rv.RandevuID),
            api.degerlendirmeGetir(rv.RandevuID),
          ]);
          if (tibbi?.SonrakiKontrol) {
            const fark = gunFarki(tibbi.SonrakiKontrol);
            if (fark >= 0 && fark <= 7) uyarilar.push({ doktorAdi: rv.DoktorAdi, tarih: tibbi.SonrakiKontrol.split('T')[0] });
          }
          if (deg) yapildi[rv.RandevuID] = true;
        } catch { }
      }));
      setKontrolUyarilari(uyarilar);
      setDegYapildi(yapildi);
    } catch {
      const cached = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
      if (cached) { setRandevular(JSON.parse(cached)); setCevrimdisi(true); }
    } finally { setYukleniyor(false); setYenileniyor(false); }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  async function iptalEt(id: number) {
    Alert.alert('Randevu İptal', 'Bu randevuyu iptal etmek istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'İptal Et', style: 'destructive', onPress: async () => {
        try {
          await api.randevuIptal(id);
          setRandevular(prev => prev.map(r => r.RandevuID === id ? { ...r, Durum: 'İptal' } : r));
        } catch (err: any) { Alert.alert('Hata', err.message); }
      }},
    ]);
  }

  async function yenidenPlanla() {
    if (!yenidenModal || !yeniTarih || !yeniSaat) { Alert.alert('Eksik bilgi', 'Tarih ve saat seçin'); return; }
    setYenidenGonderiyor(true);
    try {
      await api.randevuYenidenPlanla(yenidenModal.RandevuID, yeniTarih, yeniSaat + ':00');
      setRandevular(prev => prev.map(r => r.RandevuID === yenidenModal.RandevuID
        ? { ...r, RandevuTarihi: yeniTarih, RandevuSaati: yeniSaat + ':00', Durum: 'Beklemede' } : r));
      setYenidenModal(null); setYeniTarih(''); setYeniSaat('');
      Alert.alert('Başarılı', 'Randevu taşındı!');
    } catch (err: any) { Alert.alert('Hata', err.message); }
    finally { setYenidenGonderiyor(false); }
  }

  async function degerlendirmeGonder() {
    if (!degModal || degPuan === 0) { Alert.alert('Puan seçin'); return; }
    setDegGonderiyor(true);
    try {
      await api.degerlendirmeGonder(degModal.RandevuID, degPuan, degYorum || undefined);
      setDegYapildi(prev => ({ ...prev, [degModal.RandevuID]: true }));
      setDegModal(null); setDegPuan(0); setDegYorum('');
      Alert.alert('Teşekkürler!', 'Değerlendirmeniz kaydedildi.');
    } catch (err: any) { Alert.alert('Hata', err.message); }
    finally { setDegGonderiyor(false); }
  }

  if (yukleniyor) {
    return (
      <ScrollView style={[styles.kapsayici, { backgroundColor: c.bg }]} contentContainerStyle={{ padding: 16 }}>
        {[1,2,3].map(i => <KartSkeleton key={i} />)}
      </ScrollView>
    );
  }

  return (
    <>
      <FlatList
        data={randevular}
        keyExtractor={item => String(item.RandevuID)}
        style={[styles.liste, { backgroundColor: c.bg }]}
        contentContainerStyle={randevular.length === 0 ? styles.bos : { padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); yukle(); }} tintColor="#0ea5e9" />}
        ListHeaderComponent={
          <>
            {cevrimdisi && (
              <View style={[styles.uyariBanner, { backgroundColor: '#fefce8', borderColor: '#fde68a', marginHorizontal: 16, marginTop: 12 }]}>
                <Text style={styles.uyariIkon}>📴</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.uyariBaslik, { color: '#92400e' }]}>Çevrimdışı Mod</Text>
                  <Text style={[styles.uyariMetin, { color: '#b45309' }]}>İnternet bağlantısı yok — önbellek gösteriliyor</Text>
                </View>
              </View>
            )}
            {banBitis && (
              <View style={[styles.uyariBanner, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
                <Text style={styles.uyariIkon}>🚫</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.uyariBaslik, { color: '#991b1b' }]}>Hesabınız Askıya Alındı</Text>
                  <Text style={[styles.uyariMetin, { color: '#b91c1c' }]}>
                    {banSebebi ? `Sebep: ${banSebebi}\n` : ''}Ban bitiş: {banBitis}
                  </Text>
                </View>
              </View>
            )}
            {kontrolUyarilari.map((u, i) => (
              <View key={i} style={[styles.uyariBanner, { backgroundColor: '#eff6ff', borderColor: '#93c5fd' }]}>
                <Text style={styles.uyariIkon}>📅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.uyariBaslik, { color: '#1e40af' }]}>Kontrol Yaklaşıyor</Text>
                  <Text style={[styles.uyariMetin, { color: '#1d4ed8' }]}>Dr. {u.doktorAdi} · {u.tarih}</Text>
                </View>
              </View>
            ))}
          </>
        }
        ListEmptyComponent={
          <View style={styles.orta}>
            <Text style={styles.bosEmoji}>📋</Text>
            <Text style={[styles.bosYazi, { color: c.textFaint }]}>Henüz randevunuz yok.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.kart, { backgroundColor: c.card }]}>
            <View style={styles.kartUst}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.doktorAd, { color: c.text }]}>Dr. {item.DoktorAdi}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={[styles.uzmanlik, { color: c.textMuted }]}>{item.UzmanlikAdi}</Text>
                  {item.RandevuTipi === 'Online' && (
                    <View style={styles.onlineRozet}>
                      <Text style={styles.onlineRozetYazi}>📹 Online</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={[styles.durumEtiket, { backgroundColor: DURUM_RENK[item.Durum] ?? '#9ca3af' }]}>
                <Text style={styles.durumYazi}>{item.Durum}</Text>
              </View>
            </View>
            <Text style={[styles.tarih, { color: c.textMuted }]}>
              📅 {tarihFormatla(item.RandevuTarihi)} · {String(item.RandevuSaati).substring(0, 5)}
            </Text>
            <View style={styles.butonlar}>
              {item.RandevuTipi === 'Online' && (item.Durum === 'Beklemede' || item.Durum === 'Onaylandı') && (
                <TouchableOpacity
                  style={[styles.aksiyon, styles.katilButon]}
                  onPress={() => navigation.navigate('VideoGorusme', { randevuId: item.RandevuID })}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>📹 Katıl</Text>
                </TouchableOpacity>
              )}
              {(item.Durum === 'Beklemede' || item.Durum === 'Onaylandı') && (
                <>
                  <TouchableOpacity style={[styles.aksiyon, { borderColor: '#fca5a5' }]} onPress={() => iptalEt(item.RandevuID)}>
                    <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.aksiyon, { borderColor: '#93c5fd' }]}
                    onPress={() => { setYenidenModal(item); setYeniTarih(''); setYeniSaat(''); }}
                  >
                    <Text style={{ color: '#3b82f6', fontSize: 12, fontWeight: '600' }}>🔄 Taşı</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.aksiyon, { borderColor: '#a78bfa' }]}
                    onPress={() => navigation.navigate('Mesajlasma', { randevuId: item.RandevuID, karsiAd: 'Dr. ' + item.DoktorAdi })}
                  >
                    <Text style={{ color: '#7c3aed', fontSize: 12, fontWeight: '600' }}>💬 Mesaj</Text>
                  </TouchableOpacity>
                </>
              )}
              {item.Durum === 'Tamamlandı' && !degYapildi[item.RandevuID] && (
                <TouchableOpacity
                  style={[styles.aksiyon, { borderColor: '#fcd34d' }]}
                  onPress={() => { setDegModal(item); setDegPuan(0); setDegYorum(''); }}
                >
                  <Text style={{ color: '#d97706', fontSize: 12, fontWeight: '600' }}>⭐ Değerlendir</Text>
                </TouchableOpacity>
              )}
              {item.Durum === 'Tamamlandı' && degYapildi[item.RandevuID] && (
                <Text style={{ color: '#f59e0b', fontSize: 11, marginTop: 8 }}>⭐ Değerlendirildi</Text>
              )}
            </View>
          </View>
        )}
      />

      {/* YENİDEN PLANLAMA MODAL */}
      <Modal visible={!!yenidenModal} animationType="slide" transparent onRequestClose={() => setYenidenModal(null)}>
        <View style={styles.modalArka}>
          <View style={[styles.modalKutu, { backgroundColor: c.card }]}>
            <View style={styles.modalBaslikSatir}>
              <Text style={[styles.modalBaslik, { color: c.text }]}>🔄 Randevu Taşı</Text>
              <TouchableOpacity onPress={() => setYenidenModal(null)}><Text style={{ fontSize: 18, color: c.textMuted }}>✕</Text></TouchableOpacity>
            </View>
            {yenidenModal && (
              <Text style={{ color: c.textMuted, fontSize: 13, marginBottom: 16 }}>
                Dr. {yenidenModal.DoktorAdi} — {tarihFormatla(yenidenModal.RandevuTarihi)} · {String(yenidenModal.RandevuSaati).substring(0, 5)}
              </Text>
            )}
            <Text style={[styles.etiket, { color: c.textMuted }]}>Yeni Tarih (YYYY-AA-GG)</Text>
            <TextInput
              style={[styles.girdi, { backgroundColor: c.bg, borderColor: c.border, color: c.text }]}
              value={yeniTarih} onChangeText={t => { setYeniTarih(t); setYeniSaat(''); }}
              placeholder="2025-06-15" placeholderTextColor={c.textFaint} keyboardType="numeric"
            />
            <Text style={[styles.etiket, { color: c.textMuted }]}>
              Yeni Saat {saatYukleniyor && <ActivityIndicator size="small" color="#0ea5e9" />}
            </Text>
            <View style={styles.saatGrid}>
              {TUM_SAATLER.map(s => {
                const dolu = yenidenDoluSaatler.some(ds => String(ds).substring(0, 5) === s);
                const secili = yeniSaat === s;
                return (
                  <TouchableOpacity key={s} onPress={() => !dolu && setYeniSaat(s)} disabled={dolu}
                    style={[styles.saatButon, { backgroundColor: secili ? '#0ea5e9' : dolu ? c.surface : c.bg, borderColor: secili ? '#0ea5e9' : c.border, opacity: dolu ? 0.5 : 1 }]}
                  >
                    <Text style={{ color: secili ? '#fff' : dolu ? c.textFaint : c.text, fontSize: 12, fontWeight: '600' }}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={[styles.tamamButon, (!yeniTarih || !yeniSaat || yenidenGonderiyor) && { opacity: 0.5 }]}
              onPress={yenidenPlanla} disabled={!yeniTarih || !yeniSaat || yenidenGonderiyor}
            >
              {yenidenGonderiyor ? <ActivityIndicator color="#fff" /> : <Text style={styles.tamamButonYazi}>Taşı</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DEĞERLENDİRME MODAL */}
      <Modal visible={!!degModal} animationType="slide" transparent onRequestClose={() => setDegModal(null)}>
        <View style={styles.modalArka}>
          <View style={[styles.modalKutu, { backgroundColor: c.card }]}>
            <View style={styles.modalBaslikSatir}>
              <Text style={[styles.modalBaslik, { color: c.text }]}>⭐ Değerlendirme</Text>
              <TouchableOpacity onPress={() => setDegModal(null)}><Text style={{ fontSize: 18, color: c.textMuted }}>✕</Text></TouchableOpacity>
            </View>
            {degModal && <Text style={{ color: c.textMuted, fontSize: 13, marginBottom: 16 }}>Dr. {degModal.DoktorAdi}</Text>}
            <Text style={[styles.etiket, { color: c.textMuted }]}>Puan</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              {[1,2,3,4,5].map(y => (
                <TouchableOpacity key={y} onPress={() => setDegPuan(y)}>
                  <Text style={{ fontSize: 32, color: y <= degPuan ? '#f59e0b' : '#d1d5db' }}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.etiket, { color: c.textMuted }]}>Yorum (opsiyonel)</Text>
            <TextInput
              style={[styles.girdi, { backgroundColor: c.bg, borderColor: c.border, color: c.text, height: 80, textAlignVertical: 'top' }]}
              value={degYorum} onChangeText={setDegYorum}
              placeholder="Deneyiminizi paylaşın..." placeholderTextColor={c.textFaint} multiline maxLength={500}
            />
            <TouchableOpacity
              style={[styles.tamamButon, { backgroundColor: '#f59e0b' }, (degPuan === 0 || degGonderiyor) && { opacity: 0.5 }]}
              onPress={degerlendirmeGonder} disabled={degPuan === 0 || degGonderiyor}
            >
              {degGonderiyor ? <ActivityIndicator color="#fff" /> : <Text style={styles.tamamButonYazi}>Gönder</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  liste: { flex: 1 },
  kapsayici: { flex: 1 },
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  bos: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bosEmoji: { fontSize: 48, marginBottom: 12 },
  bosYazi: { fontSize: 15 },
  uyariBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: 12, padding: 14, marginHorizontal: 16, marginTop: 12 },
  uyariIkon: { fontSize: 20 },
  uyariBaslik: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  uyariMetin: { fontSize: 12, lineHeight: 18 },
  kart: { borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },
  kartUst: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  doktorAd: { fontSize: 15, fontWeight: '700' },
  uzmanlik: { fontSize: 12, marginTop: 2 },
  durumEtiket: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  durumYazi: { color: '#fff', fontSize: 11, fontWeight: '700' },
  tarih: { fontSize: 13 },
  butonlar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  aksiyon: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  // Modal
  modalArka: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalKutu: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalBaslikSatir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalBaslik: { fontSize: 17, fontWeight: '700' },
  etiket: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  girdi: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 16 },
  saatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  saatButon: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  tamamButon: { backgroundColor: '#0ea5e9', borderRadius: 12, padding: 14, alignItems: 'center' },
  tamamButonYazi: { color: '#fff', fontSize: 15, fontWeight: '700' },
  onlineRozet: {
    backgroundColor: '#dcfce7', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  onlineRozetYazi: { color: '#16a34a', fontSize: 11, fontWeight: '600' },
  katilButon: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
});
