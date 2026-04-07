const express = require('express');
const { getPool, sql } = require('../db');
const authMiddleware = require('../middleware/auth');
const randevuLogger = require('../randevuLogger');
const logger = require('../logger');

const router = express.Router();

// Tüm route'lar için login zorunlu
router.use(authMiddleware);

// ============================================================
// GET /api/randevular/benim
// Giriş yapan hastanın kendi randevularını getirir
// ============================================================
router.get('/benim', async (req, res) => {
  try {
    const pool = await getPool();

    const sonuc = await pool.request()
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .query(`
        SELECT
          r.RandevuID,
          r.RandevuTarihi,
          r.RandevuSaati,
          r.Durum,
          r.Notlar,
          k.Ad + ' ' + k.Soyad AS DoktorAdi,
          u.UzmanlikAdi
        FROM Randevular r
        JOIN Hastalar h ON r.HastaID = h.HastaID
        JOIN Doktorlar d ON r.DoktorID = d.DoktorID
        JOIN Kullaniciler k ON d.KullaniciID = k.KullaniciID
        JOIN Uzmanliklar u ON d.UzmanlikID = u.UzmanlikID
        WHERE h.KullaniciID = @kullaniciId
        ORDER BY r.RandevuTarihi DESC, r.RandevuSaati DESC
      `);

    res.json(sonuc.recordset);
  } catch (err) {
    logger.error(`Randevular hatası | endpoint="${req.method} ${req.path}" kullaniciId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// GET /api/randevular/doktorlar
// Tüm doktor listesini getirir (randevu almak için)
// ============================================================
router.get('/doktorlar', async (req, res) => {
  try {
    const pool = await getPool();

    const sonuc = await pool.request().query(`
      SELECT
        d.DoktorID,
        k.Ad + ' ' + k.Soyad AS Ad,
        u.UzmanlikAdi,
        d.Durum
      FROM Doktorlar d
      JOIN Kullaniciler k ON d.KullaniciID = k.KullaniciID
      JOIN Uzmanliklar u ON d.UzmanlikID = u.UzmanlikID
      WHERE d.Durum = 'Aktif'
         OR (d.Durum = 'İzinli' AND d.IzinBaslangic IS NOT NULL AND GETDATE() < d.IzinBaslangic)
    `);

    res.json(sonuc.recordset);
  } catch (err) {
    logger.error(`Randevular hatası | endpoint="${req.method} ${req.path}" kullaniciId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// POST /api/randevular
// Yeni randevu oluşturur
// ============================================================
router.post('/', async (req, res) => {
  const { doktorId, tarih, saat, notlar } = req.body;

  if (!doktorId || !tarih || !saat) {
    return res.status(400).json({ hata: 'Doktor, tarih ve saat zorunludur' });
  }

  if (isNaN(parseInt(doktorId)) || parseInt(doktorId) <= 0) {
    return res.status(400).json({ hata: 'Geçersiz doktor ID' });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) {
    return res.status(400).json({ hata: 'Geçersiz tarih formatı (YYYY-MM-DD bekleniyor)' });
  }

  const randevuTarih = new Date(tarih);
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  if (randevuTarih < bugun) {
    return res.status(400).json({ hata: 'Geçmiş bir tarihe randevu alınamaz' });
  }

  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(saat)) {
    return res.status(400).json({ hata: 'Geçersiz saat formatı' });
  }

  if (notlar && notlar.length > 500) {
    return res.status(400).json({ hata: 'Notlar 500 karakterden uzun olamaz' });
  }

  try {
    const pool = await getPool();

    // Hastanın HastaID'sini ve ban durumunu tek sorguda al
    const hastaQuery = await pool.request()
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .query('SELECT HastaID, BanBitisTarihi, BanSebebi FROM Hastalar WHERE KullaniciID = @kullaniciId');

    if (hastaQuery.recordset.length === 0) {
      return res.status(403).json({ hata: 'Hasta profili bulunamadı' });
    }

    const hasta = hastaQuery.recordset[0];
    const hastaId = hasta.HastaID;

    // Ban kontrolü — BanBitisTarihi bugünden büyükse ban aktif
    if (hasta.BanBitisTarihi && new Date(hasta.BanBitisTarihi) > new Date()) {
      const banBitis = new Date(hasta.BanBitisTarihi);
      const kalanGun = Math.ceil((banBitis - new Date()) / (1000 * 60 * 60 * 24));
      return res.status(403).json({
        hata: `Randevuya gelmediğiniz için ${kalanGun} gün daha randevu alamazsınız.`,
        banBitis: banBitis.toISOString().split('T')[0],
        kalanGun,
      });
    }

    // Randevuyu ekle
    await pool.request()
      .input('hastaId', sql.Int, hastaId)
      .input('doktorId', sql.Int, doktorId)
      .input('tarih', sql.NVarChar, tarih)
      .input('saat', sql.NVarChar, saat)
      .input('notlar', sql.NVarChar, notlar || null)
      .query(`
        INSERT INTO Randevular (HastaID, DoktorID, RandevuTarihi, RandevuSaati, Notlar)
        VALUES (@hastaId, @doktorId, CAST(@tarih AS DATE), CAST(@saat AS TIME), @notlar)
      `);

    randevuLogger.info(`OLUŞTURULDU | hastaId=${req.kullanici.kullaniciId} doktorId=${doktorId} tarih=${tarih} saat=${saat} ip=${req.ip}`);
    res.status(201).json({ mesaj: 'Randevu oluşturuldu' });
  } catch (err) {
    if (err.number === 2627) { // Unique constraint - çakışma
      return res.status(409).json({ hata: 'Bu saat dolu, başka bir saat seçin' });
    }
    logger.error(`Randevular hatası | endpoint="${req.method} ${req.path}" kullaniciId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// PATCH /api/randevular/:id/iptal
// Randevuyu iptal eder
// ============================================================
router.patch('/:id/iptal', async (req, res) => {
  if (isNaN(parseInt(req.params.id))) {
    return res.status(400).json({ hata: 'Geçersiz randevu ID' });
  }
  try {
    const pool = await getPool();

    const sonuc = await pool.request()
      .input('randevuId', sql.Int, req.params.id)
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .query(`
        UPDATE r SET r.Durum = 'İptal'
        FROM Randevular r
        JOIN Hastalar h ON r.HastaID = h.HastaID
        WHERE r.RandevuID = @randevuId AND h.KullaniciID = @kullaniciId
      `);

    if (sonuc.rowsAffected[0] === 0) {
      return res.status(404).json({ hata: 'Randevu bulunamadı veya yetkiniz yok' });
    }

    randevuLogger.info(`İPTAL | hastaId=${req.kullanici.kullaniciId} randevuId=${req.params.id} iptalEden=hasta ip=${req.ip}`);
    res.json({ mesaj: 'Randevu iptal edildi' });
  } catch (err) {
    logger.error(`Randevular hatası | endpoint="${req.method} ${req.path}" kullaniciId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// GET /api/randevular/profil — hastanın kendi profil bilgileri
// ============================================================
router.get('/profil', async (req, res) => {
  try {
    const pool = await getPool();
    const sonuc = await pool.request()
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .query(`
        SELECT k.Ad, k.Soyad, k.Email,
               h.Telefon, h.TCKimlik, h.DogumTarihi, h.Cinsiyet,
               h.KanGrubu, h.KronikHastaliklar, h.Alerjiler, h.SurekliIlaclar,
               h.AcilKisiAd, h.AcilKisiTelefon, h.Adres,
               h.BanBitisTarihi, h.BanSebebi
        FROM Kullaniciler k
        JOIN Hastalar h ON h.KullaniciID = k.KullaniciID
        WHERE k.KullaniciID = @kullaniciId
      `);
    if (sonuc.recordset.length === 0) {
      return res.status(404).json({ hata: 'Profil bulunamadı' });
    }
    res.json(sonuc.recordset[0]);
  } catch (err) {
    logger.error(`Randevular hatası | endpoint="${req.method} ${req.path}" kullaniciId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// PATCH /api/randevular/profil — profil güncelle
// ============================================================
router.patch('/profil', async (req, res) => {
  const { ad, soyad, telefon, tcKimlik, dogumTarihi, cinsiyet, kanGrubu,
          kronikHastaliklar, alerjiler, surekliIlaclar, acilKisiAd, acilKisiTelefon, adres } = req.body;

  if (!ad || !soyad) {
    return res.status(400).json({ hata: 'Ad ve soyad zorunludur' });
  }
  if (ad.trim().length < 2 || soyad.trim().length < 2) {
    return res.status(400).json({ hata: 'Ad ve soyad en az 2 karakter olmalıdır' });
  }
  if (telefon && !/^[0-9\s\+\-\(\)]{7,15}$/.test(telefon)) {
    return res.status(400).json({ hata: 'Geçersiz telefon numarası' });
  }
  if (tcKimlik && !/^\d{11}$/.test(tcKimlik)) {
    return res.status(400).json({ hata: 'TC Kimlik No 11 haneli olmalıdır' });
  }
  const gecerliKanGruplari = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'];
  if (kanGrubu && !gecerliKanGruplari.includes(kanGrubu)) {
    return res.status(400).json({ hata: 'Geçersiz kan grubu' });
  }

  try {
    const pool = await getPool();
    await pool.request()
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .input('ad', sql.NVarChar, ad.trim())
      .input('soyad', sql.NVarChar, soyad.trim())
      .query('UPDATE Kullaniciler SET Ad = @ad, Soyad = @soyad WHERE KullaniciID = @kullaniciId');

    await pool.request()
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .input('telefon', sql.NVarChar, telefon?.trim() || null)
      .input('tcKimlik', sql.NVarChar, tcKimlik?.trim() || null)
      .input('dogumTarihi', sql.Date, dogumTarihi || null)
      .input('cinsiyet', sql.NVarChar, cinsiyet || null)
      .input('kanGrubu', sql.NVarChar, kanGrubu || null)
      .input('kronikHastaliklar', sql.NVarChar, kronikHastaliklar?.trim() || null)
      .input('alerjiler', sql.NVarChar, alerjiler?.trim() || null)
      .input('surekliIlaclar', sql.NVarChar, surekliIlaclar?.trim() || null)
      .input('acilKisiAd', sql.NVarChar, acilKisiAd?.trim() || null)
      .input('acilKisiTelefon', sql.NVarChar, acilKisiTelefon?.trim() || null)
      .input('adres', sql.NVarChar, adres?.trim() || null)
      .query(`
        UPDATE Hastalar SET
          Telefon = @telefon,
          TCKimlik = @tcKimlik,
          DogumTarihi = @dogumTarihi,
          Cinsiyet = @cinsiyet,
          KanGrubu = @kanGrubu,
          KronikHastaliklar = @kronikHastaliklar,
          Alerjiler = @alerjiler,
          SurekliIlaclar = @surekliIlaclar,
          AcilKisiAd = @acilKisiAd,
          AcilKisiTelefon = @acilKisiTelefon,
          Adres = @adres
        WHERE KullaniciID = @kullaniciId
      `);

    res.json({ mesaj: 'Profil güncellendi' });
  } catch (err) {
    logger.error(`Randevular hatası | endpoint="${req.method} ${req.path}" kullaniciId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// GET /api/randevular/:id/tibbi-kayit
// Hasta kendi randevusunun tıbbi kaydını okur (DoktorNotu gösterilmez)
// ============================================================
router.get('/:id/tibbi-kayit', async (req, res) => {
  if (isNaN(parseInt(req.params.id))) {
    return res.status(400).json({ hata: 'Geçersiz randevu ID' });
  }

  try {
    const pool = await getPool();

    const sonuc = await pool.request()
      .input('randevuId', sql.Int, req.params.id)
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .query(`
        SELECT tb.TibbiBilgiID, tb.Tani, tb.UygulananIslem, tb.Recete,
               tb.LabNotu, tb.SonrakiKontrol, tb.OlusturmaTarihi
        FROM TibbiBilgiler tb
        JOIN Randevular r ON tb.RandevuID = r.RandevuID
        JOIN Hastalar h ON r.HastaID = h.HastaID
        WHERE tb.RandevuID = @randevuId AND h.KullaniciID = @kullaniciId
      `);

    res.json(sonuc.recordset[0] || null);
  } catch (err) {
    logger.error(`Tıbbi kayıt getirme hatası: ${err.message}`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

module.exports = router;
