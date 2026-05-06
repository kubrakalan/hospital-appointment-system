import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Switch, Animated,
} from 'react-native';
import { api } from '../../api';
import { useTheme } from '../../ThemeContext';

const GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const SAATLER = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

interface GunAyar { aktif: boolean; baslangic: string; bitis: string }
type Program = Record<string, GunAyar>;

const basSifir: Program = Object.fromEntries(
  GUNLER.map(g => [g, { aktif: false, baslangic: '09:00', bitis: '17:00' }])
);

function ToastBildirim({ mesaj, gorunum }: { mesaj: string; gorunum: boolean }) {
  const opasite = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(opasite, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(opasite, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [gorunum]);
  return (
    <Animated.View style={[styles.toast, { opacity: opasite }]}>
      <Text style={styles.toastYazi}>✅ {mesaj}</Text>
    </Animated.View>
  );
}

export default function DoktorCalismaSaatleriEkrani() {
  const { c } = useTheme();
  const [program, setProgram] = useState<Program>(basSifir);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [toastKey, setToastKey] = useState(0);
  const [toastGoster, setToastGoster] = useState(false);

  useEffect(() => {
    api.doktorCalismaSaatleri()
      .then((data: any[]) => {
        if (Array.isArray(data) && data.length > 0) {
          // Tümünü önce sıfırla, sonra API'den gelenleri aktifleştir
          const yeni: Program = Object.fromEntries(
            GUNLER.map(g => [g, { aktif: false, baslangic: '09:00', bitis: '17:00' }])
          );
          data.forEach((kayit: any) => {
            const gun = kayit.Gun ?? kayit.gun;
            if (gun && GUNLER.includes(gun)) {
              // Backend BaslangicSaat / BitisSaat döndürüyor (Saat'i değil)
              const bas = kayit.BaslangicSaat ?? kayit.baslangicSaat ?? kayit.BaslangicSaati ?? '09:00:00';
              const bit = kayit.BitisSaat ?? kayit.bitisSaat ?? kayit.BitisSaati ?? '17:00:00';
              yeni[gun] = {
                aktif: true,
                baslangic: String(bas).substring(0, 5),
                bitis: String(bit).substring(0, 5),
              };
            }
          });
          setProgram(yeni);
        }
      })
      .catch(() => { })
      .finally(() => setYukleniyor(false));
  }, []);

  function toggle(gun: string) {
    setProgram(p => ({ ...p, [gun]: { ...p[gun], aktif: !p[gun].aktif } }));
  }

  function saatSec(gun: string, tip: 'baslangic' | 'bitis') {
    const mevcut = program[gun][tip];
    Alert.alert(
      tip === 'baslangic' ? 'Başlangıç Saati' : 'Bitiş Saati',
      `${gun} için saat seçin:`,
      [
        ...SAATLER.map(s => ({
          text: s === mevcut ? `✓ ${s}` : s,
          onPress: () => {
            setProgram(p => {
              const g = { ...p[gun], [tip]: s };
              // Bitiş başlangıçtan önce olamaz
              if (tip === 'baslangic' && s >= g.bitis) {
                const bitisIdx = SAATLER.indexOf(s);
                g.bitis = SAATLER[Math.min(bitisIdx + 1, SAATLER.length - 1)];
              }
              if (tip === 'bitis' && s <= g.baslangic) {
                Alert.alert('Geçersiz Saat', 'Bitiş saati başlangıç saatinden sonra olmalı.');
                return p;
              }
              return { ...p, [gun]: g };
            });
          },
        })),
        { text: 'Vazgeç', style: 'cancel' },
      ]
    );
  }

  async function kaydet() {
    // Validasyon
    for (const gun of GUNLER) {
      if (program[gun].aktif) {
        if (program[gun].bitis <= program[gun].baslangic) {
          Alert.alert('Hata', `${gun}: Bitiş saati başlangıç saatinden sonra olmalı.`);
          return;
        }
      }
    }

    setKaydediyor(true);
    try {
      const aktifGunler = GUNLER
        .filter(g => program[g].aktif)
        .map(g => ({
          gun: g,
          baslangicSaat: program[g].baslangic,   // backend beklediği alan adı
          bitisSaat: program[g].bitis,
        }));
      await api.doktorCalismaSaatleriGuncelle(aktifGunler);
      setToastKey(k => k + 1);
      setToastGoster(v => !v);
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    } finally {
      setKaydediyor(false);
    }
  }

  if (yukleniyor) {
    return (
      <View style={[styles.orta, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  const aktifSayi = GUNLER.filter(g => program[g].aktif).length;

  return (
    <View style={[styles.kapsayici, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={[styles.aciklama, { color: c.textFaint }]}>
          Çalışmak istediğiniz günleri ve saatleri belirleyin. Hastalar yalnızca bu saatlere randevu alabilecektir.
        </Text>

        {GUNLER.map(gun => {
          const ayar = program[gun];
          return (
            <View
              key={gun}
              style={[
                styles.gunKart,
                {
                  backgroundColor: c.card,
                  borderColor: ayar.aktif ? '#10b981' : c.border,
                },
              ]}
            >
              <View style={styles.gunUst}>
                <View>
                  <Text style={[styles.gunAd, { color: ayar.aktif ? c.text : c.textFaint }]}>{gun}</Text>
                  {ayar.aktif && (
                    <Text style={[styles.saatOzet, { color: '#10b981' }]}>
                      {ayar.baslangic} – {ayar.bitis}
                    </Text>
                  )}
                  {!ayar.aktif && (
                    <Text style={[styles.saatOzet, { color: c.textFaint }]}>Kapalı</Text>
                  )}
                </View>
                <Switch
                  value={ayar.aktif}
                  onValueChange={() => toggle(gun)}
                  trackColor={{ false: c.border, true: '#10b981' }}
                  thumbColor={ayar.aktif ? '#fff' : '#f4f3f4'}
                />
              </View>

              {ayar.aktif && (
                <View style={[styles.saatSecim, { borderTopColor: c.border }]}>
                  <TouchableOpacity
                    style={[styles.saatButon, { backgroundColor: c.surface, borderColor: '#10b981' }]}
                    onPress={() => saatSec(gun, 'baslangic')}
                  >
                    <Text style={[styles.saatButonEtiket, { color: c.textFaint }]}>Başlangıç</Text>
                    <Text style={[styles.saatButonDeger, { color: '#10b981' }]}>{ayar.baslangic}</Text>
                  </TouchableOpacity>

                  <Text style={[styles.okIsareti, { color: c.textMuted }]}>→</Text>

                  <TouchableOpacity
                    style={[styles.saatButon, { backgroundColor: c.surface, borderColor: '#10b981' }]}
                    onPress={() => saatSec(gun, 'bitis')}
                  >
                    <Text style={[styles.saatButonEtiket, { color: c.textFaint }]}>Bitiş</Text>
                    <Text style={[styles.saatButonDeger, { color: '#10b981' }]}>{ayar.bitis}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Alt bar */}
      <View style={[styles.altBar, { backgroundColor: c.card, borderTopColor: c.border }]}>
        <View>
          <Text style={[styles.aktifSayi, { color: c.text }]}>{aktifSayi} gün aktif</Text>
          <Text style={[styles.aktifAlt, { color: c.textFaint }]}>
            {aktifSayi === 0 ? 'Hiç gün seçilmedi' : `Haftada ${aktifSayi} gün çalışıyorsunuz`}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.kaydetButon, kaydediyor && { opacity: 0.6 }]}
          onPress={kaydet}
          disabled={kaydediyor}
        >
          {kaydediyor
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.kaydetYazi}>💾 Kaydet</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Toast bildirimi */}
      <ToastBildirim key={toastKey} mesaj="Çalışma saatleri kaydedildi" gorunum={toastGoster} />
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  aciklama: { fontSize: 13, marginBottom: 16, lineHeight: 20 },
  gunKart: {
    borderRadius: 14, marginBottom: 10, borderWidth: 1.5, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  gunUst: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  gunAd: { fontSize: 15, fontWeight: '700' },
  saatOzet: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  saatSecim: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, padding: 12, gap: 8 },
  saatButon: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1.5 },
  saatButonEtiket: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
  saatButonDeger: { fontSize: 18, fontWeight: '800' },
  okIsareti: { fontSize: 18, fontWeight: '300' },
  altBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderTopWidth: 1,
  },
  aktifSayi: { fontSize: 14, fontWeight: '700' },
  aktifAlt: { fontSize: 11, marginTop: 2 },
  kaydetButon: { backgroundColor: '#10b981', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  kaydetYazi: { color: '#fff', fontWeight: '700', fontSize: 14 },
  toast: {
    position: 'absolute', bottom: 90, alignSelf: 'center',
    backgroundColor: '#10b981', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
  toastYazi: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
