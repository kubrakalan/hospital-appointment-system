import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, RefreshControl, ActivityIndicator, Dimensions,
} from 'react-native';

const EKRAN_GENISLIGI = Dimensions.get('window').width - 32;

function SaglikGrafigi({ kayitlar, tip, renk, c }: {
  kayitlar: { Deger: string; Tarih: string }[]; tip: string; renk: string; c: any;
}) {
  const veriler = kayitlar
    .filter(k => k.Deger && !isNaN(parseFloat(k.Deger)))
    .slice(0, 7)
    .reverse();
  if (veriler.length < 2) return null;

  const degerler = veriler.map(k => parseFloat(k.Deger));
  const min = Math.min(...degerler);
  const max = Math.max(...degerler);
  const aralik = max - min || 1;
  const YUKSEKLIK = 80;
  const cubukGenisligi = Math.floor((EKRAN_GENISLIGI - 16) / veriler.length) - 4;

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: renk, marginBottom: 8 }}>
        {tip} — Son {veriler.length} Ölçüm
      </Text>
      <View style={[{ backgroundColor: c.card, borderRadius: 12, padding: 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: YUKSEKLIK, gap: 4 }}>
          {veriler.map((k, i) => {
            const yukseklik = Math.max(8, ((parseFloat(k.Deger) - min) / aralik) * (YUKSEKLIK - 20) + 20);
            return (
              <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 8, color: c.textFaint, marginBottom: 2 }}>
                  {parseFloat(k.Deger).toFixed(0)}
                </Text>
                <View style={{ width: cubukGenisligi, height: yukseklik, backgroundColor: renk, borderRadius: 4, opacity: i === veriler.length - 1 ? 1 : 0.55 }} />
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', marginTop: 4, gap: 4 }}>
          {veriler.map((k, i) => (
            <Text key={i} style={{ flex: 1, fontSize: 8, color: c.textFaint, textAlign: 'center' }}>
              {k.Tarih.split('T')[0].slice(5).replace('-', '/')}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}
import { api } from '../../api';
import { useTheme } from '../../ThemeContext';
import { tarihFormatla } from '../../utils';

const TIPLER = [
  { tip: 'Tansiyon',    ikon: '🩺', renk: '#ef4444', birim: 'mmHg',  ornek: '120/80' },
  { tip: 'Nabız',       ikon: '💓', renk: '#f97316', birim: '/dk',   ornek: '72' },
  { tip: 'Kan Şekeri',  ikon: '🩸', renk: '#8b5cf6', birim: 'mg/dL', ornek: '95' },
  { tip: 'Ağırlık',     ikon: '⚖️', renk: '#0ea5e9', birim: 'kg',    ornek: '70.5' },
  { tip: 'Ateş',        ikon: '🌡️', renk: '#10b981', birim: '°C',    ornek: '36.6' },
];

interface Kayit { TakipID: number; Tip: string; Deger: string; Tarih: string; Not: string | null }

export default function SaglikTakibiEkrani() {
  const { c } = useTheme();
  const [kayitlar, setKayitlar] = useState<Kayit[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [modal, setModal] = useState(false);
  const [seciliTip, setSeciliTip] = useState(TIPLER[0]);
  const [deger, setDeger] = useState('');
  const [not, setNot] = useState('');
  const [kaydediyor, setKaydediyor] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const data = await api.saglikKayitlari();
      setKayitlar(Array.isArray(data) ? data : []);
    } catch { } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  async function kaydet() {
    if (!deger.trim()) { Alert.alert('Değer giriniz'); return; }
    setKaydediyor(true);
    try {
      await api.saglikEkle(seciliTip.tip, `${deger.trim()} ${seciliTip.birim}`, not.trim() || undefined);
      setModal(false);
      setDeger(''); setNot('');
      yukle();
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    } finally { setKaydediyor(false); }
  }

  async function sil(id: number) {
    Alert.alert('Kaydı Sil', 'Bu kaydı silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try { await api.saglikSil(id); yukle(); } catch (e: any) { Alert.alert('Hata', e.message); }
      }},
    ]);
  }

  const tipBilgi = (tip: string) => TIPLER.find(t => t.tip === tip) ?? TIPLER[0];

  if (yukleniyor) return <View style={[styles.orta, { backgroundColor: c.bg }]}><ActivityIndicator size="large" color="#0ea5e9" /></View>;

  return (
    <>
      <ScrollView
        style={{ backgroundColor: c.bg }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); yukle(); }} tintColor="#0ea5e9" />}
      >
        {/* Özet chip'leri */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {TIPLER.map(t => {
              const son = [...kayitlar].find(k => k.Tip === t.tip);
              return (
                <TouchableOpacity
                  key={t.tip}
                  style={[styles.ozCip, { backgroundColor: c.card, borderColor: c.border }]}
                  onPress={() => { setSeciliTip(t); setModal(true); }}
                >
                  <Text style={styles.ozEmoji}>{t.ikon}</Text>
                  <Text style={[styles.ozTip, { color: c.textMuted }]}>{t.tip}</Text>
                  <Text style={[styles.ozDeger, { color: t.renk }]}>{son ? son.Deger : '—'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Grafikler */}
        {TIPLER.map(t => {
          const tipKayitlar = kayitlar.filter(k => k.Tip === t.tip);
          return tipKayitlar.length >= 2 ? (
            <SaglikGrafigi key={t.tip} kayitlar={tipKayitlar} tip={t.tip} renk={t.renk} c={c} />
          ) : null;
        })}

        {/* Kayıt listesi */}
        {kayitlar.length === 0 ? (
          <View style={styles.bos}>
            <Text style={styles.bosEmoji}>📊</Text>
            <Text style={[styles.bosYazi, { color: c.textFaint }]}>Henüz kayıt yok.</Text>
            <Text style={[styles.bosAlt, { color: c.textFaint }]}>Yukarıdaki kartlara dokunarak ölçüm ekleyebilirsin.</Text>
          </View>
        ) : kayitlar.map(k => {
          const ti = tipBilgi(k.Tip);
          return (
            <View key={k.TakipID} style={[styles.kart, { backgroundColor: c.card }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.tipikonKutu, { backgroundColor: ti.renk + '20' }]}>
                  <Text style={{ fontSize: 22 }}>{ti.ikon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tipAd, { color: c.text }]}>{k.Tip}</Text>
                  <Text style={[styles.kayitTarih, { color: c.textFaint }]}>{tarihFormatla(k.Tarih)}</Text>
                  {k.Not ? <Text style={[styles.kayitNot, { color: c.textMuted }]}>{k.Not}</Text> : null}
                </View>
                <Text style={[styles.kayitDeger, { color: ti.renk }]}>{k.Deger}</Text>
                <TouchableOpacity onPress={() => sil(k.TakipID)} style={styles.silButon}>
                  <Text style={{ color: '#ef4444', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModal(true)}>
        <Text style={styles.fabYazi}>+ Ölçüm Ekle</Text>
      </TouchableOpacity>

      {/* Ekleme Modal */}
      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.modalArka}>
          <View style={[styles.modalKutu, { backgroundColor: c.card }]}>
            <Text style={[styles.modalBaslik, { color: c.text }]}>Ölçüm Ekle</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {TIPLER.map(t => (
                  <TouchableOpacity
                    key={t.tip}
                    onPress={() => { setSeciliTip(t); setDeger(''); }}
                    style={[styles.tipCip, { borderColor: seciliTip.tip === t.tip ? t.renk : c.border, backgroundColor: seciliTip.tip === t.tip ? t.renk + '20' : c.surface }]}
                  >
                    <Text>{t.ikon}</Text>
                    <Text style={[styles.tipCipYazi, { color: seciliTip.tip === t.tip ? t.renk : c.textMuted }]}>{t.tip}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={[styles.girdiEtiket, { color: c.textMuted }]}>
              {seciliTip.tip} ({seciliTip.birim})
            </Text>
            <TextInput
              style={[styles.girdi, { backgroundColor: c.input, borderColor: c.border, color: c.text }]}
              value={deger}
              onChangeText={setDeger}
              placeholder={seciliTip.ornek}
              placeholderTextColor={c.textFaint}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.girdiEtiket, { color: c.textMuted }]}>Not (opsiyonel)</Text>
            <TextInput
              style={[styles.girdi, { backgroundColor: c.input, borderColor: c.border, color: c.text }]}
              value={not}
              onChangeText={setNot}
              placeholder="Örn: sabah aç karnına..."
              placeholderTextColor={c.textFaint}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity style={[styles.buton, { backgroundColor: c.surface, flex: 1 }]} onPress={() => setModal(false)}>
                <Text style={{ color: c.textMuted, fontWeight: '700' }}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.buton, { backgroundColor: '#0ea5e9', flex: 2 }]} onPress={kaydet} disabled={kaydediyor}>
                {kaydediyor ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Kaydet</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bos: { alignItems: 'center', paddingTop: 40 },
  bosEmoji: { fontSize: 48, marginBottom: 12 },
  bosYazi: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  bosAlt: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  ozCip: { width: 90, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1 },
  ozEmoji: { fontSize: 22, marginBottom: 4 },
  ozTip: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
  ozDeger: { fontSize: 13, fontWeight: '800' },
  kart: { borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  tipikonKutu: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  tipAd: { fontSize: 14, fontWeight: '700' },
  kayitTarih: { fontSize: 11, marginTop: 2 },
  kayitNot: { fontSize: 12, marginTop: 2 },
  kayitDeger: { fontSize: 16, fontWeight: '800', marginRight: 4 },
  silButon: { padding: 6 },
  fab: { position: 'absolute', bottom: 24, right: 20, backgroundColor: '#0ea5e9', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 14, shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
  fabYazi: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalArka: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalKutu: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalBaslik: { fontSize: 18, fontWeight: '700', marginBottom: 18, textAlign: 'center' },
  tipCip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tipCipYazi: { fontSize: 12, fontWeight: '600' },
  girdiEtiket: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  girdi: { borderWidth: 1, borderRadius: 10, padding: 13, fontSize: 15, marginBottom: 14 },
  buton: { borderRadius: 12, padding: 14, alignItems: 'center' },
});
