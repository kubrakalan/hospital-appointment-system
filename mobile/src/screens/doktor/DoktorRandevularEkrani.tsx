import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, RefreshControl, Modal, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { api } from '../../api';
import { useTheme } from '../../theme';
import { KartSkeleton } from '../../components/Skeleton';

interface Randevu {
  RandevuID: number;
  HastaAdi: string;
  RandevuTarihi: string;
  RandevuSaati: string;
  Durum: string;
  Notlar?: string;
}

interface TibbiBilgi {
  Tani: string; UygulananIslem: string; Recete: string;
  LabNotu: string; SonrakiKontrol: string;
}

const DURUM_RENK: Record<string, string> = {
  'Beklemede': '#f59e0b', 'Onaylandı': '#10b981',
  'Tamamlandı': '#6b7280', 'İptal': '#ef4444', 'Gelmedi': '#f97316',
};

const bosForm: TibbiBilgi = { Tani: '', UygulananIslem: '', Recete: '', LabNotu: '', SonrakiKontrol: '' };

const GUN_KISALTMA = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function tarihFormatla(tarih: string) {
  const [yil, ay, gun] = tarih.split('T')[0].split('-');
  const aylar = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  return `${gun} ${aylar[parseInt(ay)-1]} ${yil}`;
}

function haftaGunleri(haftaBase: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(haftaBase);
    d.setDate(haftaBase.getDate() + i);
    days.push(d);
  }
  return days;
}

function haftaBaslangici(ref: Date): Date {
  const d = new Date(ref);
  const gun = d.getDay(); // 0=Pazar
  const fark = gun === 0 ? -6 : 1 - gun;
  d.setDate(d.getDate() + fark);
  d.setHours(0, 0, 0, 0);
  return d;
}

function tarihStr(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function DoktorRandevularEkrani() {
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

  const yukle = useCallback(async () => {
    try {
      const data = await api.doktorRandevular();
      setRandevular(Array.isArray(data) ? data : []);
    } catch (err: any) { Alert.alert('Hata', err.message); }
    finally { setYukleniyor(false); setYenileniyor(false); }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  async function durumGuncelle(id: number, yeniDurum: string) {
    try {
      await api.doktorRandevuDurum(id, yeniDurum);
      setRandevular(prev => prev.map(r => r.RandevuID === id ? { ...r, Durum: yeniDurum } : r));
    } catch (err: any) { Alert.alert('Hata', err.message); }
  }

  function durumSecenekleri(durum: string, id: number) {
    if (durum === 'Beklemede') {
      Alert.alert('Durum Güncelle', 'Randevu durumunu değiştir:', [
        { text: 'Onayla', onPress: () => durumGuncelle(id, 'Onaylandı') },
        { text: 'İptal Et', style: 'destructive', onPress: () => durumGuncelle(id, 'İptal') },
        { text: 'Vazgeç', style: 'cancel' },
      ]);
    } else if (durum === 'Onaylandı') {
      Alert.alert('Durum Güncelle', 'Randevu durumunu değiştir:', [
        { text: 'Tamamlandı', onPress: () => durumGuncelle(id, 'Tamamlandı') },
        { text: 'Gelmedi', onPress: () => durumGuncelle(id, 'Gelmedi') },
        { text: 'İptal Et', style: 'destructive', onPress: () => durumGuncelle(id, 'İptal') },
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
        sonrakiKontrol: tibbiBilgi.SonrakiKontrol || undefined,
      });
      Alert.alert('Başarılı', 'Tıbbi kayıt kaydedildi.');
      setSeciliRandevu(null);
    } catch (err: any) { Alert.alert('Hata', err.message); }
    finally { setKaydediyor(false); }
  }

  // Takvim yardımcıları
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
    return (
      <View style={[styles.kart, { backgroundColor: c.card }]}>
        <View style={styles.kartUst}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.hastaAd, { color: c.text }]}>{item.HastaAdi}</Text>
            <Text style={[styles.tarih, { color: c.textMuted }]}>
              📅 {tarihFormatla(item.RandevuTarihi)} · {String(item.RandevuSaati).substring(0, 5)}
            </Text>
            {item.Notlar ? (
              <Text style={[styles.notYazi, { color: c.textFaint }]}>💬 {item.Notlar}</Text>
            ) : null}
          </View>
          <View style={[styles.durumEtiket, { backgroundColor: DURUM_RENK[item.Durum] ?? '#9ca3af' }]}>
            <Text style={styles.durumYazi}>{item.Durum}</Text>
          </View>
        </View>
        <View style={[styles.aksiyon, { borderTopColor: c.border }]}>
          {(item.Durum === 'Beklemede' || item.Durum === 'Onaylandı') && (
            <TouchableOpacity
              style={[styles.akBtn, { backgroundColor: '#dcfce7' }]}
              onPress={() => durumSecenekleri(item.Durum, item.RandevuID)}
            >
              <Text style={[styles.akBtnYazi, { color: '#15803d' }]}>Durum</Text>
            </TouchableOpacity>
          )}
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
          {/* Hafta navigasyon */}
          <View style={styles.haftaNav}>
            <TouchableOpacity
              onPress={() => {
                const yeni = new Date(haftaBase);
                yeni.setDate(haftaBase.getDate() - 7);
                setHaftaBase(yeni);
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
                const yeni = new Date(haftaBase);
                yeni.setDate(haftaBase.getDate() + 7);
                setHaftaBase(yeni);
              }}
              style={styles.haftaOk}
            >
              <Text style={[styles.haftaOkYazi, { color: c.text }]}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Günler */}
          <View style={styles.gunlerSatir}>
            {gunluk.map((gun, i) => {
              const str = tarihStr(gun);
              const secili = seciliGun === str;
              const bugun = tarihStr(new Date()) === str;
              const sayi = randevuSayisiGun(str);
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.gunKutu,
                    secili && { backgroundColor: '#10b981', borderRadius: 10 },
                  ]}
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
          {[1,2,3].map(i => <KartSkeleton key={i} />)}
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
              <Text style={{ color: '#0ea5e9', fontSize: 15 }}>İptal</Text>
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.modalBaslik, { color: c.text }]}>Tıbbi Kayıt</Text>
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

          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
            {[
              { alan: 'Tani', label: '🔬 Tanı', multi: true },
              { alan: 'UygulananIslem', label: '🩺 Uygulanan İşlem', multi: true },
              { alan: 'Recete', label: '💊 Reçete', multi: true },
              { alan: 'LabNotu', label: '🧪 Lab / Tahlil Notu', multi: true },
              { alan: 'SonrakiKontrol', label: '📅 Sonraki Kontrol (YYYY-AA-GG)', multi: false },
            ].map(({ alan, label, multi }) => (
              <View key={alan}>
                <Text style={[styles.etiket, { color: c.textMuted }]}>{label}</Text>
                <TextInput
                  style={girdi(multi ? { height: 80, textAlignVertical: 'top' } : {})}
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
  gorunuBar: {
    flexDirection: 'row', padding: 8, gap: 8,
    borderBottomWidth: 1,
  },
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
  nokta: {
    width: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  noktaYazi: { fontSize: 9, fontWeight: '700' },
  kart: {
    borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  kartUst: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  hastaAd: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  tarih: { fontSize: 13 },
  notYazi: { fontSize: 12, marginTop: 5, fontStyle: 'italic' },
  durumEtiket: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  durumYazi: { color: '#fff', fontSize: 11, fontWeight: '700' },
  aksiyon: { flexDirection: 'row', gap: 8, paddingTop: 10, borderTopWidth: 1 },
  akBtn: { flex: 1, borderRadius: 8, padding: 9, alignItems: 'center' },
  akBtnYazi: { fontWeight: '600', fontSize: 13 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1,
  },
  modalBaslik: { fontSize: 15, fontWeight: '700' },
  modalAlt: { fontSize: 11, marginTop: 2 },
  etiket: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  girdi: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
});
