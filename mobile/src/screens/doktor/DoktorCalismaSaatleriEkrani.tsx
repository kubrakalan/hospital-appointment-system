import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Switch,
} from 'react-native';
import { api } from '../../api';
import { useTheme } from '../../theme';

const GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const SAATLER = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

interface GunAyar {
  aktif: boolean;
  baslangic: string;
  bitis: string;
}

type Program = Record<string, GunAyar>;

const varsayilan: Program = Object.fromEntries(
  GUNLER.map(g => [g, { aktif: g !== 'Cumartesi' && g !== 'Pazar', baslangic: '09:00', bitis: '17:00' }])
);

export default function DoktorCalismaSaatleriEkrani() {
  const { c } = useTheme();
  const [program, setProgram] = useState<Program>(varsayilan);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediyor, setKaydediyor] = useState(false);

  useEffect(() => {
    api.doktorCalismaSaatleri()
      .then((data: any[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const guncellenmis = { ...varsayilan };
          data.forEach((kayit: any) => {
            const gun = kayit.Gun ?? kayit.gun;
            if (gun && GUNLER.includes(gun)) {
              guncellenmis[gun] = {
                aktif: true,
                baslangic: (kayit.BaslangicSaati ?? kayit.baslangicSaati ?? '09:00').substring(0, 5),
                bitis: (kayit.BitisSaati ?? kayit.bitisSaati ?? '17:00').substring(0, 5),
              };
            }
          });
          setProgram(guncellenmis);
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
          onPress: () => setProgram(p => ({ ...p, [gun]: { ...p[gun], [tip]: s } })),
        })),
        { text: 'Vazgeç', style: 'cancel' },
      ]
    );
  }

  async function kaydet() {
    setKaydediyor(true);
    try {
      const aktifGunler = GUNLER
        .filter(g => program[g].aktif)
        .map(g => ({
          gun: g,
          baslangicSaati: program[g].baslangic,
          bitisSaati: program[g].bitis,
        }));
      await api.doktorCalismaSaatleriGuncelle(aktifGunler);
      Alert.alert('Başarılı', 'Çalışma saatleri kaydedildi.');
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

  return (
    <View style={[styles.kapsayici, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={[styles.aciklama, { color: c.textFaint }]}>
          Çalışmak istediğiniz günleri ve saatleri belirleyin. Hastalar yalnızca bu saatlere randevu alabilecektir.
        </Text>

        {GUNLER.map(gun => {
          const ayar = program[gun];
          return (
            <View key={gun} style={[styles.gunKart, { backgroundColor: c.card, borderColor: ayar.aktif ? '#10b981' : c.border }]}>
              <View style={styles.gunUst}>
                <View>
                  <Text style={[styles.gunAd, { color: ayar.aktif ? c.text : c.textFaint }]}>{gun}</Text>
                  {ayar.aktif && (
                    <Text style={[styles.saatOzet, { color: c.textMuted }]}>
                      {ayar.baslangic} – {ayar.bitis}
                    </Text>
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
                    style={[styles.saatButon, { backgroundColor: c.surface, borderColor: c.border }]}
                    onPress={() => saatSec(gun, 'baslangic')}
                  >
                    <Text style={[styles.saatButonEtiket, { color: c.textFaint }]}>Başlangıç</Text>
                    <Text style={[styles.saatButonDeger, { color: '#10b981' }]}>{ayar.baslangic}</Text>
                  </TouchableOpacity>

                  <View style={[styles.cizgi, { backgroundColor: c.border }]} />

                  <TouchableOpacity
                    style={[styles.saatButon, { backgroundColor: c.surface, borderColor: c.border }]}
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

      <View style={[styles.altBar, { backgroundColor: c.card, borderTopColor: c.border }]}>
        <Text style={[styles.aktifSayi, { color: c.textMuted }]}>
          {GUNLER.filter(g => program[g].aktif).length} gün aktif
        </Text>
        <TouchableOpacity
          style={[styles.kaydetButon, kaydediyor && { opacity: 0.6 }]}
          onPress={kaydet}
          disabled={kaydediyor}
        >
          {kaydediyor
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.kaydetYazi}>Kaydet</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  aciklama: { fontSize: 13, marginBottom: 16, lineHeight: 20 },
  gunKart: {
    borderRadius: 14, marginBottom: 10, borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  gunUst: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  gunAd: { fontSize: 15, fontWeight: '700' },
  saatOzet: { fontSize: 12, marginTop: 2 },
  saatSecim: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, padding: 10, gap: 10 },
  saatButon: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1 },
  saatButonEtiket: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
  saatButonDeger: { fontSize: 16, fontWeight: '700' },
  cizgi: { width: 1, height: 36 },
  altBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderTopWidth: 1,
  },
  aktifSayi: { fontSize: 13, fontWeight: '600' },
  kaydetButon: {
    backgroundColor: '#10b981', borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 12,
  },
  kaydetYazi: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
