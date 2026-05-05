import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { api } from '../../api';
import { useTheme } from '../../ThemeContext';
import { KartSkeleton } from '../../components/Skeleton';
import { saatFormatla } from '../../utils';

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

export default function TibbiGecmisEkrani({ navigation }: any) {
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

  async function ilacHatirlaticiKur(recete: string, doktorAd: string) {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') { Alert.alert('İzin gerekli', 'Bildirim iznini ayarlardan açın.'); return; }
    const saatler = [8, 13, 20];
    for (const saat of saatler) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💊 İlaç Hatırlatıcısı',
          body: `Dr. ${doktorAd} reçetesi: ${recete.substring(0, 60)}${recete.length > 60 ? '...' : ''}`,
          sound: true,
        },
        trigger: { hour: saat, minute: 0, repeats: true } as any,
      });
    }
    Alert.alert('✅ Hatırlatıcı Kuruldu', 'Her gün 08:00, 13:00 ve 20:00\'de hatırlatılacak.');
  }

  async function recetePdfOlustur(tibbi: TibbiBilgi, randevu: Randevu) {
    try {
      const html = `
        <html><head><meta charset="utf-8"/>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
          h1 { color: #0ea5e9; font-size: 22px; border-bottom: 2px solid #0ea5e9; padding-bottom: 8px; }
          h2 { font-size: 15px; color: #374151; margin-top: 20px; }
          p { font-size: 14px; line-height: 1.6; color: #374151; }
          .kutu { background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 12px 16px; border-radius: 4px; margin-top: 8px; }
          .footer { margin-top: 40px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
        </style></head><body>
        <h1>🏥 MediRandevu — E-Reçete</h1>
        <p><b>Doktor:</b> Dr. ${randevu.DoktorAdi} — ${randevu.UzmanlikAdi}</p>
        <p><b>Tarih:</b> ${tarihFormatla(randevu.RandevuTarihi)} · ${saatFormatla(randevu.RandevuSaati)}</p>
        ${tibbi.Tani ? `<h2>Tanı</h2><div class="kutu"><p>${tibbi.Tani}</p></div>` : ''}
        ${tibbi.Recete ? `<h2>Reçete / İlaçlar</h2><div class="kutu"><p>${tibbi.Recete}</p></div>` : ''}
        ${tibbi.UygulananIslem ? `<h2>Uygulanan İşlem</h2><div class="kutu"><p>${tibbi.UygulananIslem}</p></div>` : ''}
        ${tibbi.LabNotu ? `<h2>Lab / Tahlil</h2><div class="kutu"><p>${tibbi.LabNotu}</p></div>` : ''}
        ${tibbi.SonrakiKontrol ? `<h2>Sonraki Kontrol</h2><div class="kutu"><p>${tarihFormatla(tibbi.SonrakiKontrol)}</p></div>` : ''}
        <div class="footer">MediRandevu tarafından oluşturuldu · ${new Date().toLocaleDateString('tr-TR')}</div>
        </body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    } catch { Alert.alert('Hata', 'PDF oluşturulamadı.'); }
  }

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

  return (
    <>
      <ScrollView
        style={[styles.kapsayici, { backgroundColor: c.bg }]}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); yukle(); }} tintColor="#0ea5e9" />}
      >
        <TouchableOpacity
          style={[styles.labButon, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={() => navigation.navigate('LabSonuclari')}
        >
          <Text style={{ fontSize: 20 }}>🧪</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.labButonBaslik, { color: c.text }]}>Lab Sonuçları</Text>
            <Text style={[styles.labButonAlt, { color: c.textMuted }]}>Tahlil ve test sonuçlarınızı görün</Text>
          </View>
          <Text style={{ color: c.textFaint, fontSize: 18 }}>›</Text>
        </TouchableOpacity>

        {kayitlar.length === 0 ? (
          <View style={styles.orta}>
            <Text style={styles.bosEmoji}>🗂️</Text>
            <Text style={[styles.bosYazi, { color: c.textFaint }]}>Henüz tamamlanmış randevunuz yok.</Text>
          </View>
        ) : kayitlar.map(({ randevu, tibbi }) => (
          <View key={randevu.RandevuID} style={[styles.kart, { backgroundColor: c.card }]}>
            <View style={[styles.kartBaslik, { borderBottomColor: c.border }]}>
              <View>
                <Text style={[styles.doktorAd, { color: c.text }]}>Dr. {randevu.DoktorAdi}</Text>
                <Text style={[styles.uzmanlik, { color: c.textMuted }]}>{randevu.UzmanlikAdi}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.tarih, { color: c.textMuted }]}>{tarihFormatla(randevu.RandevuTarihi)}</Text>
                <Text style={[styles.saat, { color: c.textFaint }]}>{saatFormatla(randevu.RandevuSaati)}</Text>
              </View>
            </View>

            {!tibbi ? (
              <Text style={[styles.bosKayit, { color: c.textFaint }]}>Bu randevu için tıbbi kayıt girilmemiş.</Text>
            ) : (
              <View style={styles.bilgiGrid}>
                {[
                  { icon: '🔬', label: 'Tanı', deger: tibbi.Tani, isRecete: false },
                  { icon: '💊', label: 'Reçete', deger: tibbi.Recete, isRecete: true },
                  { icon: '🩺', label: 'Uygulanan İşlem', deger: tibbi.UygulananIslem },
                  { icon: '🧪', label: 'Lab / Tahlil', deger: tibbi.LabNotu },
                  { icon: '📅', label: 'Sonraki Kontrol', deger: tibbi.SonrakiKontrol ? tarihFormatla(tibbi.SonrakiKontrol) : null },
                ].filter(f => f.deger).map(f => (
                  <View key={f.label} style={[styles.bilgiSatir, { backgroundColor: c.surface }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={[styles.bilgiLabel, { color: c.textMuted }]}>{f.icon} {f.label}</Text>
                      {f.isRecete && (
                        <TouchableOpacity onPress={() => ilacHatirlaticiKur(f.deger!, randevu.DoktorAdi)} style={styles.hatirlaticiButon}>
                          <Text style={styles.hatirlaticiYazi}>⏰ Hatırlatıcı</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={[styles.bilgiDeger, { color: c.text }]}>{f.deger}</Text>
                  </View>
                ))}
              </View>
            )}

            {tibbi && (
              <TouchableOpacity
                style={styles.pdfButon}
                onPress={() => recetePdfOlustur(tibbi, randevu)}
              >
                <Text style={styles.pdfButonYazi}>📄 E-Reçete PDF İndir</Text>
              </TouchableOpacity>
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
  hatirlaticiButon: { backgroundColor: '#eff6ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  hatirlaticiYazi: { fontSize: 11, color: '#0ea5e9', fontWeight: '700' },
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
  labButon: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  labButonBaslik: { fontSize: 14, fontWeight: '700' },
  labButonAlt: { fontSize: 12, marginTop: 2 },
  pdfButon: {
    borderRadius: 10, paddingVertical: 9, alignItems: 'center',
    backgroundColor: '#eff6ff', marginTop: 10, borderWidth: 1, borderColor: '#bfdbfe',
  },
  pdfButonYazi: { color: '#1d4ed8', fontWeight: '700', fontSize: 13 },
});
