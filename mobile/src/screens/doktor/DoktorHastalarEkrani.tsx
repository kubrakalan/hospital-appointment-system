import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Modal,
} from 'react-native';
import { api } from '../../api';
import { useTheme } from '../../ThemeContext';

interface Hasta {
  HastaID: number;
  HastaAdi: string;
  Email: string;
  ToplamRandevu: number;
  Tamamlanan: number;
  SonRandevu: string;
}

interface HastaRandevu {
  RandevuID: number;
  RandevuTarihi: string;
  RandevuSaati: string;
  Durum: string;
  RandevuTipi: string;
  Notlar: string | null;
  Tani: string | null;
  Recete: string | null;
  UygulananIslem: string | null;
  SonrakiKontrol: string | null;
}

const DURUM_RENK: Record<string, string> = {
  Beklemede: '#f59e0b', Onaylandı: '#10b981',
  Tamamlandı: '#6b7280', İptal: '#ef4444', Gelmedi: '#f97316',
};

const AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function tarihFormatla(tarih: string) {
  if (!tarih) return '';
  const [yil, ay, gun] = tarih.split('T')[0].split('-');
  return `${gun} ${AYLAR[parseInt(ay) - 1]} ${yil}`;
}

function basTakipHarfi(ad: string) {
  return ad.split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2);
}

const RENK_PALETI = ['#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#6366f1'];
function avatarRenk(id: number) {
  return RENK_PALETI[id % RENK_PALETI.length];
}

export default function DoktorHastalarEkrani({ navigation }: any) {
  const { c } = useTheme();
  const [hastalar, setHastalar] = useState<Hasta[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [arama, setArama] = useState('');

  const [detayHasta, setDetayHasta] = useState<Hasta | null>(null);
  const [hastaRandevular, setHastaRandevular] = useState<HastaRandevu[]>([]);
  const [detayYukleniyor, setDetayYukleniyor] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const data = await api.doktorHastalar();
      setHastalar(Array.isArray(data) ? data : []);
    } catch { } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  async function hastaDetayAc(hasta: Hasta) {
    setDetayHasta(hasta);
    setHastaRandevular([]);
    setDetayYukleniyor(true);
    try {
      const data = await api.doktorHastaRandevular(hasta.HastaID);
      setHastaRandevular(Array.isArray(data) ? data : []);
    } catch { } finally {
      setDetayYukleniyor(false);
    }
  }

  const filtreli = hastalar.filter(h =>
    h.HastaAdi.toLowerCase().includes(arama.toLowerCase()) ||
    h.Email.toLowerCase().includes(arama.toLowerCase())
  );

  if (yukleniyor) {
    return (
      <View style={[styles.orta, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Arama */}
      <View style={[styles.aramaKutu, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TextInput
          style={[styles.aramaInput, { backgroundColor: c.input, borderColor: c.border, color: c.text }]}
          value={arama}
          onChangeText={setArama}
          placeholder="🔍 Hasta adı veya e-posta ara..."
          placeholderTextColor={c.textFaint}
        />
        {hastalar.length > 0 && (
          <Text style={[styles.toplamYazi, { color: c.textMuted }]}>
            {filtreli.length} / {hastalar.length} hasta
          </Text>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={yenileniyor}
            onRefresh={() => { setYenileniyor(true); yukle(); }}
            tintColor="#10b981"
          />
        }
      >
        {filtreli.length === 0 ? (
          <View style={styles.bosKutu}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>👥</Text>
            <Text style={[styles.bosYazi, { color: c.textMuted }]}>
              {arama ? 'Eşleşen hasta bulunamadı' : 'Henüz hasta yok'}
            </Text>
            {!arama && (
              <Text style={[styles.bosAlt, { color: c.textFaint }]}>
                Randevularınızı tamamladıkça hastalarınız burada görünecek.
              </Text>
            )}
          </View>
        ) : (
          filtreli.map(hasta => {
            const renk = avatarRenk(hasta.HastaID);
            return (
              <TouchableOpacity
                key={hasta.HastaID}
                style={[styles.hastaKart, { backgroundColor: c.card }]}
                onPress={() => hastaDetayAc(hasta)}
                activeOpacity={0.75}
              >
                {/* Avatar */}
                <View style={[styles.avatar, { backgroundColor: renk + '20', borderColor: renk + '40' }]}>
                  <Text style={[styles.avatarHarf, { color: renk }]}>
                    {basTakipHarfi(hasta.HastaAdi)}
                  </Text>
                </View>

                {/* Bilgiler */}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.hastaAdi, { color: c.text }]}>{hasta.HastaAdi}</Text>
                  <Text style={[styles.hastaEmail, { color: c.textMuted }]} numberOfLines={1}>
                    {hasta.Email}
                  </Text>
                  <Text style={[styles.hastaAlt, { color: c.textFaint }]}>
                    Son ziyaret: {tarihFormatla(hasta.SonRandevu)}
                  </Text>
                </View>

                {/* Sayaçlar */}
                <View style={styles.sayaclar}>
                  <View style={[styles.sayacKutu, { backgroundColor: '#0ea5e915' }]}>
                    <Text style={[styles.sayacSayi, { color: '#0ea5e9' }]}>{hasta.ToplamRandevu}</Text>
                    <Text style={[styles.sayacEtiket, { color: c.textFaint }]}>Randevu</Text>
                  </View>
                  <View style={[styles.sayacKutu, { backgroundColor: '#10b98115' }]}>
                    <Text style={[styles.sayacSayi, { color: '#10b981' }]}>{hasta.Tamamlanan}</Text>
                    <Text style={[styles.sayacEtiket, { color: c.textFaint }]}>Tamam</Text>
                  </View>
                </View>

                <Text style={[styles.okIsareti, { color: c.textFaint }]}>›</Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Hasta Detay Modal */}
      <Modal
        visible={!!detayHasta}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetayHasta(null)}
      >
        {detayHasta && (
          <View style={{ flex: 1, backgroundColor: c.bg }}>
            {/* Modal başlık */}
            <View style={[styles.modalHeader, { backgroundColor: c.card, borderBottomColor: c.border }]}>
              <TouchableOpacity onPress={() => setDetayHasta(null)} style={styles.kapat}>
                <Text style={{ color: '#0ea5e9', fontSize: 15 }}>‹ Geri</Text>
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.modalBaslik, { color: c.text }]}>{detayHasta.HastaAdi}</Text>
                <Text style={[styles.modalAlt, { color: c.textMuted }]}>
                  {detayHasta.ToplamRandevu} randevu · {detayHasta.Tamamlanan} tamamlandı
                </Text>
              </View>
              <TouchableOpacity
                style={styles.mesajButon}
                onPress={() => {
                  setDetayHasta(null);
                  // En son aktif randevuya git (Beklemede/Onaylandı)
                  const aktif = hastaRandevular.find(r =>
                    r.Durum === 'Beklemede' || r.Durum === 'Onaylandı'
                  );
                  if (aktif) {
                    navigation.navigate('Mesajlasma', {
                      randevuId: aktif.RandevuID,
                      karsiAd: detayHasta.HastaAdi,
                    });
                  }
                }}
              >
                <Text style={{ fontSize: 20 }}>💬</Text>
              </TouchableOpacity>
            </View>

            {/* Hasta özet kartı */}
            <View style={[styles.ozetKart, { backgroundColor: '#10b981' }]}>
              <View style={[styles.detayAvatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.detayAvatarHarf}>
                  {basTakipHarfi(detayHasta.HastaAdi)}
                </Text>
              </View>
              <Text style={styles.ozetAd}>{detayHasta.HastaAdi}</Text>
              <Text style={styles.ozetEmail}>{detayHasta.Email}</Text>
              <View style={styles.ozetSatir}>
                <View style={styles.ozetItem}>
                  <Text style={styles.ozetSayi}>{detayHasta.ToplamRandevu}</Text>
                  <Text style={styles.ozetEtiket}>Toplam</Text>
                </View>
                <View style={[styles.ozetAyrac]} />
                <View style={styles.ozetItem}>
                  <Text style={styles.ozetSayi}>{detayHasta.Tamamlanan}</Text>
                  <Text style={styles.ozetEtiket}>Tamamlanan</Text>
                </View>
                <View style={styles.ozetAyrac} />
                <View style={styles.ozetItem}>
                  <Text style={styles.ozetSayi}>
                    {detayHasta.ToplamRandevu > 0
                      ? `%${Math.round((detayHasta.Tamamlanan / detayHasta.ToplamRandevu) * 100)}`
                      : '—'}
                  </Text>
                  <Text style={styles.ozetEtiket}>Katılım</Text>
                </View>
              </View>
            </View>

            {/* Randevu geçmişi */}
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
              <Text style={[styles.gecmisBaslik, { color: c.text }]}>📋 Randevu Geçmişi</Text>

              {detayYukleniyor ? (
                <ActivityIndicator color="#10b981" style={{ marginTop: 24 }} />
              ) : hastaRandevular.length === 0 ? (
                <Text style={[styles.bosYazi, { color: c.textFaint, textAlign: 'center', marginTop: 24 }]}>
                  Kayıt bulunamadı.
                </Text>
              ) : (
                hastaRandevular.map(r => {
                  const durumRenk = DURUM_RENK[r.Durum] ?? '#9ca3af';
                  return (
                    <View key={r.RandevuID} style={[styles.randevuKart, { backgroundColor: c.card }]}>
                      {/* Başlık satırı */}
                      <View style={styles.randevuUst}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.randevuTarih, { color: c.text }]}>
                            {tarihFormatla(r.RandevuTarihi)} · {r.RandevuSaati}
                          </Text>
                          <Text style={[styles.randevuTip, { color: c.textMuted }]}>
                            🏥 {r.RandevuTipi}
                          </Text>
                        </View>
                        <View style={[styles.durumBadge, { backgroundColor: durumRenk + '20' }]}>
                          <Text style={[styles.durumYazi, { color: durumRenk }]}>{r.Durum}</Text>
                        </View>
                      </View>

                      {/* Notlar */}
                      {r.Notlar ? (
                        <Text style={[styles.notYazi, { color: c.textFaint }]}>
                          💬 {r.Notlar}
                        </Text>
                      ) : null}

                      {/* Tıbbi bilgiler */}
                      {(r.Tani || r.Recete || r.UygulananIslem) && (
                        <View style={[styles.tibbiBolum, { borderTopColor: c.border }]}>
                          {r.Tani && (
                            <View style={styles.tibbiSatir}>
                              <Text style={[styles.tibbiEtiket, { color: '#10b981' }]}>🔬 Tanı</Text>
                              <Text style={[styles.tibbiDeger, { color: c.text }]}>{r.Tani}</Text>
                            </View>
                          )}
                          {r.UygulananIslem && (
                            <View style={styles.tibbiSatir}>
                              <Text style={[styles.tibbiEtiket, { color: '#0ea5e9' }]}>🩺 İşlem</Text>
                              <Text style={[styles.tibbiDeger, { color: c.text }]}>{r.UygulananIslem}</Text>
                            </View>
                          )}
                          {r.Recete && (
                            <View style={styles.tibbiSatir}>
                              <Text style={[styles.tibbiEtiket, { color: '#8b5cf6' }]}>💊 Reçete</Text>
                              <Text style={[styles.tibbiDeger, { color: c.text }]}>{r.Recete}</Text>
                            </View>
                          )}
                          {r.SonrakiKontrol && (
                            <View style={styles.tibbiSatir}>
                              <Text style={[styles.tibbiEtiket, { color: '#f59e0b' }]}>📅 Kontrol</Text>
                              <Text style={[styles.tibbiDeger, { color: c.text }]}>
                                {tarihFormatla(r.SonrakiKontrol)}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  orta: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  aramaKutu: { padding: 12, borderBottomWidth: 1 },
  aramaInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, marginBottom: 6 },
  toplamYazi: { fontSize: 11, textAlign: 'right' },

  bosKutu: { alignItems: 'center', paddingTop: 60 },
  bosYazi: { fontSize: 15, fontWeight: '600' },
  bosAlt: { fontSize: 12, marginTop: 6, textAlign: 'center', lineHeight: 18 },

  hastaKart: {
    borderRadius: 16, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarHarf: { fontSize: 16, fontWeight: '800' },
  hastaAdi: { fontSize: 15, fontWeight: '700' },
  hastaEmail: { fontSize: 12, marginTop: 2 },
  hastaAlt: { fontSize: 11, marginTop: 3 },
  sayaclar: { gap: 6 },
  sayacKutu: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center', minWidth: 48 },
  sayacSayi: { fontSize: 14, fontWeight: '800' },
  sayacEtiket: { fontSize: 9, fontWeight: '600' },
  okIsareti: { fontSize: 20, fontWeight: '300', marginLeft: 4 },

  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1,
  },
  kapat: { width: 70 },
  modalBaslik: { fontSize: 15, fontWeight: '700' },
  modalAlt: { fontSize: 11, marginTop: 2 },
  mesajButon: { width: 70, alignItems: 'flex-end' },

  ozetKart: { margin: 16, borderRadius: 18, padding: 20, alignItems: 'center' },
  detayAvatar: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  detayAvatarHarf: { color: '#fff', fontSize: 22, fontWeight: '800' },
  ozetAd: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  ozetEmail: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 16 },
  ozetSatir: { flexDirection: 'row', alignItems: 'center' },
  ozetItem: { alignItems: 'center', paddingHorizontal: 20 },
  ozetSayi: { color: '#fff', fontSize: 22, fontWeight: '800' },
  ozetEtiket: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },
  ozetAyrac: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.3)' },

  gecmisBaslik: { fontSize: 15, fontWeight: '700', marginBottom: 12 },

  randevuKart: {
    borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  randevuUst: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  randevuTarih: { fontSize: 14, fontWeight: '700' },
  randevuTip: { fontSize: 12, marginTop: 2 },
  durumBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  durumYazi: { fontSize: 11, fontWeight: '700' },
  notYazi: { fontSize: 12, fontStyle: 'italic', marginTop: 4 },

  tibbiBolum: { borderTopWidth: 1, marginTop: 10, paddingTop: 10, gap: 6 },
  tibbiSatir: { flexDirection: 'row', gap: 8 },
  tibbiEtiket: { fontSize: 12, fontWeight: '700', width: 60 },
  tibbiDeger: { flex: 1, fontSize: 13 },
});
