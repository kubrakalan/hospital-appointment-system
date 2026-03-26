const express = require('express');
const { getPool, sql } = require('../db');
const authMiddleware = require('../middleware/auth');

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
        u.UzmanlikAdi
      FROM Doktorlar d
      JOIN Kullaniciler k ON d.KullaniciID = k.KullaniciID
      JOIN Uzmanliklar u ON d.UzmanlikID = u.UzmanlikID
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

    res.json({ mesaj: 'Randevu iptal edildi' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

module.exports = router;
