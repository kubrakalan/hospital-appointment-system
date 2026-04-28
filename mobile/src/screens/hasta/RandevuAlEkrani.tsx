import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native';
import { api } from '../../api';
import { useTheme } from '../../theme';

interface Doktor {
  DoktorID: number; Ad: string; UzmanlikAdi: string; Durum: string;
  OrtPuan?: number; DegerlendirmeSayisi?: number; Biyografi?: string;
}
interface DoktorProfil extends Doktor {
  Telefon?: string;
  degerlendirmeler: { Puan: number; Yorum: string | null; HastaAdi: string }[];
}

const TUM_SAATLER = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];

function bugundenItibaren(gunSonra = 1) {
  const d = new Date(); d.setDate(d.getDate() + gunSonra);
  return d.toISOString().split('T')[0];
}

function YildizPuan({ puan }: { puan: number }) {
  return (
    <Text style={{ color: '#f59e0b', fontSize: 11 }}>
      {'★'.repeat(Math.round(puan))}{'☆'.repeat(5 - Math.round(puan))}
    </Text>
  );
}

export default function RandevuAlEkrani() {
  const { c } = useTheme();
  const [doktorlar, setDoktorlar] = useState<Doktor[]>([]);
  const [seciliDoktor, setSeciliDoktor] = useState<Doktor | null>(null);
  const [tarih, setTarih] = useState('');
  const [saat, setSaat] = useState('');
  const [notlar, setNotlar] = useState('');
  const [uzmanlik, setUzmanlik] = useState('');
  const [adArama, setAdArama] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gonderiyor, setGonderiyor] = useState(false);
  const [doluSaatler, setDoluSaatler] = useState<string[]>([]);
  const [saatYukleniyor, setSaatYukleniyor] = useState(false);

  // Doktor profil modal
  const [profilModal, setProfilModal] = useState<DoktorProfil | null>(null);
  const [profilYukleniyor, setProfilYukleniyor] = useState(false);

  const aramaRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    yukleDoktorlar();
  }, []);

  useEffect(() => {
    if (aramaRef.current) clearTimeout(aramaRef.current);
    aramaRef.current = setTimeout(() => yukleDoktorlar(uzmanlik, adArama), 350);
  }, [adArama, uzmanlik]);

  useEffect(() => {
    if (!seciliDoktor || !tarih) { setDoluSaatler([]); setSaat(''); return; }
    setSaatYukleniyor(true); setSaat('');
    api.doluSaatler(seciliDoktor.DoktorID, tarih)
      .then((d: string[]) => setDoluSaatler(Array.isArray(d) ? d : []))
      .catch(() => setDoluSaatler([]))
      .finally(() => setSaatYukleniyor(false));
  }, [seciliDoktor, tarih]);

  async function yukleDoktorlar(uz?: string, ad?: string) {
    try {
      const d = await api.doktorlar(uz, ad);
      setDoktorlar(d.filter((dok: Doktor) => dok.Durum === 'Aktif'));
    } catch { }
    setYukleniyor(false);
  }

  async function doktorProfilAc(doktorId: number) {
    setProfilModal(null); setProfilYukleniyor(true);
    try { setProfilModal(await api.doktorProfil(doktorId)); } catch { }
    setProfilYukleniyor(false);
  }

  const uzmanliklar = [...new Set(doktorlar.map(d => d.UzmanlikAdi))];

  async function randevuAl() {
    if (!seciliDoktor || !tarih || !saat) {
      Alert.alert('Eksik Bilgi', 'Lütfen doktor, tarih ve saat seçin.'); return;
    }
    setGonderiyor(true);
    try {
      await api.randevuAl(seciliDoktor.DoktorID, tarih, saat, notlar || undefined);
      Alert.alert(
        '✅ Randevu Alındı!',
        'Randevunuz başarıyla oluşturuldu. Ödeme için kliniğimize başvurabilir veya ödemelerim sekmesinden takip edebilirsiniz.',
        [{ text: 'Tamam' }]
      );
      setSeciliDoktor(null); setTarih(''); setSaat(''); setNotlar(''); setUzmanlik(''); setDoluSaatler([]);
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    } finally { setGonderiyor(false); }
  }

  if (yukleniyor) return <View style={[styles.orta, { backgroundColor: c.bg }]}><ActivityIndicator size="large" color="#0ea5e9" /></View>;

  return (
    <ScrollView style={[styles.kapsayici, { backgroundColor: c.bg }]} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

      {/* Uzmanlık chip'leri */}
      <Text style={[styles.etiket, { color: c.textMuted }]}>Uzmanlık Alanı</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['Tümü', ...uzmanliklar].map(u => (
            <TouchableOpacity
              key={u}
              onPress={() => { setUzmanlik(u === 'Tümü' ? '' : u); setSeciliDoktor(null); setAdArama(''); }}
              style={[styles.cip, { borderColor: c.border, backgroundColor: uzmanlik === (u === 'Tümü' ? '' : u) ? '#0ea5e9' : c.card }]}
            >
              <Text style={[styles.cipYazi, { color: uzmanlik === (u === 'Tümü' ? '' : u) ? '#fff' : c.textMuted }]}>{u}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Ad araması */}
      <TextInput
        style={[styles.girdi, { backgroundColor: c.card, borderColor: c.border, color: c.text, marginBottom: 16 }]}
        value={adArama}
        onChangeText={setAdArama}
        placeholder="Doktor adı ile ara..."
        placeholderTextColor={c.textFaint}
      />

      {/* Doktor kartları */}
      <Text style={[styles.etiket, { color: c.textMuted }]}>Doktor Seç</Text>
      <View style={styles.doktorGrid}>
        {doktorlar.map(d => {
          const secili = seciliDoktor?.DoktorID === d.DoktorID;
          return (
            <TouchableOpacity
              key={d.DoktorID}
              onPress={() => setSeciliDoktor(d)}
              onLongPress={() => doktorProfilAc(d.DoktorID)}
              style={[styles.doktorKart, { backgroundColor: c.card, borderColor: secili ? '#0ea5e9' : 'transparent' }]}
            >
              <Text style={styles.doktorEmoji}>👨‍⚕️</Text>
              <Text style={[styles.doktorAd, { color: secili ? '#0ea5e9' : c.text }]}>Dr. {d.Ad}</Text>
              <Text style={[styles.uzmanlik, { color: c.textMuted }]}>{d.UzmanlikAdi}</Text>
              {d.OrtPuan && d.OrtPuan > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                  <YildizPuan puan={d.OrtPuan} />
                  <Text style={{ fontSize: 10, color: c.textMuted }}>({d.DegerlendirmeSayisi})</Text>
                </View>
              ) : null}
              <TouchableOpacity onPress={() => doktorProfilAc(d.DoktorID)} style={{ marginTop: 4 }}>
                <Text style={{ fontSize: 10, color: '#0ea5e9' }}>Profil →</Text>
              </TouchableOpacity>
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
                key={s} onPress={() => !dolu && setSaat(s)} disabled={dolu}
                style={[styles.saatButon, {
                  backgroundColor: dolu ? c.surface : secili ? '#0ea5e9' : c.card,
                  borderColor: secili ? '#0ea5e9' : c.border, opacity: dolu ? 0.5 : 1,
                }]}
              >
                <Text style={[styles.saatYazi, { color: dolu ? c.textFaint : secili ? '#fff' : c.text }]}>{s}</Text>
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
        value={notlar} onChangeText={setNotlar}
        placeholder="Şikayetinizi yazın..." placeholderTextColor={c.textFaint} multiline
      />

      {seciliDoktor && tarih && saat && (
        <View style={styles.ozet}>
          <Text style={styles.ozetBaslik}>Randevu Özeti</Text>
          <Text style={styles.ozetSatir}>👨‍⚕️ Dr. {seciliDoktor.Ad} — {seciliDoktor.UzmanlikAdi}</Text>
          <Text style={styles.ozetSatir}>📅 {tarih} · {saat}</Text>
        </View>
      )}

      <TouchableOpacity style={[styles.buton, gonderiyor && styles.butonDevre]} onPress={randevuAl} disabled={gonderiyor}>
        {gonderiyor ? <ActivityIndicator color="#fff" /> : <Text style={styles.butonYazi}>Randevu Al</Text>}
      </TouchableOpacity>

      {/* DOKTOR PROFİL MODAL */}
      <Modal visible={profilYukleniyor || !!profilModal} animationType="slide" transparent onRequestClose={() => setProfilModal(null)}>
        <View style={styles.modalArka}>
          <View style={[styles.modalKutu, { backgroundColor: c.card }]}>
            <View style={styles.modalBaslik}>
              <Text style={[styles.modalBaslikYazi, { color: c.text }]}>Doktor Profili</Text>
              <TouchableOpacity onPress={() => setProfilModal(null)}>
                <Text style={{ fontSize: 18, color: c.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>
            {profilYukleniyor ? (
              <ActivityIndicator size="large" color="#0ea5e9" style={{ marginVertical: 24 }} />
            ) : profilModal ? (
              <ScrollView>
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 40, marginBottom: 8 }}>👨‍⚕️</Text>
                  <Text style={[styles.modalDoktorAd, { color: c.text }]}>Dr. {profilModal.Ad}</Text>
                  <Text style={{ color: '#0ea5e9', fontWeight: '600', marginBottom: 4 }}>{profilModal.UzmanlikAdi}</Text>
                  {profilModal.OrtPuan && profilModal.OrtPuan > 0 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <YildizPuan puan={profilModal.OrtPuan} />
                      <Text style={{ color: c.textMuted, fontSize: 12 }}>
                        {profilModal.OrtPuan.toFixed(1)} ({profilModal.DegerlendirmeSayisi} değerlendirme)
                      </Text>
                    </View>
                  ) : (
                    <Text style={{ color: c.textMuted, fontSize: 12 }}>Henüz değerlendirme yok</Text>
                  )}
                </View>

                {profilModal.Biyografi ? (
                  <View style={styles.profilBolum}>
                    <Text style={[styles.profilBaslik, { color: c.textMuted }]}>Hakkında</Text>
                    <Text style={{ color: c.text, fontSize: 14, lineHeight: 20 }}>{profilModal.Biyografi}</Text>
                  </View>
                ) : null}

                {profilModal.degerlendirmeler.length > 0 && (
                  <View style={styles.profilBolum}>
                    <Text style={[styles.profilBaslik, { color: c.textMuted }]}>Son Değerlendirmeler</Text>
                    {profilModal.degerlendirmeler.map((d, i) => (
                      <View key={i} style={[styles.yorumKart, { backgroundColor: c.bg }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontWeight: '600', color: c.text, fontSize: 13 }}>{d.HastaAdi}</Text>
                          <YildizPuan puan={d.Puan} />
                        </View>
                        {d.Yorum ? <Text style={{ color: c.textMuted, fontSize: 12 }}>{d.Yorum}</Text> : null}
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.buton, { marginTop: 8 }]}
                  onPress={() => { setProfilModal(null); setSeciliDoktor(profilModal); }}
                >
                  <Text style={styles.butonYazi}>Bu Doktorla Randevu Al</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
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
    width: '47%', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  doktorEmoji: { fontSize: 28, marginBottom: 6 },
  doktorAd: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  uzmanlik: { fontSize: 11, textAlign: 'center', marginTop: 2 },
  girdi: { borderWidth: 1, borderRadius: 10, padding: 13, fontSize: 14, marginBottom: 18 },
  saatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  saatButon: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  saatYazi: { fontSize: 13, fontWeight: '600' },
  doluYazi: { fontSize: 9, marginTop: 1 },
  saatIpucu: { fontSize: 13, marginBottom: 20, fontStyle: 'italic' },
  ozet: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#0ea5e9' },
  ozetBaslik: { fontWeight: '700', color: '#1e40af', marginBottom: 6, fontSize: 13 },
  ozetSatir: { fontSize: 13, color: '#1e40af', marginBottom: 3 },
  buton: { backgroundColor: '#0ea5e9', borderRadius: 12, padding: 16, alignItems: 'center' },
  butonDevre: { backgroundColor: '#7dd3fc' },
  butonYazi: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Modal
  modalArka: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalKutu: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalBaslik: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalBaslikYazi: { fontSize: 17, fontWeight: '700' },
  modalDoktorAd: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  profilBolum: { marginBottom: 16 },
  profilBaslik: { fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  yorumKart: { borderRadius: 10, padding: 12, marginBottom: 8 },
});
