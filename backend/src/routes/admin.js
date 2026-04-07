const express = require('express');
const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../db');
const authMiddleware = require('../middleware/auth');
const basicAuth = require('../middleware/basicAuth');
const randevuLogger = require('../randevuLogger');
const logger = require('../logger');

const router = express.Router();
router.use(basicAuth);      // 1. katman: Basic Auth (kullanıcı adı + şifre)
router.use(authMiddleware); // 2. katman: JWT token doğrulama

// Sadece Admin rolü erişebilir
router.use((req, res, next) => {
  if (req.kullanici.rol !== 'Admin') {
    return res.status(403).json({ hata: 'Yetkisiz erişim' });
  }
  next();
});

// GET /api/admin/istatistikler
router.get('/istatistikler', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM Hastalar) AS toplamHasta,
        (SELECT COUNT(*) FROM Doktorlar) AS toplamDoktor,
        (SELECT COUNT(*) FROM Randevular) AS toplamRandevu,
        (SELECT COUNT(*) FROM Randevular WHERE Durum = 'Beklemede') AS bekleyen
    `);
    res.json(r.recordset[0]);
  } catch (err) {
    logger.error(`Admin hatası | endpoint="${req.method} ${req.path}" adminId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// GET /api/admin/istatistikler/gunluk — son 30 günün randevu sayısı
router.get('/istatistikler/gunluk', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT
        CONVERT(varchar(10), RandevuTarihi, 23) AS tarih,
        COUNT(*) AS sayi
      FROM Randevular
      WHERE RandevuTarihi >= DATEADD(day, -30, GETDATE())
      GROUP BY CONVERT(varchar(10), RandevuTarihi, 23)
      ORDER BY tarih
    `);
    res.json(r.recordset);
  } catch (err) {
    logger.error(`Admin hatası | endpoint="${req.method} ${req.path}" adminId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// GET /api/admin/istatistikler/uzmanlik — uzmanlığa göre randevu sayısı
router.get('/istatistikler/uzmanlik', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT u.UzmanlikAdi AS isim, COUNT(*) AS sayi
      FROM Randevular rv
      JOIN Doktorlar d ON rv.DoktorID = d.DoktorID
      JOIN Uzmanliklar u ON d.UzmanlikID = u.UzmanlikID
      GROUP BY u.UzmanlikAdi
      ORDER BY sayi DESC
    `);
    res.json(r.recordset);
  } catch (err) {
    logger.error(`Admin hatası | endpoint="${req.method} ${req.path}" adminId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// GET /api/admin/istatistikler/doktor — en çok randevu alan doktorlar (top 5)
router.get('/istatistikler/doktor', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT TOP 5
        k.Ad + ' ' + k.Soyad AS isim,
        COUNT(*) AS sayi
      FROM Randevular rv
      JOIN Doktorlar d ON rv.DoktorID = d.DoktorID
      JOIN Kullaniciler k ON d.KullaniciID = k.KullaniciID
      GROUP BY k.Ad, k.Soyad
      ORDER BY sayi DESC
    `);
    res.json(r.recordset);
  } catch (err) {
    logger.error(`Admin hatası | endpoint="${req.method} ${req.path}" adminId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// GET /api/admin/istatistikler/durum — randevu durum dağılımı
router.get('/istatistikler/durum', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT Durum AS isim, COUNT(*) AS sayi
      FROM Randevular
      GROUP BY Durum
    `);
    res.json(r.recordset);
  } catch (err) {
    logger.error(`Admin hatası | endpoint="${req.method} ${req.path}" adminId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// GET /api/admin/istatistikler/saat — saate göre randevu yoğunluğu
router.get('/istatistikler/saat', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT
        LEFT(CONVERT(varchar(5), RandevuSaati, 108), 5) AS saat,
        COUNT(*) AS sayi
      FROM Randevular
      GROUP BY LEFT(CONVERT(varchar(5), RandevuSaati, 108), 5)
      ORDER BY saat
    `);
    res.json(r.recordset);
  } catch (err) {
    logger.error(`Admin hatası | endpoint="${req.method} ${req.path}" adminId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// GET /api/admin/istatistikler/iptal — son 30 günde iptal edilen randevular
router.get('/istatistikler/iptal', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT TOP 20
        kh.Ad + ' ' + kh.Soyad AS hastaAdi,
        kd.Ad + ' ' + kd.Soyad AS doktorAdi,
        u.UzmanlikAdi,
        CONVERT(varchar(10), rv.RandevuTarihi, 23) AS tarih
      FROM Randevular rv
      JOIN Hastalar h ON rv.HastaID = h.HastaID
      JOIN Kullaniciler kh ON h.KullaniciID = kh.KullaniciID
      JOIN Doktorlar d ON rv.DoktorID = d.DoktorID
      JOIN Kullaniciler kd ON d.KullaniciID = kd.KullaniciID
      JOIN Uzmanliklar u ON d.UzmanlikID = u.UzmanlikID
      WHERE rv.Durum = 'İptal'
        AND rv.RandevuTarihi >= DATEADD(day, -30, GETDATE())
      ORDER BY rv.RandevuTarihi DESC
    `);
    res.json(r.recordset);
  } catch (err) {
    logger.error(`Admin hatası | endpoint="${req.method} ${req.path}" adminId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// GET /api/admin/randevular
router.get('/randevular', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT r.RandevuID, r.RandevuTarihi, r.RandevuSaati, r.Durum, r.Notlar,
             kh.Ad + ' ' + kh.Soyad AS HastaAdi,
             kd.Ad + ' ' + kd.Soyad AS DoktorAdi,
             u.UzmanlikAdi
      FROM Randevular r
      JOIN Hastalar h ON r.HastaID = h.HastaID
      JOIN Kullaniciler kh ON h.KullaniciID = kh.KullaniciID
      JOIN Doktorlar d ON r.DoktorID = d.DoktorID
      JOIN Kullaniciler kd ON d.KullaniciID = kd.KullaniciID
      JOIN Uzmanliklar u ON d.UzmanlikID = u.UzmanlikID
      ORDER BY r.RandevuTarihi DESC, r.RandevuSaati
    `);
    res.json(r.recordset);
  } catch (err) {
    logger.error(`Admin hatası | endpoint="${req.method} ${req.path}" adminId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// PATCH /api/admin/randevular/:id/durum
router.patch('/randevular/:id/durum', async (req, res) => {
  const { durum } = req.body;
  const gecerliDurumlar = ['Beklemede', 'Onaylandı', 'Tamamlandı', 'İptal'];
  if (!durum || !gecerliDurumlar.includes(durum)) {
    return res.status(400).json({ hata: 'Geçersiz durum değeri' });
  }
  if (isNaN(parseInt(req.params.id))) {
    return res.status(400).json({ hata: 'Geçersiz randevu ID' });
  }
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('durum', sql.NVarChar, durum)
      .query('UPDATE Randevular SET Durum = @durum WHERE RandevuID = @id');
    randevuLogger.info(`DURUM DEĞİŞTİ | randevuId=${req.params.id} yeniDurum=${durum} | adminKullaniciId=${req.kullanici.kullaniciId}`);
    res.json({ mesaj: 'Güncellendi' });
  } catch (err) {
    logger.error(`Admin hatası | endpoint="${req.method} ${req.path}" adminId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// DELETE /api/admin/randevular/:id
router.delete('/randevular/:id', async (req, res) => {
  if (isNaN(parseInt(req.params.id))) {
    return res.status(400).json({ hata: 'Geçersiz randevu ID' });
  }
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM Randevular WHERE RandevuID = @id');
    randevuLogger.info(`SİLİNDİ | randevuId=${req.params.id} | adminKullaniciId=${req.kullanici.kullaniciId}`);
    res.json({ mesaj: 'Silindi' });
  } catch (err) {
    logger.error(`Admin hatası | endpoint="${req.method} ${req.path}" adminId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// GET /api/admin/doktorlar
router.get('/doktorlar', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT d.DoktorID, k.KullaniciID, k.Ad, k.Soyad, k.Email, u.UzmanlikAdi, d.Telefon,
             d.Durum, d.IzinBaslangic, d.IzinBitis
      FROM Doktorlar d
      JOIN Kullaniciler k ON d.KullaniciID = k.KullaniciID
      JOIN Uzmanliklar u ON d.UzmanlikID = u.UzmanlikID
    `);
    res.json(r.recordset);
  } catch (err) {
    logger.error(`Admin hatası | endpoint="${req.method} ${req.path}" adminId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// POST /api/admin/doktorlar — yeni doktor ekle
router.post('/doktorlar', async (req, res) => {
  const { ad, soyad, email, sifre, uzmanlikAdi, telefon } = req.body;
  if (!ad || !soyad || !email || !sifre || !uzmanlikAdi) {
    return res.status(400).json({ hata: 'Tüm alanlar zorunludur' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ hata: 'Geçersiz email formatı' });
  }
  if (sifre.length < 6) {
    return res.status(400).json({ hata: 'Şifre en az 6 karakter olmalıdır' });
  }
  try {
    const pool = await getPool();

    // Uzmanlık ID'sini bul
    const uzmanlik = await pool.request()
      .input('uzmanlikAdi', sql.NVarChar, uzmanlikAdi)
      .query('SELECT UzmanlikID FROM Uzmanliklar WHERE UzmanlikAdi = @uzmanlikAdi');

    if (uzmanlik.recordset.length === 0) {
      return res.status(400).json({ hata: 'Uzmanlık bulunamadı' });
    }

    const sifreHash = await bcrypt.hash(sifre, 10);

    const yeniKullanici = await pool.request()
      .input('email', sql.NVarChar, email)
      .input('sifreHash', sql.NVarChar, sifreHash)
      .input('ad', sql.NVarChar, ad)
      .input('soyad', sql.NVarChar, soyad)
      .query(`
        INSERT INTO Kullaniciler (Email, SifreHash, Rol, Ad, Soyad)
        OUTPUT INSERTED.KullaniciID
        VALUES (@email, @sifreHash, 'Doktor', @ad, @soyad)
      `);

    const kullaniciId = yeniKullanici.recordset[0].KullaniciID;

    await pool.request()
      .input('kullaniciId', sql.Int, kullaniciId)
      .input('uzmanlikId', sql.Int, uzmanlik.recordset[0].UzmanlikID)
      .input('telefon', sql.NVarChar, telefon || null)
      .query('INSERT INTO Doktorlar (KullaniciID, UzmanlikID, Telefon) VALUES (@kullaniciId, @uzmanlikId, @telefon)');

    res.status(201).json({ mesaj: 'Doktor eklendi' });
  } catch (err) {
    if (err.number === 2627) return res.status(409).json({ hata: 'Bu email zaten kayıtlı' });
    logger.error(`Admin hatası | endpoint="${req.method} ${req.path}" adminId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// DELETE /api/admin/doktorlar/:id
router.delete('/doktorlar/:id', async (req, res) => {
  if (isNaN(parseInt(req.params.id))) {
    return res.status(400).json({ hata: 'Geçersiz doktor ID' });
  }
  try {
    const pool = await getPool();
    const doktor = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT KullaniciID FROM Doktorlar WHERE DoktorID = @id');

    if (doktor.recordset.length === 0) return res.status(404).json({ hata: 'Doktor bulunamadı' });

    const kullaniciId = doktor.recordset[0].KullaniciID;
    await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM Doktorlar WHERE DoktorID = @id');
    await pool.request().input('kullaniciId', sql.Int, kullaniciId).query('DELETE FROM Kullaniciler WHERE KullaniciID = @kullaniciId');

    res.json({ mesaj: 'Doktor silindi' });
  } catch (err) {
    logger.error(`Admin hatası | endpoint="${req.method} ${req.path}" adminId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// PATCH /api/admin/doktorlar/:id/durum
// Body: { durum: 'Aktif' | 'İzinli' | 'Ayrıldı', izinBaslangic?, izinBitis? }
//
// Senaryo A — Planlı izin: durum='İzinli' + izinBaslangic + izinBitis verilir
//   → Mevcut randevular korunur, yeni randevu alınamaz
// Senaryo B — Anlık izin veya Ayrıldı: tarih verilmez
//   → Gelecekteki tüm randevular iptal edilir, hastalara bildirim gider
// Senaryo C — Aktif yapılır: izin tarihleri temizlenir
router.patch('/doktorlar/:id/durum', async (req, res) => {
  if (isNaN(parseInt(req.params.id))) {
    return res.status(400).json({ hata: 'Geçersiz doktor ID' });
  }

  const { durum, izinBaslangic, izinBitis } = req.body;
  const gecerliDurumlar = ['Aktif', 'İzinli', 'Ayrıldı'];
  if (!durum || !gecerliDurumlar.includes(durum)) {
    return res.status(400).json({ hata: 'Geçersiz durum. Aktif, İzinli veya Ayrıldı olmalı.' });
  }

  // Planlı izin mi? Her iki tarih de verilmeli
  const planliIzin = durum === 'İzinli' && izinBaslangic && izinBitis;

  try {
    const pool = await getPool();

    // Doktor var mı?
    const doktorSonuc = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT d.DoktorID, k.Ad + ' ' + k.Soyad AS DoktorAdi
        FROM Doktorlar d
        JOIN Kullaniciler k ON d.KullaniciID = k.KullaniciID
        WHERE d.DoktorID = @id
      `);

    if (doktorSonuc.recordset.length === 0) {
      return res.status(404).json({ hata: 'Doktor bulunamadı' });
    }

    const doktorAdi = doktorSonuc.recordset[0].DoktorAdi;

    // Durumu güncelle
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('durum', sql.NVarChar, durum)
      .input('izinBaslangic', sql.DateTime, planliIzin ? new Date(izinBaslangic) : null)
      .input('izinBitis', sql.DateTime, planliIzin ? new Date(izinBitis) : null)
      .query(`
        UPDATE Doktorlar
        SET Durum = @durum,
            IzinBaslangic = @izinBaslangic,
            IzinBitis = @izinBitis
        WHERE DoktorID = @id
      `);

    // Anlık izin veya Ayrıldı → gelecekteki randevuları iptal et, bildirim gönder
    if (!planliIzin && durum !== 'Aktif') {
      const randevular = await pool.request()
        .input('doktorId', sql.Int, req.params.id)
        .query(`
          SELECT r.RandevuID, h.KullaniciID AS hastaKullaniciId,
                 CONVERT(varchar(10), r.RandevuTarihi, 23) AS tarih
          FROM Randevular r
          JOIN Hastalar h ON r.HastaID = h.HastaID
          WHERE r.DoktorID = @doktorId
            AND r.RandevuTarihi >= CAST(GETDATE() AS DATE)
            AND r.Durum IN ('Beklemede', 'Onaylandı')
        `);

      // Her randevuyu iptal et ve hastaya bildirim gönder
      for (const randevu of randevular.recordset) {
        await pool.request()
          .input('randevuId', sql.Int, randevu.RandevuID)
          .query("UPDATE Randevular SET Durum = 'İptal' WHERE RandevuID = @randevuId");

        const bildirimMesaj = durum === 'Ayrıldı'
          ? `Dr. ${doktorAdi} artık görevde değil. ${randevu.tarih} tarihli randevunuz iptal edildi.`
          : `Dr. ${doktorAdi} izne çıktı. ${randevu.tarih} tarihli randevunuz iptal edildi.`;

        await pool.request()
          .input('kullaniciId', sql.Int, randevu.hastaKullaniciId)
          .input('mesaj', sql.NVarChar, bildirimMesaj)
          .query('INSERT INTO Bildirimler (KullaniciID, Mesaj) VALUES (@kullaniciId, @mesaj)');
      }

      logger.info(`Doktor durumu değişti: ${doktorAdi} → ${durum} | ${randevular.recordset.length} randevu iptal edildi | admin=${req.kullanici.kullaniciId}`);
    } else {
      logger.info(`Doktor durumu değişti: ${doktorAdi} → ${durum}${planliIzin ? ` (${izinBaslangic} - ${izinBitis})` : ''} | admin=${req.kullanici.kullaniciId}`);
    }

    res.json({ mesaj: `Doktor durumu güncellendi: ${durum}`, durum });
  } catch (err) {
    logger.error(`Admin doktor durum hatası | doktorId=${req.params.id} adminId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// GET /api/admin/hastalar — tüm hasta listesi + profil bilgileri
router.get('/hastalar', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT
        h.HastaID,
        k.Ad, k.Soyad, k.Email,
        h.Telefon, h.TCKimlik, h.DogumTarihi, h.Cinsiyet,
        h.KanGrubu, h.KronikHastaliklar, h.Alerjiler, h.SurekliIlaclar,
        h.AcilKisiAd, h.AcilKisiTelefon, h.Adres,
        (SELECT COUNT(*) FROM Randevular rv WHERE rv.HastaID = h.HastaID) AS ToplamRandevu
      FROM Hastalar h
      JOIN Kullaniciler k ON h.KullaniciID = k.KullaniciID
      ORDER BY k.Ad, k.Soyad
    `);
    res.json(r.recordset);
  } catch (err) {
    logger.error(`Admin hatası | endpoint="${req.method} ${req.path}" adminId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// GET /api/admin/yoneticiler
router.get('/yoneticiler', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT KullaniciID, Ad, Soyad, Email FROM Kullaniciler WHERE Rol = 'Admin'
    `);
    res.json(r.recordset);
  } catch (err) {
    logger.error(`Admin hatası | endpoint="${req.method} ${req.path}" adminId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

module.exports = router;
