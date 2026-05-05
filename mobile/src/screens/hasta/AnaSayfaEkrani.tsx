import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../api';
import { useTheme } from '../../ThemeContext';

const AYLAR = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

function gunFarki(tarih: string) {
  const bugun = new Date(); bugun.setHours(0,0,0,0);
  return Math.round((new Date(tarih.split('T')[0]).getTime() - bugun.getTime()) / 86400000);
}

const DURUM_RENK: Record<string,string> = {
  'Beklemede':'#f59e0b','Onaylandı':'#10b981','Tamamlandı':'#6b7280','İptal':'#ef4444',
};

export default function AnaSayfaEkrani({ navigation }: any) {
  const { c, isDark } = useTheme();
  const [ad, setAd] = useState('');
  const [yaklasanRandevu, setYaklasanRandevu] = useState<any>(null);
  const [sonSaglik, setSonSaglik] = useState<any[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const k = await AsyncStorage.getItem('kullanici');
      if (k) setAd(JSON.parse(k).ad ?? '');
      const [randevular, saglik] = await Promise.all([
        api.randevularim(),
        api.saglikKayitlari(),
      ]);
      const aktif = Array.isArray(randevular)
        ? randevular
            .filter((r: any) => r.Durum === 'Beklemede' || r.Durum === 'Onaylandı')
            .sort((a: any, b: any) => new Date(a.RandevuTarihi).getTime() - new Date(b.RandevuTarihi).getTime())
        : [];
      setYaklasanRandevu(aktif[0] ?? null);
      const tipSon: Record<string,any> = {};
      if (Array.isArray(saglik)) {
        saglik.forEach((k: any) => { if (!tipSon[k.Tip]) tipSon[k.Tip] = k; });
      }
      setSonSaglik(Object.values(tipSon));
    } catch { } finally { setYukleniyor(false); setYenileniyor(false); }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  const saat = isDark ? 'gece' : new Date().getHours() < 12 ? 'sabah' : new Date().getHours() < 18 ? 'öğleden sonra' : 'akşam';
  const selamlama = `İyi ${saat}, ${ad}!`;

  if (yukleniyor) return (
    <View style={[styles.orta, { backgroundColor: c.bg }]}>
      <ActivityIndicator size="large" color="#0ea5e9" />
    </View>
  );

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); yukle(); }} tintColor="#0ea5e9" />}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#0ea5e9' }]}>
        <View style={styles.headerAvatarKutu}>
          <Text style={styles.headerAvatarHarf}>{ad?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSelamlama}>{selamlama}</Text>
          <Text style={styles.headerAlt}>MediRandevu'ya hoş geldiniz</Text>
        </View>
      </View>

      <View style={{ padding: 16 }}>
        {/* Yaklaşan Randevu */}
        <Text style={[styles.bolumBaslik, { color: c.textMuted }]}>YAKLAŞAN RANDEVU</Text>
        {yaklasanRandevu ? (
          <TouchableOpacity
            style={[styles.randevuKart, { backgroundColor: c.card }]}
            onPress={() => navigation.navigate('Randevularım')}
          >
            <View style={[styles.randevuSol, { backgroundColor: '#0ea5e9' }]}>
              <Text style={styles.randevuGun}>
                {yaklasanRandevu.RandevuTarihi.split('T')[0].split('-')[2]}
              </Text>
              <Text style={styles.randevuAy}>
                {AYLAR[parseInt(yaklasanRandevu.RandevuTarihi.split('T')[0].split('-')[1])-1]}
              </Text>
            </View>
            <View style={{ flex: 1, padding: 14 }}>
              <Text style={[styles.randevuDoktor, { color: c.text }]}>Dr. {yaklasanRandevu.DoktorAdi}</Text>
              <Text style={[styles.randevuUzmanlik, { color: c.textMuted }]}>{yaklasanRandevu.UzmanlikAdi}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <Text style={{ fontSize: 12, color: c.textFaint }}>
                  🕐 {String(yaklasanRandevu.RandevuSaati).substring(0,5)}
                </Text>
                <View style={[styles.durumRozet, { backgroundColor: DURUM_RENK[yaklasanRandevu.Durum] ?? '#9ca3af' }]}>
                  <Text style={styles.durumYazi}>{yaklasanRandevu.Durum}</Text>
                </View>
              </View>
              {(() => { const fark = gunFarki(yaklasanRandevu.RandevuTarihi); return fark === 0
                ? <Text style={styles.bugunBadge}>Bugün!</Text>
                : fark === 1 ? <Text style={styles.yarinBadge}>Yarın</Text>
                : <Text style={[styles.farkYazi, { color: c.textFaint }]}>{fark} gün sonra</Text>;
              })()}
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.bosRandevuKart, { backgroundColor: c.card, borderColor: c.border }]}
            onPress={() => navigation.navigate('Randevu Al')}
          >
            <Text style={{ fontSize: 28, marginBottom: 6 }}>📅</Text>
            <Text style={[{ fontSize: 14, color: c.textMuted, marginBottom: 10 }]}>Aktif randevunuz yok</Text>
            <View style={styles.randevuAlButon}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>+ Randevu Al</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Hızlı Erişim */}
        <Text style={[styles.bolumBaslik, { color: c.textMuted, marginTop: 20 }]}>HIZLI ERİŞİM</Text>
        <View style={styles.hizliGrid}>
          {[
            { emj: '➕', ad: 'Randevu Al',    git: 'Randevu Al' },
            { emj: '🗂️', ad: 'Tıbbi Geçmiş',  git: 'Tıbbi Geçmişim' },
            { emj: '❤️', ad: 'Sağlık',        git: 'Sağlık' },
            { emj: '💳', ad: 'Ödemeler',       git: 'Ödemelerim' },
            { emj: '🔔', ad: 'Bildirimler',    git: 'Bildirimler' },
            { emj: '👤', ad: 'Profilim',       git: 'Profilim' },
          ].map(({ emj, ad: name, git }) => (
            <TouchableOpacity
              key={name}
              style={[styles.hizliKart, { backgroundColor: c.card }]}
              onPress={() => navigation.navigate(git)}
            >
              <Text style={{ fontSize: 26 }}>{emj}</Text>
              <Text style={[styles.hizliYazi, { color: c.textMuted }]}>{name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Son Sağlık Ölçümleri */}
        {sonSaglik.length > 0 && (
          <>
            <Text style={[styles.bolumBaslik, { color: c.textMuted, marginTop: 20 }]}>SON SAĞLIK ÖLÇÜMLERİ</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {sonSaglik.map(k => (
                  <TouchableOpacity
                    key={k.TakipID}
                    style={[styles.saglikCip, { backgroundColor: c.card, borderColor: c.border }]}
                    onPress={() => navigation.navigate('Sağlık')}
                  >
                    <Text style={{ fontSize: 20, marginBottom: 4 }}>
                      {k.Tip === 'Tansiyon' ? '🩺' : k.Tip === 'Nabız' ? '💓' : k.Tip === 'Kan Şekeri' ? '🩸' : k.Tip === 'Ağırlık' ? '⚖️' : '🌡️'}
                    </Text>
                    <Text style={[{ fontSize: 11, color: c.textMuted, fontWeight: '600' }]}>{k.Tip}</Text>
                    <Text style={[{ fontSize: 14, fontWeight: '800', color: '#0ea5e9' }]}>{k.Deger}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerAvatarKutu: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  headerAvatarHarf: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSelamlama: { fontSize: 17, fontWeight: '700', color: '#fff' },
  headerAlt: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  bolumBaslik: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
  randevuKart: { borderRadius: 16, flexDirection: 'row', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  randevuSol: { width: 62, justifyContent: 'center', alignItems: 'center', padding: 10 },
  randevuGun: { fontSize: 26, fontWeight: '800', color: '#fff' },
  randevuAy: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  randevuDoktor: { fontSize: 15, fontWeight: '700' },
  randevuUzmanlik: { fontSize: 12, marginTop: 2 },
  durumRozet: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  durumYazi: { color: '#fff', fontSize: 10, fontWeight: '700' },
  bugunBadge: { fontSize: 12, fontWeight: '700', color: '#ef4444', marginTop: 4 },
  yarinBadge: { fontSize: 12, fontWeight: '700', color: '#f59e0b', marginTop: 4 },
  farkYazi: { fontSize: 11, marginTop: 4 },
  bosRandevuKart: { borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', padding: 20, alignItems: 'center' },
  randevuAlButon: { backgroundColor: '#0ea5e9', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 8 },
  hizliGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  hizliKart: { width: '30.5%', borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  hizliYazi: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  saglikCip: { width: 90, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1 },
});