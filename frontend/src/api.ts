const BASE_URL = 'http://localhost:3000/api';

const ADMIN_BASIC_TOKEN = btoa(
  `${import.meta.env.VITE_ADMIN_BASIC_USER}:${import.meta.env.VITE_ADMIN_BASIC_PASS}`
);

function getToken() {
  return localStorage.getItem('token');
}

function getRefreshToken() {
  return localStorage.getItem('refreshToken');
}

async function tokenYenile(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem('token', data.token);
    return true;
  } catch {
    return false;
  }
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

  // Token süresi dolmuşsa otomatik yenile ve tekrar dene
  if (res.status === 401 && path !== '/auth/refresh') {
    const yenilendi = await tokenYenile();
    if (yenilendi) {
      const yeniToken = getToken();
      const tekrarRes = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(yeniToken ? { Authorization: `Bearer ${yeniToken}` } : {}),
          ...(adminIstek ? { 'X-Admin-Auth': `Basic ${ADMIN_BASIC_TOKEN}` } : {}),
          ...options.headers,
        },
      });
      const tekrarData = await tekrarRes.json();
      if (!tekrarRes.ok) throw new Error(tekrarData.hata || 'Bir hata oluştu');
      return tekrarData;
    } else {
      // Refresh token da geçersiz — çıkış yaptır
      localStorage.removeItem('token');
      localStorage.removeItem('kullanici');
      localStorage.removeItem('refreshToken');
      window.location.href = '/giris';
      throw new Error('Oturum süresi doldu');
    }
  }

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

  profilim: () =>
    istek('/randevular/profil'),
  profilGuncelle: (data: {
    ad: string; soyad: string; telefon?: string; tcKimlik?: string;
    dogumTarihi?: string; cinsiyet?: string; kanGrubu?: string;
    kronikHastaliklar?: string; alerjiler?: string; surekliIlaclar?: string;
    acilKisiAd?: string; acilKisiTelefon?: string; adres?: string;
  }) =>
    istek('/randevular/profil', { method: 'PATCH', body: JSON.stringify(data) }),

  bildirimler: () =>
    istek('/bildirimler'),
  bildirimleriOkudu: () =>
    istek('/bildirimler/okundu', { method: 'PATCH' }),

  sifremiUnuttum: (email: string) =>
    istek('/auth/sifremi-unuttum', { method: 'POST', body: JSON.stringify({ email }) }),
  sifreSifirla: (token: string, yeniSifre: string) =>
    istek('/auth/sifre-sifirla', { method: 'POST', body: JSON.stringify({ token, yeniSifre }) }),

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
  adminGunlukIstatistik: () =>
    istek('/admin/istatistikler/gunluk', {}, true),
  adminUzmanlikIstatistik: () =>
    istek('/admin/istatistikler/uzmanlik', {}, true),
  adminHastalar: () =>
    istek('/admin/hastalar', {}, true),
  adminDoktorIstatistik: () =>
    istek('/admin/istatistikler/doktor', {}, true),
  adminDurumIstatistik: () =>
    istek('/admin/istatistikler/durum', {}, true),
  adminSaatIstatistik: () =>
    istek('/admin/istatistikler/saat', {}, true),
  adminIptalListesi: () =>
    istek('/admin/istatistikler/iptal', {}, true),
};
