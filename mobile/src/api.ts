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
  login: (email: string, sifre: string) =>
    istek('/auth/login', { method: 'POST', body: JSON.stringify({ email, sifre }) }),

  // Hasta
  randevularim: () => istek('/randevular/benim'),
  randevuIptal: (id: number) => istek(`/randevular/${id}/iptal`, { method: 'PATCH' }),
  randevuAl: (doktorId: number, tarih: string, saat: string, notlar?: string) =>
    istek('/randevular', { method: 'POST', body: JSON.stringify({ doktorId, tarih, saat: saat + ':00', notlar }) }),
  doktorlar: () => istek('/randevular/doktorlar'),
  tibbiBilgiHasta: (randevuId: number) => istek(`/randevular/${randevuId}/tibbi-kayit`),
  hastaOdemelerim: () => istek('/randevular/odemelerim'),
  profilim: () => istek('/randevular/profil'),
  profilGuncelle: (data: { ad: string; soyad: string; telefon?: string; tcKimlik?: string; dogumTarihi?: string; cinsiyet?: string; kanGrubu?: string }) =>
    istek('/randevular/profil', { method: 'PATCH', body: JSON.stringify(data) }),

  // Doktor
  doktorRandevular: () => istek('/doktor/randevular'),
  doktorRandevuDurum: (id: number, durum: string) =>
    istek(`/doktor/randevular/${id}/durum`, { method: 'PATCH', body: JSON.stringify({ durum }) }),
  doktorIstatistikler: () => istek('/doktor/istatistikler'),

  // Admin
  adminIstatistikler: () => istek('/admin/istatistikler', {}, true),
  adminRandevular: () => istek('/admin/randevular', {}, true),
  adminRandevuDurum: (id: number, durum: string) =>
    istek(`/admin/randevular/${id}/durum`, { method: 'PATCH', body: JSON.stringify({ durum }) }, true),
  adminDoktorlar: () => istek('/admin/doktorlar', {}, true),
  adminHastalar: () => istek('/admin/hastalar', {}, true),
};
