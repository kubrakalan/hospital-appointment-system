const express = require('express');
const { getPool, sql } = require('../db');
const authMiddleware = require('../middleware/auth');
const randevuLogger = require('../randevuLogger');

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
    console.error(err);
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
        d.Aktif
      FROM Doktorlar d
      JOIN Kullaniciler k ON d.KullaniciID = k.KullaniciID
      JOIN Uzmanliklar u ON d.UzmanlikID = u.UzmanlikID
      WHERE d.Aktif = 1
    `);

    res.json(sonuc.recordset);
  } catch (err) {
    console.error(err);
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

    // Hastanın kendi HastaID'sini bul
    const hastaQuery = await pool.request()
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .query('SELECT HastaID FROM Hastalar WHERE KullaniciID = @kullaniciId');

    if (hastaQuery.recordset.length === 0) {
      return res.status(403).json({ hata: 'Hasta profili bulunamadı' });
    }

    const hastaId = hastaQuery.recordset[0].HastaID;

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

    randevuLogger.info(`OLUŞTURULDU | hastaKullaniciId=${req.kullanici.kullaniciId} doktorId=${doktorId} tarih=${tarih} saat=${saat}`);
    res.status(201).json({ mesaj: 'Randevu oluşturuldu' });
  } catch (err) {
    if (err.number === 2627) { // Unique constraint - çakışma
      return res.status(409).json({ hata: 'Bu saat dolu, başka bir saat seçin' });
    }
    console.error(err);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// PATCH /api/randevular/:id/iptal
// Randevuyu iptal eder
// ============================================================
router.patch('/:id/iptal', async (req, res) => {
  try {
    const pool = await getPool();

    await pool.request()
      .input('randevuId', sql.Int, req.params.id)
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .query(`
        UPDATE r SET r.Durum = 'İptal'
        FROM Randevular r
        JOIN Hastalar h ON r.HastaID = h.HastaID
        WHERE r.RandevuID = @randevuId AND h.KullaniciID = @kullaniciId
      `);

    randevuLogger.info(`İPTAL | hastaKullaniciId=${req.kullanici.kullaniciId} randevuId=${req.params.id} | iptal eden: hasta`);
    res.json({ mesaj: 'Randevu iptal edildi' });
  } catch (err) {
    console.error(err);
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
               h.AcilKisiAd, h.AcilKisiTelefon, h.Adres
        FROM Kullaniciler k
        JOIN Hastalar h ON h.KullaniciID = k.KullaniciID
        WHERE k.KullaniciID = @kullaniciId
      `);
    if (sonuc.recordset.length === 0) {
      return res.status(404).json({ hata: 'Profil bulunamadı' });
    }
    res.json(sonuc.recordset[0]);
  } catch (err) {
    console.error(err);
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
    console.error(err);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

module.exports = router;
