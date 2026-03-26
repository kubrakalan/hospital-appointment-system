const BASE_URL = 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('token');
}

async function istek(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    istek('/admin/istatistikler'),
  adminRandevular: () =>
    istek('/admin/randevular'),
  adminRandevuDurum: (id: number, durum: string) =>
    istek(`/admin/randevular/${id}/durum`, { method: 'PATCH', body: JSON.stringify({ durum }) }),
  adminRandevuSil: (id: number) =>
    istek(`/admin/randevular/${id}`, { method: 'DELETE' }),
  adminDoktorlar: () =>
    istek('/admin/doktorlar'),
  adminDoktorEkle: (data: { ad: string; soyad: string; email: string; sifre: string; uzmanlikAdi: string; telefon?: string }) =>
    istek('/admin/doktorlar', { method: 'POST', body: JSON.stringify(data) }),
  adminDoktorSil: (id: number) =>
    istek(`/admin/doktorlar/${id}`, { method: 'DELETE' }),
  adminYoneticiler: () =>
    istek('/admin/yoneticiler'),
};
