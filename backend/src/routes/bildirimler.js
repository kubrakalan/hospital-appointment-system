const express = require('express');
const { getPool, sql } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/bildirimler — kullanıcının bildirimleri
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .query(`
        SELECT TOP 20 BildirimID, Mesaj, Okundu,
               CONVERT(varchar(16), OlusturmaTarihi, 120) AS tarih
        FROM Bildirimler
        WHERE KullaniciID = @kullaniciId
        ORDER BY OlusturmaTarihi DESC
      `);
    res.json(r.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// PATCH /api/bildirimler/okundu — tüm bildirimleri okundu işaretle
router.patch('/okundu', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .query('UPDATE Bildirimler SET Okundu = 1 WHERE KullaniciID = @kullaniciId AND Okundu = 0');
    res.json({ mesaj: 'Tümü okundu' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

module.exports = router;
