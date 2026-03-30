const BASE_URL = 'http://localhost:3000/api';

const ADMIN_BASIC_TOKEN = btoa(
  `${import.meta.env.VITE_ADMIN_BASIC_USER}:${import.meta.env.VITE_ADMIN_BASIC_PASS}`
);

function getToken() {
  return localStorage.getItem('token');
}

async function istek(path: string, options: RequestInit = {}, adminIstek = false) {
  const token = getToken();
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

  register: (ad: string, soyad: string, email: string, sifre: string) =>
    istek('/auth/register', { method: 'POST', body: JSON.stringify({ ad, soyad, email, sifre }) }),

  randevularim: () =>
    istek('/randevular/benim'),

  doktorlar: () =>
    istek('/randevular/doktorlar'),

  randevuAl: (doktorId: number, tarih: string, saat: string, notlar?: string) =>
    istek('/randevular', { method: 'POST', body: JSON.stringify({ doktorId, tarih, saat: saat + ':00', notlar }) }),

  randevuIptal: (id: number) =>
    istek(`/randevular/${id}/iptal`, { method: 'PATCH' }),

  // Doktor
  doktorRandevular: () =>
    istek('/doktor/randevular'),
  doktorRandevuDurum: (id: number, durum: string) =>
    istek(`/doktor/randevular/${id}/durum`, { method: 'PATCH', body: JSON.stringify({ durum }) }),

  // Admin
  adminIstatistikler: () =>
    istek('/admin/istatistikler', {}, true),
  adminRandevular: () =>
    istek('/admin/randevular', {}, true),
  adminRandevuDurum: (id: number, durum: string) =>
    istek(`/admin/randevular/${id}/durum`, { method: 'PATCH', body: JSON.stringify({ durum }) }, true),
  adminRandevuSil: (id: number) =>
    istek(`/admin/randevular/${id}`, { method: 'DELETE' }, true),
  adminDoktorlar: () =>
    istek('/admin/doktorlar', {}, true),
  adminDoktorEkle: (data: { ad: string; soyad: string; email: string; sifre: string; uzmanlikAdi: string; telefon?: string }) =>
    istek('/admin/doktorlar', { method: 'POST', body: JSON.stringify(data) }, true),
  adminDoktorSil: (id: number) =>
    istek(`/admin/doktorlar/${id}`, { method: 'DELETE' }, true),
  adminYoneticiler: () =>
    istek('/admin/yoneticiler', {}, true),
};
