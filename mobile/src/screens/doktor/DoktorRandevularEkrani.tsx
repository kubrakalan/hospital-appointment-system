import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, RefreshControl, Modal, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { api } from '../../api';
import { useTheme } from '../../ThemeContext';
import { KartSkeleton } from '../../components/Skeleton';

interface Randevu {
  RandevuID: number;
  HastaAdi: string;
  RandevuTarihi: string;
  RandevuSaati: string;
  Durum: string;
  Notlar?: string;
  RandevuTipi?: string;
}

interface TibbiBilgi {
  Tani: string; UygulananIslem: string; Recete: string;
  LabNotu: string; DoktorNotu: string; SonrakiKontrol: string;
}

const DURUM_RENK: Record<string, string> = {
  Beklemede: '#f59e0b', Onaylandı: '#10b981',
  Tamamlandı: '#6b7280', İptal: '#ef4444', Gelmedi: '#f97316',
};

const bosForm: TibbiBilgi = {
  Tani: '', UygulananIslem: '', Recete: '',
  LabNotu: '', DoktorNotu: '', SonrakiKontrol: '',
};

const GUN_KISALTMA = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function tarihFormatla(tarih: string) {
  const [yil, ay, gun] = tarih.split('T')[0].split('-');
  const aylar = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${gun} ${aylar[parseInt(ay) - 1]} ${yil}`;
}

function haftaGunleri(base: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d;
  });
}

function haftaBaslangici(ref: Date): Date {
  const d = new Date(ref);
  const gun = d.getDay();
  d.setDate(d.getDate() + (gun === 0 ? -6 : 1 - gun));
  d.setHours(0, 0, 0, 0);
  return d;
}

function tarihStr(d: Date) {
  return d.toISOString().split('T')[0];
}

async function recetePdf(randevu: Randevu, bilgi: TibbiBilgi) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <style>
    body{font-family:Arial,sans-serif;padding:40px;color:#111}
    h1{color:#10b981;border-bottom:2px solid #10b981;padding-bottom:10px}
    .alan{margin-bottom:18px} .etiket{font-size:12px;color:#6b7280;font-weight:bold;margin-bottom:4px}
    .deger{font-size:14px;color:#111;white-space:pre-wrap}
    .footer{margin-top:40px;border-top:1px solid #e5e7eb;padding-top:12px;font-size:11px;color:#9ca3af}
  </style></head><body>
  <h1>🏥 E-Reçete</h1>
  <div class="alan"><div class="etiket">Hasta</div><div class="deger">${randevu.HastaAdi}</div></div>
  <div class="alan"><div class="etiket">Tarih</div><div class="deger">${tarihFormatla(randevu.RandevuTarihi)}</div></div>
  ${bilgi.Tani ? `<div class="alan"><div class="etiket">Tanı</div><div class="deger">${bilgi.Tani}</div></div>` : ''}
  ${bilgi.UygulananIslem ? `<div class="alan"><div class="etiket">Uygulanan İşlem</div><div class="deger">${bilgi.UygulananIslem}</div></div>` : ''}
  ${bilgi.Recete ? `<div class="alan"><div class="etiket">Reçete / İlaçlar</div><div class="deger">${bilgi.Recete}</div></div>` : ''}
  ${bilgi.LabNotu ? `<div class="alan"><div class="etiket">Lab / Tahlil</div><div class="deger">${bilgi.LabNotu}</div></div>` : ''}
  ${bilgi.SonrakiKontrol ? `<div class="alan"><div class="etiket">Sonraki Kontrol</div><div class="deger">${bilgi.SonrakiKontrol}</div></div>` : ''}
  <div class="footer">MediRandevu Hastane Bilgi Sistemi · ${new Date().toLocaleDateString('tr-TR')}</div>
  </body></html>`;
  try {
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'E-Reçete PDF' });
  } catch (e: any) {
    Alert.alert('Hata', e.message);
  }
}

export default function DoktorRandevularEkrani({ navigation }: any) {
  const { c } = useTheme();
  const [randevular, setRandevular] = useState<Randevu[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [gorunu, setGorunu] = useState<'liste' | 'takvim'>('liste');
  const [haftaBase, setHaftaBase] = useState(() => haftaBaslangici(new Date()));
  const [seciliGun, setSeciliGun] = useState<string>(tarihStr(new Date()));
  const [seciliRandevu, setSeciliRandevu] = useState<Randevu | null>(null);
  const [tibbiBilgi, setTibbiBilgi] = useState<TibbiBilgi>(bosForm);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [pdfYukleniyor, setPdfYukleniyor] = useState(false);
  // Her kart için ayrı loading: randevuId → yükleniyorMu
  const [durumYukleniyor, setDurumYukleniyor] = useState<Record<number, boolean>>({});

  const yukle = useCallback(async () => {
    try {
      const data = await api.doktorRandevular();
      setRandevular(Array.isArray(data) ? data : []);
    } catch (err: any) { Alert.alert('Hata', err.message); }
    finally { setYukleniyor(false); setYenileniyor(false); }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  async function durumGuncelle(id: number, yeniDurum: string) {
    setDurumYukleniyor(prev => ({ ...prev, [id]: true }));
    try {
      await api.doktorRandevuDurum(id, yeniDurum);
      setRandevular(prev => prev.map(r => r.RandevuID === id ? { ...r, Durum: yeniDurum } : r));
    } catch (err: any) { Alert.alert('Hata', err.message); }
    finally { setDurumYukleniyor(prev => ({ ...prev, [id]: false })); }
  }

  function durumSecenekleri(durum: string, id: number) {
    if (durum === 'Beklemede') {
      Alert.alert('Durum Güncelle', 'Randevu durumunu değiştir:', [
        { text: '✅ Onayla', onPress: () => durumGuncelle(id, 'Onaylandı') },
        { text: '❌ İptal Et', style: 'destructive', onPress: () => durumGuncelle(id, 'İptal') },
        { text: 'Vazgeç', style: 'cancel' },
      ]);
    } else if (durum === 'Onaylandı') {
      Alert.alert('Durum Güncelle', 'Randevu durumunu değiştir:', [
        { text: '✅ Tamamlandı', onPress: () => durumGuncelle(id, 'Tamamlandı') },
        { text: '🚫 Gelmedi', onPress: () => durumGuncelle(id, 'Gelmedi') },
        { text: '❌ İptal Et', style: 'destructive', onPress: () => durumGuncelle(id, 'İptal') },
        { text: 'Vazgeç', style: 'cancel' },
      ]);
    }
  }

  async function tibbiBilgiAc(randevu: Randevu) {
    setSeciliRandevu(randevu);
    setTibbiBilgi(bosForm);
    try {
      const mevcut = await api.doktorTibbiBilgiGetir(randevu.RandevuID);
      if (mevcut) {
        setTibbiBilgi({
          Tani: mevcut.Tani ?? '',
          UygulananIslem: mevcut.UygulananIslem ?? '',
          Recete: mevcut.Recete ?? '',
          LabNotu: mevcut.LabNotu ?? '',
          DoktorNotu: mevcut.DoktorNotu ?? '',
          SonrakiKontrol: mevcut.SonrakiKontrol ? mevcut.SonrakiKontrol.split('T')[0] : '',
        });
      }
    } catch { }
  }

  async function tibbiBilgiKaydet() {
    if (!seciliRandevu) return;
    setKaydediyor(true);
    try {
      await api.doktorTibbiBilgiKaydet(seciliRandevu.RandevuID, {
        tani: tibbiBilgi.Tani || undefined,
        uygulananIslem: tibbiBilgi.UygulananIslem || undefined,
        recete: tibbiBilgi.Recete || undefined,
        labNotu: tibbiBilgi.LabNotu || undefined,
        doktorNotu: tibbiBilgi.DoktorNotu || undefined,
        sonrakiKontrol: tibbiBilgi.SonrakiKontrol || undefined,
      });
      Alert.alert('✅ Kaydedildi', 'Tıbbi kayıt başarıyla kaydedildi.');
      setSeciliRandevu(null);
    } catch (err: any) { Alert.alert('Hata', err.message); }
    finally { setKaydediyor(false); }
  }

  const gunluk = haftaGunleri(haftaBase);

  function randevuSayisiGun(tarih: string) {
    return randevular.filter(r => r.RandevuTarihi.split('T')[0] === tarih && r.Durum !== 'İptal').length;
  }

  const filtreliListe = gorunu === 'takvim'
    ? randevular.filter(r => r.RandevuTarihi.split('T')[0] === seciliGun)
    : randevular;

  const girdi = (extra?: object) => ({
    ...styles.girdi, backgroundColor: c.input, borderColor: c.border, color: c.text, ...extra,
  });

  function RandevuKart({ item }: { item: Randevu }) {
    const yukl = durumYukleniyor[item.RandevuID];
    const durumRenk = DURUM_RENK[item.Durum] ?? '#9ca3af';
    return (
      <View style={[styles.kart, { backgroundColor: c.card }]}>
        <View style={styles.kartUst}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.hastaAd, { color: c.text }]}>{item.HastaAdi}</Text>
            <Text style={[styles.tarih, { color: c.textMuted }]}>
              📅 {tarihFormatla(item.RandevuTarihi)} · {String(item.RandevuSaati).substring(0, 5)}
            </Text>
            {item.RandevuTipi ? (
              <Text style={[styles.tipYazi, { color: c.textFaint }]}>🏥 {item.RandevuTipi}</Text>
            ) : null}
            {item.Notlar ? (
              <Text style={[styles.notYazi, { color: c.textFaint }]} numberOfLines={2}>💬 {item.Notlar}</Text>
            ) : null}
          </View>
          <View style={[styles.durumEtiket, { backgroundColor: durumRenk + '20' }]}>
            <Text style={[styles.durumYazi, { color: durumRenk }]}>{item.Durum}</Text>
          </View>
        </View>

        <View style={[styles.aksiyon, { borderTopColor: c.border }]}>
          {/* Durum değiştirme butonu */}
          {(item.Durum === 'Beklemede' || item.Durum === 'Onaylandı') && (
            <TouchableOpacity
              style={[styles.akBtn, { backgroundColor: '#dcfce7', opacity: yukl ? 0.6 : 1 }]}
              onPress={() => durumSecenekleri(item.Durum, item.RandevuID)}
              disabled={yukl}
            >
              {yukl
                ? <ActivityIndicator size="small" color="#15803d" />
                : <Text style={[styles.akBtnYazi, { color: '#15803d' }]}>⚙️ Durum</Text>
              }
            </TouchableOpacity>
          )}

          {/* Mesaj butonu — aktif randevularda */}
          {(item.Durum === 'Beklemede' || item.Durum === 'Onaylandı') && (
            <TouchableOpacity
              style={[styles.akBtn, { backgroundColor: '#dbeafe' }]}
              onPress={() => navigation.navigate('Mesajlasma', {
                randevuId: item.RandevuID,
                karsiAd: item.HastaAdi,
              })}
            >
              <Text style={[styles.akBtnYazi, { color: '#1d4ed8' }]}>💬 Mesaj</Text>
            </TouchableOpacity>
          )}

          {/* Video görüşme — Online randevularda */}
          {item.RandevuTipi === 'Online' && (item.Durum === 'Beklemede' || item.Durum === 'Onaylandı') && (
            <TouchableOpacity
              style={[styles.akBtn, { backgroundColor: '#dcfce7' }]}
              onPress={() => navigation.navigate('VideoGorusme', { randevuId: item.RandevuID })}
            >
              <Text style={[styles.akBtnYazi, { color: '#16a34a' }]}>📹 Video</Text>
            </TouchableOpacity>
          )}

          {/* Tıbbi kayıt — tamamlanan veya gelmedi */}
          {(item.Durum === 'Tamamlandı' || item.Durum === 'Gelmedi') && (
            <TouchableOpacity
              style={[styles.akBtn, { backgroundColor: '#ede9fe' }]}
              onPress={() => tibbiBilgiAc(item)}
            >
              <Text style={[styles.akBtnYazi, { color: '#7c3aed' }]}>🩺 Tıbbi Kayıt</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.kapsayici, { backgroundColor: c.bg }]}>
      {/* Liste / Takvim seçici */}
      <View style={[styles.gorunuBar, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        {(['liste', 'takvim'] as const).map(g => (
          <TouchableOpacity
            key={g}
            style={[styles.gorunuBtn, gorunu === g && { backgroundColor: '#10b981' }]}
            onPress={() => setGorunu(g)}
          >
            <Text style={[styles.gorunuYazi, { color: gorunu === g ? '#fff' : c.textMuted }]}>
              {g === 'liste' ? '📋 Liste' : '📆 Takvim'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Takvim görünümü */}
      {gorunu === 'takvim' && (
        <View style={[styles.takvimKapsayici, { backgroundColor: c.card, borderBottomColor: c.border }]}>
          <View style={styles.haftaNav}>
            <TouchableOpacity
              onPress={() => {
                const y = new Date(haftaBase); y.setDate(y.getDate() - 7); setHaftaBase(y);
              }}
              style={styles.haftaOk}
            >
              <Text style={[styles.haftaOkYazi, { color: c.text }]}>‹</Text>
            </TouchableOpacity>
            <Text style={[styles.haftaAy, { color: c.text }]}>
              {gunluk[0].toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity
              onPress={() => {
                const y = new Date(haftaBase); y.setDate(y.getDate() + 7); setHaftaBase(y);
              }}
              style={styles.haftaOk}
            >
              <Text style={[styles.haftaOkYazi, { color: c.text }]}>›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.gunlerSatir}>
            {gunluk.map((gun, i) => {
              const str = tarihStr(gun);
              const secili = seciliGun === str;
              const bugun = tarihStr(new Date()) === str;
              const sayi = randevuSayisiGun(str);
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.gunKutu, secili && { backgroundColor: '#10b981', borderRadius: 10 }]}
                  onPress={() => setSeciliGun(str)}
                >
                  <Text style={[styles.gunKisalt, { color: secili ? '#fff' : c.textFaint }]}>
                    {GUN_KISALTMA[i]}
                  </Text>
                  <Text style={[
                    styles.gunSayi,
                    { color: secili ? '#fff' : bugun ? '#10b981' : c.text },
                    bugun && !secili && { fontWeight: '800' },
                  ]}>
                    {gun.getDate()}
                  </Text>
                  {sayi > 0 && (
                    <View style={[styles.nokta, { backgroundColor: secili ? '#fff' : '#10b981' }]}>
                      <Text style={[styles.noktaYazi, { color: secili ? '#10b981' : '#fff' }]}>{sayi}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Liste */}
      {yukleniyor ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {[1, 2, 3].map(i => <KartSkeleton key={i} />)}
        </ScrollView>
      ) : (
        <FlatList
          data={filtreliListe}
          keyExtractor={item => String(item.RandevuID)}
          contentContainerStyle={filtreliListe.length === 0 ? styles.bos : { padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={yenileniyor}
              onRefresh={() => { setYenileniyor(true); yukle(); }}
              tintColor="#10b981"
            />
          }
          ListEmptyComponent={
            <View style={styles.orta}>
              <Text style={styles.bosEmoji}>📋</Text>
              <Text style={[styles.bosYazi, { color: c.textFaint }]}>
                {gorunu === 'takvim' ? 'Bu gün randevu yok.' : 'Randevu bulunamadı.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => <RandevuKart item={item} />}
        />
      )}

      {/* Tıbbi Kayıt Modalı */}
      <Modal visible={!!seciliRandevu} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: c.bg }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalHeader, { backgroundColor: c.card, borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={() => setSeciliRandevu(null)}>
              <Text style={{ color: '#ef4444', fontSize: 15 }}>Kapat</Text>
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.modalBaslik, { color: c.text }]}>🩺 Tıbbi Kayıt</Text>
              {seciliRandevu && (
                <Text style={[styles.modalAlt, { color: c.textMuted }]}>
                  {seciliRandevu.HastaAdi} · {tarihFormatla(seciliRandevu.RandevuTarihi)}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={tibbiBilgiKaydet} disabled={kaydediyor}>
              {kaydediyor
                ? <ActivityIndicator color="#10b981" />
                : <Text style={{ color: '#10b981', fontSize: 15, fontWeight: '700' }}>Kaydet</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            {[
              { alan: 'Tani', label: '🔬 Tanı', multi: true },
              { alan: 'UygulananIslem', label: '🩺 Uygulanan İşlem', multi: true },
              { alan: 'Recete', label: '💊 Reçete / İlaçlar', multi: true },
              { alan: 'LabNotu', label: '🧪 Lab / Tahlil Notu', multi: true },
              { alan: 'DoktorNotu', label: '📝 Doktor Notu (gizli)', multi: true },
              { alan: 'SonrakiKontrol', label: '📅 Sonraki Kontrol (YYYY-AA-GG)', multi: false },
            ].map(({ alan, label, multi }) => (
              <View key={alan} style={{ marginBottom: 14 }}>
                <Text style={[styles.etiket, { color: c.textMuted }]}>{label}</Text>
                <TextInput
                  style={girdi(multi ? { minHeight: 80, textAlignVertical: 'top' } : {})}
                  value={(tibbiBilgi as any)[alan]}
                  onChangeText={v => setTibbiBilgi(f => ({ ...f, [alan]: v }))}
                  placeholder={label.replace(/^[^ ]+ /, '')}
                  placeholderTextColor={c.textFaint}
                  multiline={multi}
                  keyboardType={alan === 'SonrakiKontrol' ? 'numeric' : 'default'}
                  autoCapitalize="sentences"
                />
              </View>
            ))}

            {/* E-Reçete PDF butonu */}
            {seciliRandevu && (
              <TouchableOpacity
                style={[styles.pdfButon, pdfYukleniyor && { opacity: 0.6 }]}
                onPress={async () => {
                  if (!seciliRandevu) return;
                  setPdfYukleniyor(true);
                  await recetePdf(seciliRandevu, tibbiBilgi);
                  setPdfYukleniyor(false);
                }}
                disabled={pdfYukleniyor}
              >
                {pdfYukleniyor
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.pdfButonYazi}>📄 E-Reçete PDF Oluştur</Text>
                }
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  bos: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bosEmoji: { fontSize: 48, marginBottom: 12 },
  bosYazi: { fontSize: 15 },
  gorunuBar: { flexDirection: 'row', padding: 8, gap: 8, borderBottomWidth: 1 },
  gorunuBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  gorunuYazi: { fontSize: 13, fontWeight: '700' },
  takvimKapsayici: { borderBottomWidth: 1, paddingBottom: 12 },
  haftaNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 10, marginBottom: 8 },
  haftaOk: { padding: 8 },
  haftaOkYazi: { fontSize: 24, fontWeight: '300' },
  haftaAy: { fontSize: 13, fontWeight: '700' },
  gunlerSatir: { flexDirection: 'row', paddingHorizontal: 6 },
  gunKutu: { flex: 1, alignItems: 'center', paddingVertical: 6, gap: 4 },
  gunKisalt: { fontSize: 10, fontWeight: '600' },
  gunSayi: { fontSize: 15, fontWeight: '600' },
  nokta: { width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  noktaYazi: { fontSize: 9, fontWeight: '700' },
  kart: {
    borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  kartUst: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  hastaAd: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  tarih: { fontSize: 13 },
  tipYazi: { fontSize: 12, marginTop: 3 },
  notYazi: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  durumEtiket: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  durumYazi: { fontSize: 11, fontWeight: '700' },
  aksiyon: { flexDirection: 'row', gap: 8, paddingTop: 10, borderTopWidth: 1, flexWrap: 'wrap' },
  akBtn: { flex: 1, borderRadius: 8, padding: 9, alignItems: 'center', minWidth: 90 },
  akBtnYazi: { fontWeight: '600', fontSize: 13 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1,
  },
  modalBaslik: { fontSize: 15, fontWeight: '700' },
  modalAlt: { fontSize: 11, marginTop: 2 },
  etiket: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  girdi: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  pdfButon: {
    backgroundColor: '#7c3aed', borderRadius: 12, padding: 14,
    alignItems: 'center', marginTop: 8,
  },
  pdfButonYazi: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
