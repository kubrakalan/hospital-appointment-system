import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Linking, Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { api } from '../api';
import { useTheme } from '../ThemeContext';

const CINSIYET = ['Kadın', 'Erkek', 'Belirtmek istemiyorum'];
const KAN_GRUPLARI = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'];

function Bolum({ baslik, c }: { baslik: string; c: any }) {
  return (
    <Text style={[styles.bolumBaslik, { color: c.primary ?? '#0ea5e9' }]}>{baslik}</Text>
  );
}

export default function ProfilEkrani() {
  const { c, isDark, toggleTheme } = useTheme();
  const [profil, setProfil] = useState<any>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [duzenle, setDuzenle] = useState(false);
  const [kullaniciRol, setKullaniciRol] = useState('');

  // Şifre değiştirme
  const [sifreGoster, setSifreGoster] = useState(false);
  const [eskiSifre, setEskiSifre] = useState('');
  const [yeniSifre, setYeniSifre] = useState('');
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState('');
  const [sifreYukleniyor, setSifreYukleniyor] = useState(false);

  const [form, setForm] = useState({
    ad: '', soyad: '', telefon: '', tcKimlik: '',
    dogumTarihi: '', cinsiyet: '', kanGrubu: '',
    kronikHastaliklar: '', alerjiler: '', surekliIlaclar: '',
    acilKisiAd: '', acilKisiTelefon: '', adres: '',
  });

  useEffect(() => {
    AsyncStorage.getItem('kullanici').then(k => {
      if (k) setKullaniciRol(JSON.parse(k).rol?.toLowerCase());
    });
    yukle();
  }, []);

  async function yukle() {
    try {
      const data = await api.profilim();
      setProfil(data);
      setForm({
        ad: data.Ad || '', soyad: data.Soyad || '',
        telefon: data.Telefon || '', tcKimlik: data.TcKimlik || '',
        dogumTarihi: data.DogumTarihi ? data.DogumTarihi.split('T')[0] : '',
        cinsiyet: data.Cinsiyet || '', kanGrubu: data.KanGrubu || '',
        kronikHastaliklar: data.KronikHastaliklar || '',
        alerjiler: data.Alerjiler || '',
        surekliIlaclar: data.SurekliIlaclar || '',
        acilKisiAd: data.AcilKisiAd || '',
        acilKisiTelefon: data.AcilKisiTelefon || '',
        adres: data.Adres || '',
      });
    } catch { } finally { setYukleniyor(false); }
  }

  async function kaydet() {
    setKaydediyor(true);
    try {
      await api.profilGuncelle({
        ad: form.ad, soyad: form.soyad,
        telefon: form.telefon || undefined,
        tcKimlik: form.tcKimlik || undefined,
        dogumTarihi: form.dogumTarihi || undefined,
        cinsiyet: form.cinsiyet || undefined,
        kanGrubu: form.kanGrubu || undefined,
        kronikHastaliklar: form.kronikHastaliklar || undefined,
        alerjiler: form.alerjiler || undefined,
        surekliIlaclar: form.surekliIlaclar || undefined,
        acilKisiAd: form.acilKisiAd || undefined,
        acilKisiTelefon: form.acilKisiTelefon || undefined,
        adres: form.adres || undefined,
      });
      const k = await AsyncStorage.getItem('kullanici');
      if (k) await AsyncStorage.setItem('kullanici', JSON.stringify({ ...JSON.parse(k), ad: form.ad, soyad: form.soyad }));
      Alert.alert('Başarılı', 'Profil güncellendi.');
      setDuzenle(false);
      yukle();
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    } finally { setKaydediyor(false); }
  }

  async function acilSOS() {
    const tel = profil?.AcilKisiTelefon;
    if (!tel) { Alert.alert('Acil kişi yok', 'Profil düzenleme ekranından acil kişi ekleyin.'); return; }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let konumLink = '';
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        konumLink = ` Konum: https://maps.google.com/?q=${loc.coords.latitude},${loc.coords.longitude}`;
      }
      const mesaj = `ACİL DURUM! ${profil?.Ad} ${profil?.Soyad} yardıma ihtiyaç duyuyor.${konumLink}`;
      await Linking.openURL(`sms:${tel}?body=${encodeURIComponent(mesaj)}`);
    } catch { Alert.alert('Hata', 'SMS gönderilemedi.'); }
  }

  async function konumuPaylasim() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('İzin gerekli', 'Konum iznini ayarlardan açın.'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await Linking.openURL(`https://maps.google.com/?q=${loc.coords.latitude},${loc.coords.longitude}`);
    } catch { Alert.alert('Hata', 'Konum alınamadı.'); }
  }

  async function sifreDegistir() {
    if (!eskiSifre || !yeniSifre || !yeniSifreTekrar) { Alert.alert('Hata', 'Tüm şifre alanlarını doldurun.'); return; }
    if (yeniSifre.length < 6) { Alert.alert('Hata', 'Yeni şifre en az 6 karakter olmalı.'); return; }
    if (yeniSifre !== yeniSifreTekrar) { Alert.alert('Hata', 'Yeni şifreler eşleşmiyor.'); return; }
    setSifreYukleniyor(true);
    try {
      await api.sifreDegistir(eskiSifre, yeniSifre);
      Alert.alert('Başarılı', 'Şifreniz güncellendi.');
      setEskiSifre(''); setYeniSifre(''); setYeniSifreTekrar('');
      setSifreGoster(false);
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    } finally { setSifreYukleniyor(false); }
  }

  const girdi = (extra?: object) => ({
    ...styles.girdi,
    backgroundColor: c.input,
    borderColor: c.border,
    color: c.text,
    ...extra,
  });

  if (yukleniyor) return <View style={[styles.orta, { backgroundColor: c.bg }]}><ActivityIndicator size="large" color="#0ea5e9" /></View>;

  const isHasta = kullaniciRol === 'hasta';

  return (
    <ScrollView style={[styles.kapsayici, { backgroundColor: c.bg }]} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      {/* Avatar */}
      <View style={styles.avatarAlani}>
        <View style={styles.avatarDaire}>
          <Text style={styles.avatarHarf}>{profil?.Ad?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={[styles.tamAd, { color: c.text }]}>{profil?.Ad} {profil?.Soyad}</Text>
        <Text style={[styles.rolBadge, { color: c.textMuted }]}>
          {isHasta ? '🧑 Hasta' : '👨‍⚕️ Doktor'}
        </Text>
        {!isHasta && profil?.UzmanlikAdi && (
          <Text style={styles.uzmanlik}>{profil.UzmanlikAdi}</Text>
        )}
      </View>

      {!duzenle ? (
        /* ---- Görüntüleme modu ---- */
        <View style={[styles.kart, { backgroundColor: c.card }]}>
          {[
            { ikon: '📧', etiket: 'E-posta', deger: profil?.Email },
            { ikon: '📱', etiket: 'Telefon', deger: profil?.Telefon },
            ...(isHasta ? [
              { ikon: '🪪', etiket: 'TC Kimlik', deger: profil?.TcKimlik },
              { ikon: '🎂', etiket: 'Doğum Tarihi', deger: profil?.DogumTarihi ? profil.DogumTarihi.split('T')[0] : null },
              { ikon: '⚧', etiket: 'Cinsiyet', deger: profil?.Cinsiyet },
              { ikon: '🩸', etiket: 'Kan Grubu', deger: profil?.KanGrubu },
              { ikon: '🏠', etiket: 'Adres', deger: profil?.Adres },
              { ikon: '💊', etiket: 'Kronik Hastalıklar', deger: profil?.KronikHastaliklar },
              { ikon: '⚠️', etiket: 'Alerjiler', deger: profil?.Alerjiler },
              { ikon: '💉', etiket: 'Sürekli İlaçlar', deger: profil?.SurekliIlaclar },
              { ikon: '🆘', etiket: 'Acil İletişim', deger: profil?.AcilKisiAd ? `${profil.AcilKisiAd} — ${profil.AcilKisiTelefon}` : null },
            ] : [
              { ikon: '🏥', etiket: 'Uzmanlık', deger: profil?.UzmanlikAdi },
            ]),
          ].filter(s => s.deger).map(s => (
            <View key={s.etiket} style={[styles.satirKutu, { borderBottomColor: c.border }]}>
              <Text style={styles.satirIcon}>{s.ikon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.satirEtiket, { color: c.textFaint }]}>{s.etiket}</Text>
                <Text style={[styles.satirDeger, { color: c.text }]}>{s.deger}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.duzenleButon} onPress={() => setDuzenle(true)}>
            <Text style={styles.duzenleYazi}>✏️ Düzenle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ---- Düzenleme modu ---- */
        <View style={[styles.kart, { backgroundColor: c.card }]}>
          <Bolum baslik="Temel Bilgiler" c={{ primary: '#0ea5e9' }} />
          {[
            { alan: 'ad', etiket: 'Ad', kb: 'default' },
            { alan: 'soyad', etiket: 'Soyad', kb: 'default' },
            { alan: 'telefon', etiket: 'Telefon', kb: 'phone-pad' },
          ].map(({ alan, etiket, kb }) => (
            <View key={alan} style={{ marginBottom: 12 }}>
              <Text style={[styles.etiket, { color: c.textMuted }]}>{etiket}</Text>
              <TextInput style={girdi()} value={(form as any)[alan]}
                onChangeText={v => setForm(f => ({ ...f, [alan]: v }))}
                placeholder={etiket} placeholderTextColor={c.textFaint}
                keyboardType={kb as any} />
            </View>
          ))}

          {isHasta && (<>
            <Bolum baslik="Kimlik & Kişisel" c={{ primary: '#0ea5e9' }} />
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.etiket, { color: c.textMuted }]}>TC Kimlik No</Text>
              <TextInput style={girdi()} value={form.tcKimlik}
                onChangeText={v => setForm(f => ({ ...f, tcKimlik: v }))}
                placeholder="11 haneli TC kimlik" placeholderTextColor={c.textFaint}
                keyboardType="numeric" maxLength={11} />
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.etiket, { color: c.textMuted }]}>Doğum Tarihi (YYYY-AA-GG)</Text>
              <TextInput style={girdi()} value={form.dogumTarihi}
                onChangeText={v => setForm(f => ({ ...f, dogumTarihi: v }))}
                placeholder="1990-01-15" placeholderTextColor={c.textFaint} />
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.etiket, { color: c.textMuted }]}>Cinsiyet</Text>
              <View style={styles.cipSatir}>
                {CINSIYET.map(g => (
                  <TouchableOpacity key={g}
                    onPress={() => setForm(f => ({ ...f, cinsiyet: g }))}
                    style={[styles.cip, form.cinsiyet === g && styles.cipSecili]}>
                    <Text style={[styles.cipYazi, form.cinsiyet === g && styles.cipYaziSecili]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.etiket, { color: c.textMuted }]}>Kan Grubu</Text>
              <View style={styles.cipSatir}>
                {KAN_GRUPLARI.map(k => (
                  <TouchableOpacity key={k}
                    onPress={() => setForm(f => ({ ...f, kanGrubu: k }))}
                    style={[styles.cip, form.kanGrubu === k && styles.cipKan]}>
                    <Text style={[styles.cipYazi, form.kanGrubu === k && styles.cipYaziSecili]}>{k}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Bolum baslik="Sağlık Bilgileri" c={{ primary: '#0ea5e9' }} />
            {[
              { alan: 'kronikHastaliklar', etiket: 'Kronik Hastalıklar' },
              { alan: 'alerjiler', etiket: 'Alerjiler' },
              { alan: 'surekliIlaclar', etiket: 'Sürekli Kullandığınız İlaçlar' },
              { alan: 'adres', etiket: 'Adres' },
            ].map(({ alan, etiket }) => (
              <View key={alan} style={{ marginBottom: 12 }}>
                <Text style={[styles.etiket, { color: c.textMuted }]}>{etiket}</Text>
                <TextInput style={girdi({ minHeight: 60, textAlignVertical: 'top' })}
                  value={(form as any)[alan]}
                  onChangeText={v => setForm(f => ({ ...f, [alan]: v }))}
                  placeholder={etiket} placeholderTextColor={c.textFaint}
                  multiline />
              </View>
            ))}

            <Bolum baslik="Acil İletişim" c={{ primary: '#0ea5e9' }} />
            {[
              { alan: 'acilKisiAd', etiket: 'Ad Soyad', kb: 'default' },
              { alan: 'acilKisiTelefon', etiket: 'Telefon', kb: 'phone-pad' },
            ].map(({ alan, etiket, kb }) => (
              <View key={alan} style={{ marginBottom: 12 }}>
                <Text style={[styles.etiket, { color: c.textMuted }]}>{etiket}</Text>
                <TextInput style={girdi()} value={(form as any)[alan]}
                  onChangeText={v => setForm(f => ({ ...f, [alan]: v }))}
                  placeholder={etiket} placeholderTextColor={c.textFaint}
                  keyboardType={kb as any} />
              </View>
            ))}
          </>)}

          <View style={styles.butonSatir}>
            <TouchableOpacity style={[styles.kaydetButon, kaydediyor && { opacity: 0.6 }]} onPress={kaydet} disabled={kaydediyor}>
              {kaydediyor ? <ActivityIndicator color="#fff" /> : <Text style={styles.kaydetYazi}>Kaydet</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iptalButon, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => setDuzenle(false)}>
              <Text style={[styles.iptalYazi, { color: c.textMuted }]}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Şifre Değiştirme */}
      <View style={[styles.kart, { backgroundColor: c.card, marginTop: 14 }]}>
        <TouchableOpacity
          style={styles.sifreSatir}
          onPress={() => setSifreGoster(v => !v)}
        >
          <Text style={[styles.sifreBaslik, { color: c.text }]}>🔒 Şifre Değiştir</Text>
          <Text style={{ color: c.textMuted, fontSize: 18 }}>{sifreGoster ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {sifreGoster && (
          <View style={{ marginTop: 12 }}>
            {[
              { v: eskiSifre, set: setEskiSifre, ph: 'Mevcut şifre' },
              { v: yeniSifre, set: setYeniSifre, ph: 'Yeni şifre (en az 6 karakter)' },
              { v: yeniSifreTekrar, set: setYeniSifreTekrar, ph: 'Yeni şifre tekrar' },
            ].map(({ v, set, ph }) => (
              <TextInput
                key={ph}
                style={[girdi(), { marginBottom: 10 }]}
                value={v}
                onChangeText={set}
                placeholder={ph}
                placeholderTextColor={c.textFaint}
                secureTextEntry
              />
            ))}
            <TouchableOpacity
              style={[styles.kaydetButon, sifreYukleniyor && { opacity: 0.6 }]}
              onPress={sifreDegistir}
              disabled={sifreYukleniyor}
            >
              {sifreYukleniyor ? <ActivityIndicator color="#fff" /> : <Text style={styles.kaydetYazi}>Şifreyi Güncelle</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Uygulama Ayarları */}
      <View style={[styles.kart, { backgroundColor: c.card, marginTop: 14 }]}>
        <Text style={[styles.bolumBaslik, { color: '#0ea5e9', marginTop: 0 }]}>UYGULAMA AYARLARI</Text>

        {/* Gece/Gündüz modu */}
        <View style={[styles.satirKutu, { borderBottomColor: c.border }]}>
          <Text style={styles.satirIcon}>🌙</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.satirEtiket, { color: c.textFaint }]}>Görünüm</Text>
            <Text style={[styles.satirDeger, { color: c.text }]}>{isDark ? 'Gece Modu' : 'Gündüz Modu'}</Text>
          </View>
          <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ true: '#0ea5e9', false: '#d1d5db' }} thumbColor="#fff" />
        </View>

        {/* Konumumu Göster */}
        <TouchableOpacity style={[styles.satirKutu, { borderBottomColor: c.border }]} onPress={konumuPaylasim}>
          <Text style={styles.satirIcon}>📍</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.satirEtiket, { color: c.textFaint }]}>Konumumu Göster</Text>
            <Text style={[styles.satirDeger, { color: c.text }]}>Google Maps'te aç</Text>
          </View>
          <Text style={{ color: c.textFaint, fontSize: 18 }}>›</Text>
        </TouchableOpacity>

        {/* Acil SOS */}
        {isHasta && profil?.AcilKisiAd && (
          <TouchableOpacity style={styles.sosButon} onPress={acilSOS}>
            <Text style={styles.sosIkon}>🆘</Text>
            <View>
              <Text style={styles.sosBaslik}>Acil SOS</Text>
              <Text style={styles.sosAlt}>{profil.AcilKisiAd} · {profil.AcilKisiTelefon}</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarAlani: { alignItems: 'center', paddingVertical: 24 },
  avatarDaire: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: '#0ea5e9', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  avatarHarf: { color: '#fff', fontSize: 34, fontWeight: '700' },
  tamAd: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  rolBadge: { fontSize: 13, marginBottom: 2 },
  uzmanlik: { fontSize: 13, color: '#0ea5e9', fontWeight: '600' },
  kart: {
    borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3, marginBottom: 0,
  },
  satirKutu: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    paddingVertical: 12, borderBottomWidth: 1,
  },
  satirIcon: { fontSize: 20, width: 26, textAlign: 'center', marginTop: 1 },
  satirEtiket: { fontSize: 11, marginBottom: 2 },
  satirDeger: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  duzenleButon: { marginTop: 16, alignItems: 'center', padding: 10 },
  duzenleYazi: { color: '#0ea5e9', fontWeight: '600', fontSize: 14 },
  bolumBaslik: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginTop: 16, marginBottom: 8, textTransform: 'uppercase' },
  etiket: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  girdi: {
    borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14,
  },
  cipSatir: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  cip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'transparent', borderWidth: 1, borderColor: '#e5e7eb',
  },
  cipSecili: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  cipKan: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  cipYazi: { fontSize: 13, color: '#6b7280' },
  cipYaziSecili: { color: '#fff', fontWeight: '600' },
  butonSatir: { flexDirection: 'row', gap: 10, marginTop: 16 },
  kaydetButon: { flex: 1, backgroundColor: '#0ea5e9', borderRadius: 10, padding: 13, alignItems: 'center' },
  kaydetYazi: { color: '#fff', fontWeight: '700', fontSize: 14 },
  iptalButon: { flex: 1, borderRadius: 10, padding: 13, alignItems: 'center', borderWidth: 1 },
  iptalYazi: { fontWeight: '600', fontSize: 14 },
  sifreSatir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sifreBaslik: { fontSize: 15, fontWeight: '700' },
  sosButon: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14, backgroundColor: '#fef2f2', borderRadius: 12, padding: 14 },
  sosIkon: { fontSize: 28 },
  sosBaslik: { fontSize: 14, fontWeight: '700', color: '#dc2626' },
  sosAlt: { fontSize: 12, color: '#ef4444', marginTop: 2 },
});
