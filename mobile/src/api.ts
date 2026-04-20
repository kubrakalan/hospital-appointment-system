import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://192.168.1.191:3000/api';

const ADMIN_BASIC_TOKEN = btoa('admin:HastaneAdmin2024!');

async function getToken() {
  return await AsyncStorage.getItem('token');
}

async function istek(path: string, options: RequestInit = {}, adminIstek = false) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(adminIstek ? { 'X-Admin-Auth': `Basic ${ADMIN_BASIC_TOKEN}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.hata || 'Bir hata oluştu');
  return data;
}

export const api = {
  // Auth
  login: (email: string, sifre: string) =>
    istek('/auth/login', { method: 'POST', body: JSON.stringify({ email, sifre }) }),
  register: (ad: string, soyad: string, email: string, sifre: string) =>
    istek('/auth/register', { method: 'POST', body: JSON.stringify({ ad, soyad, email, sifre }) }),
  sifremiUnuttum: (email: string) =>
    istek('/auth/sifremi-unuttum', { method: 'POST', body: JSON.stringify({ email }) }),

  // Hasta
  randevularim: () => istek('/randevular/benim'),
  randevuIptal: (id: number) => istek(`/randevular/${id}/iptal`, { method: 'PATCH' }),
  randevuAl: (doktorId: number, tarih: string, saat: string, notlar?: string) =>
    istek('/randevular', { method: 'POST', body: JSON.stringify({ doktorId, tarih, saat: saat + ':00', notlar }) }),
  doktorlar: () => istek('/randevular/doktorlar'),
  doluSaatler: (doktorId: number, tarih: string) =>
    istek(`/randevular/dolu-saatler?doktorId=${doktorId}&tarih=${tarih}`),
  tibbiBilgiHasta: (randevuId: number) => istek(`/randevular/${randevuId}/tibbi-kayit`),
  hastaOdemelerim: () => istek('/randevular/odemelerim'),
  profilim: () => istek('/randevular/profil'),
  profilGuncelle: (data: {
    ad: string; soyad: string; telefon?: string; tcKimlik?: string;
    dogumTarihi?: string; cinsiyet?: string; kanGrubu?: string;
    kronikHastaliklar?: string; alerjiler?: string; surekliIlaclar?: string;
    acilKisiAd?: string; acilKisiTelefon?: string; adres?: string;
  }) => istek('/randevular/profil', { method: 'PATCH', body: JSON.stringify(data) }),
  sifreDegistir: (eskiSifre: string, yeniSifre: string) =>
    istek('/randevular/sifre-degistir', { method: 'PATCH', body: JSON.stringify({ eskiSifre, yeniSifre }) }),

  // Bildirimler
  bildirimler: () => istek('/bildirimler'),
  bildirimleriOkudu: () => istek('/bildirimler/okundu', { method: 'PATCH' }),

  // Doktor
  doktorRandevular: () => istek('/doktor/randevular'),
  doktorRandevuDurum: (id: number, durum: string) =>
    istek(`/doktor/randevular/${id}/durum`, { method: 'PATCH', body: JSON.stringify({ durum }) }),
  doktorIstatistikler: () => istek('/doktor/istatistikler'),
  doktorTibbiBilgiGetir: (randevuId: number) => istek(`/doktor/randevular/${randevuId}/tibbi-kayit`),
  doktorTibbiBilgiKaydet: (randevuId: number, data: {
    tani?: string; uygulananIslem?: string; recete?: string;
    labNotu?: string; doktorNotu?: string; sonrakiKontrol?: string;
  }) => istek(`/doktor/randevular/${randevuId}/tibbi-kayit`, { method: 'POST', body: JSON.stringify(data) }),
  doktorCalismaSaatleri: () => istek('/doktor/calisma-saatleri'),
  doktorCalismaSaatleriGuncelle: (saatler: { gun: string; baslangicSaat: string; bitisSaat: string }[]) =>
    istek('/doktor/calisma-saatleri', { method: 'PUT', body: JSON.stringify({ saatler }) }),

  // Admin
  adminIstatistikler: () => istek('/admin/istatistikler', {}, true),
  adminRandevular: () => istek('/admin/randevular', {}, true),
  adminRandevuDurum: (id: number, durum: string) =>
    istek(`/admin/randevular/${id}/durum`, { method: 'PATCH', body: JSON.stringify({ durum }) }, true),
  adminRandevuSil: (id: number) =>
    istek(`/admin/randevular/${id}`, { method: 'DELETE' }, true),
  adminDoktorlar: () => istek('/admin/doktorlar', {}, true),
  adminDoktorEkle: (data: { ad: string; soyad: string; email: string; sifre: string; uzmanlikAdi: string; telefon?: string }) =>
    istek('/admin/doktorlar', { method: 'POST', body: JSON.stringify(data) }, true),
  adminDoktorSil: (id: number) =>
    istek(`/admin/doktorlar/${id}`, { method: 'DELETE' }, true),
  adminDoktorDurumGuncelle: (id: number, durum: string) =>
    istek(`/admin/doktorlar/${id}/durum`, { method: 'PATCH', body: JSON.stringify({ durum }) }, true),
  adminHastalar: () => istek('/admin/hastalar', {}, true),
  adminGunlukIstatistik: () => istek('/admin/istatistikler/gunluk', {}, true),

  // Admin — Ödemeler
  adminOdemeler: () => istek('/admin/odemeler', {}, true),
  adminOdemeOzet: () => istek('/admin/odemeler/ozet', {}, true),
  adminOdemeEkle: (data: { randevuId: number; tutar: number; odemeYontemi?: string; notlar?: string }) =>
    istek('/admin/odemeler', { method: 'POST', body: JSON.stringify(data) }, true),
  adminOdemeDurumGuncelle: (id: number, durum: string) =>
    istek(`/admin/odemeler/${id}/durum`, { method: 'PATCH', body: JSON.stringify({ durum }) }, true),

  // Admin — Toplu bildirim / duyuru
  adminTopluBildirim: (baslik: string, mesaj: string) =>
    istek('/admin/bildirim/toplu', { method: 'POST', body: JSON.stringify({ baslik, mesaj }) }, true),
};
