import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { api } from '../../api';
import { useTheme } from '../../ThemeContext';

interface Doktor {
  DoktorID: number; Ad: string; UzmanlikAdi: string; Durum: string;
  OrtPuan?: number; DegerlendirmeSayisi?: number; Biyografi?: string;
}
interface DoktorProfil extends Doktor {
  Telefon?: string;
  degerlendirmeler: { Puan: number; Yorum: string | null; HastaAdi: string }[];
}

// Tüm olası saatler (07:00–19:00 arası 30dk aralıklı)
const TUM_OLASI_SAATLER = Array.from({ length: 25 }, (_, i) => {
  const saat = Math.floor(i / 2) + 7;
  const dakika = i % 2 === 0 ? '00' : '30';
  return `${String(saat).padStart(2, '0')}:${dakika}`;
});

interface CalismaSaati {
  Gun: string; BaslangicSaat: string; BitisSaat: string;
}

// Türkçe gün adı → programdaki gün anahtarı eşleştirmesi
const GUN_MAP: Record<string, string> = {
  'Pazartesi': 'Pazartesi', 'Salı': 'Salı', 'Çarşamba': 'Çarşamba',
  'Perşembe': 'Perşembe', 'Cuma': 'Cuma', 'Cumartesi': 'Cumartesi', 'Pazar': 'Pazar',
};
const JS_GUN_MAP: Record<number, string> = {
  0: 'Pazar', 1: 'Pazartesi', 2: 'Salı', 3: 'Çarşamba',
  4: 'Perşembe', 5: 'Cuma', 6: 'Cumartesi',
};

function saatStrCalistir(deger: any): string {
  if (!deger) return '';
  const s = String(deger);
  // mssql time → "1970-01-01T09:00:00.000Z" formatı
  if (s.includes('T')) return s.split('T')[1].substring(0, 5);
  return s.substring(0, 5);
}

function uygunSaatleriHesapla(calismaSaatleri: CalismaSaati[], tarih: string): string[] {
  if (!tarih || calismaSaatleri.length === 0) return [];
  const gunAdi = JS_GUN_MAP[new Date(tarih + 'T00:00:00').getDay()];
  const calisma = calismaSaatleri.find(c => c.Gun === gunAdi);
  if (!calisma) return [];
  const bas = saatStrCalistir(calisma.BaslangicSaat) || '09:00';
  const bit = saatStrCalistir(calisma.BitisSaat) || '17:00';
  return TUM_OLASI_SAATLER.filter(s => s >= bas && s < bit);
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
  const [gunDoluluk, setGunDoluluk] = useState<Record<string, number>>({});
  const [calismaSaatleri, setCalismaSaatleri] = useState<CalismaSaati[]>([]);

  // Doktor profil modal
  const [profilModal, setProfilModal] = useState<DoktorProfil | null>(null);
  const [profilYukleniyor, setProfilYukleniyor] = useState(false);

  const aramaRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<any>(null);
  const tarihYRef = useRef<number>(0);

  useEffect(() => {
    yukleDoktorlar();
  }, []);

  useEffect(() => {
    if (aramaRef.current) clearTimeout(aramaRef.current);
    aramaRef.current = setTimeout(() => yukleDoktorlar(uzmanlik, adArama), 350);
  }, [adArama, uzmanlik]);

  // Doktor seçilince çalışma saatlerini çek
  useEffect(() => {
    if (!seciliDoktor) { setCalismaSaatleri([]); setGunDoluluk({}); return; }
    api.doktorCalismaSaatleriPublic(seciliDoktor.DoktorID)
      .then((d: CalismaSaati[]) => setCalismaSaatleri(Array.isArray(d) ? d : []))
      .catch(() => setCalismaSaatleri([]));

    const gunler = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() + i + 1);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    });
    Promise.all(gunler.map(g =>
      api.doluSaatler(seciliDoktor.DoktorID, g)
        .then((d: string[]) => ({ g, dolu: Array.isArray(d) ? d.length : 0 }))
        .catch(() => ({ g, dolu: 0 }))
    )).then(sonuclar => {
      const map: Record<string, number> = {};
      sonuclar.forEach(({ g, dolu }) => { map[g] = dolu; });
      setGunDoluluk(map);
    });
  }, [seciliDoktor]);

  // Tarih seçilince dolu saatleri çek
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

  async function hatirlaticiKur(doktorAdi: string, randevuTarih: string, randevuSaat: string) {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
      const [yil, ay, gun] = randevuTarih.split('-').map(Number);
      const bildirimZamani = new Date(yil, ay - 1, gun - 1, 9, 0, 0);
      if (bildirimZamani > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🏥 Yarın Randevunuz Var!',
            body: `Dr. ${doktorAdi} ile ${randevuTarih} günü saat ${randevuSaat}'de randevunuz var.`,
            sound: true,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: bildirimZamani },
        });
      }
    } catch { }
  }

  async function randevuAl() {
    if (!seciliDoktor || !tarih || !saat) {
      Alert.alert('Eksik Bilgi', 'Lütfen doktor, tarih ve saat seçin.'); return;
    }
    setGonderiyor(true);
    try {
      await api.randevuAl(seciliDoktor.DoktorID, tarih, saat, notlar || undefined);
      hatirlaticiKur(seciliDoktor.Ad, tarih, saat);
      Alert.alert(
        '✅ Randevu Alındı!',
        'Randevunuz oluşturuldu. Bir gün önce saat 09:00\'da hatırlatma gönderilecek.',
        [{ text: 'Tamam' }]
      );
      setSeciliDoktor(null); setTarih(''); setSaat(''); setNotlar(''); setUzmanlik(''); setDoluSaatler([]);
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    } finally { setGonderiyor(false); }
  }

  // Saat grid için hesaplamalar (render dışında)
  const uygunSaatler = uygunSaatleriHesapla(calismaSaatleri, tarih);
  const doktorCalismiyor = calismaSaatleri.length > 0 && tarih !== '' && uygunSaatler.length === 0;
  const gosterilecekSaatler = uygunSaatler.length > 0
    ? uygunSaatler
    : ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];

  if (yukleniyor) return <View style={[styles.orta, { backgroundColor: c.bg }]}><ActivityIndicator size="large" color="#0ea5e9" /></View>;

  return (
    <ScrollView ref={scrollRef} style={[styles.kapsayici, { backgroundColor: c.bg }]} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

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

      {/* Tarih — önümüzdeki 14 gün chip olarak */}
      <View
        onLayout={e => { tarihYRef.current = e.nativeEvent.layout.y; }}
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}
      >
        <Text style={[styles.etiket, { color: c.textMuted, marginBottom: 0 }]}>Tarih</Text>
        {seciliDoktor && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[['#10b981','Müsait'],['#f59e0b','Az'],['#ef4444','Dolu']].map(([renk, ad]) => (
              <View key={ad} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: renk }} />
                <Text style={{ fontSize: 10, color: c.textFaint }}>{ad}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {Array.from({ length: 14 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i + 1);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const g = String(d.getDate()).padStart(2, '0');
            const deger = `${y}-${m}-${g}`;
            const gunAdi = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][d.getDay()];
            const secili = tarih === deger;
            const doluSayisi = gunDoluluk[deger] ?? -1;
            const dotRenk = doluSayisi < 0 ? 'transparent'
              : doluSayisi >= TUM_SAATLER.length ? '#ef4444'
              : doluSayisi >= 4 ? '#f59e0b' : '#10b981';
            return (
              <TouchableOpacity
                key={deger}
                onPress={() => setTarih(deger)}
                style={[styles.tarihCip, {
                  backgroundColor: secili ? '#0ea5e9' : c.card,
                  borderColor: secili ? '#0ea5e9' : c.border,
                }]}
              >
                <Text style={{ fontSize: 10, color: secili ? '#fff' : c.textMuted, fontWeight: '600' }}>{gunAdi}</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: secili ? '#fff' : c.text }}>{g}</Text>
                <Text style={{ fontSize: 10, color: secili ? '#cde' : c.textFaint }}>{m}</Text>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: secili ? 'rgba(255,255,255,0.7)' : dotRenk, marginTop: 3 }} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Saat */}
      <Text style={[styles.etiket, { color: c.textMuted }]}>
        Saat {saatYukleniyor && <ActivityIndicator size="small" color="#0ea5e9" />}
      </Text>
      {(!seciliDoktor || !tarih) ? (
        <Text style={[styles.saatIpucu, { color: c.textFaint }]}>Önce doktor ve tarih seçin.</Text>
      ) : doktorCalismiyor ? (
        <View style={[styles.calismiyor, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={{ fontSize: 28, marginBottom: 6 }}>🚫</Text>
          <Text style={[styles.calismiyorYazi, { color: c.textMuted }]}>Bu gün doktor çalışmıyor</Text>
          <Text style={[styles.calismiyorAlt, { color: c.textFaint }]}>Başka bir tarih seçin</Text>
        </View>
      ) : (
        <View style={styles.saatGrid}>
          {gosterilecekSaatler.map(s => {
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

      {/* Adım göstergesi */}
      <View style={styles.adimKutu}>
        <View style={[styles.adim, { backgroundColor: seciliDoktor ? '#0ea5e9' : '#e5e7eb' }]}>
          <Text style={[styles.adimYazi, { color: seciliDoktor ? '#fff' : '#9ca3af' }]}>1</Text>
        </View>
        <View style={[styles.adimCizgi, { backgroundColor: seciliDoktor ? '#0ea5e9' : '#e5e7eb' }]} />
        <View style={[styles.adim, { backgroundColor: tarih ? '#0ea5e9' : '#e5e7eb' }]}>
          <Text style={[styles.adimYazi, { color: tarih ? '#fff' : '#9ca3af' }]}>2</Text>
        </View>
        <View style={[styles.adimCizgi, { backgroundColor: tarih ? '#0ea5e9' : '#e5e7eb' }]} />
        <View style={[styles.adim, { backgroundColor: saat ? '#0ea5e9' : '#e5e7eb' }]}>
          <Text style={[styles.adimYazi, { color: saat ? '#fff' : '#9ca3af' }]}>3</Text>
        </View>
      </View>
      <View style={styles.adimEtiketler}>
        <Text style={[styles.adimEtiket, { color: seciliDoktor ? '#0ea5e9' : '#9ca3af' }]}>Doktor</Text>
        <Text style={[styles.adimEtiket, { color: tarih ? '#0ea5e9' : '#9ca3af' }]}>Tarih</Text>
        <Text style={[styles.adimEtiket, { color: saat ? '#0ea5e9' : '#9ca3af' }]}>Saat</Text>
      </View>

      {seciliDoktor && tarih && saat && (
        <View style={styles.ozet}>
          <Text style={styles.ozetBaslik}>Randevu Özeti</Text>
          <Text style={styles.ozetSatir}>👨‍⚕️ Dr. {seciliDoktor.Ad} — {seciliDoktor.UzmanlikAdi}</Text>
          <Text style={styles.ozetSatir}>📅 {tarih} · {saat}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.buton, (!seciliDoktor || !tarih || !saat || gonderiyor) && styles.butonDevre]}
        onPress={randevuAl}
        disabled={!seciliDoktor || !tarih || !saat || gonderiyor}
      >
        {gonderiyor ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.butonYazi}>
            {!seciliDoktor ? '👨‍⚕️ Önce doktor seçin' : !tarih ? '📅 Tarih seçin' : !saat ? '🕐 Saat seçin' : '✅ Randevu Al'}
          </Text>
        )}
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
                  onPress={() => {
                    const doktor = profilModal;
                    setProfilModal(null);
                    setSeciliDoktor(doktor);
                    setTimeout(() => {
                      scrollRef.current?.scrollTo({ y: tarihYRef.current, animated: true });
                    }, 350);
                  }}
                >
                  <Text style={styles.butonYazi}>Bu Doktoru Seç → Tarih/Saat Seç</Text>
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
  tarihCip: { width: 52, paddingVertical: 10, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  ozet: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#0ea5e9' },
  ozetBaslik: { fontWeight: '700', color: '#1e40af', marginBottom: 6, fontSize: 13 },
  ozetSatir: { fontSize: 13, color: '#1e40af', marginBottom: 3 },
  buton: { backgroundColor: '#0ea5e9', borderRadius: 12, padding: 16, alignItems: 'center' },
  butonDevre: { backgroundColor: '#cbd5e1' },
  butonYazi: { color: '#fff', fontSize: 15, fontWeight: '700' },
  adimKutu: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4, marginTop: 8 },
  adim: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  adimYazi: { fontSize: 13, fontWeight: '700' },
  adimCizgi: { flex: 1, height: 2, maxWidth: 40 },
  adimEtiketler: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  adimEtiket: { fontSize: 11, fontWeight: '600', flex: 1, textAlign: 'center' },
  // Modal
  modalArka: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalKutu: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalBaslik: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalBaslikYazi: { fontSize: 17, fontWeight: '700' },
  modalDoktorAd: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  profilBolum: { marginBottom: 16 },
  profilBaslik: { fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  yorumKart: { borderRadius: 10, padding: 12, marginBottom: 8 },
  calismiyor: { borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, marginBottom: 12 },
  calismiyorYazi: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  calismiyorAlt: { fontSize: 12 },
});
