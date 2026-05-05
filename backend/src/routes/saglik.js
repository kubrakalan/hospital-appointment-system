const express = require('express');
const { getPool, sql } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Tüm route'lar için login zorunlu
router.use(authMiddleware);

const GECERLI_TIPLER = ['Tansiyon', 'Nabız', 'Kan Şekeri', 'Ağırlık', 'Ateş'];

// ============================================================
// GET /api/saglik
// Hastanın son 90 günlük sağlık takip kayıtlarını getirir
// ============================================================
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const kullaniciId = req.kullanici.kullaniciId;

    // Kullanıcının HastaID'sini bul
    const hastaQuery = await pool.request()
      .input('kullaniciId', sql.Int, kullaniciId)
      .query('SELECT HastaID FROM Hastalar WHERE KullaniciID = @kullaniciId');

    if (hastaQuery.recordset.length === 0) {
      return res.status(403).json({ hata: 'Hasta profili bulunamadı' });
    }

    const hastaId = hastaQuery.recordset[0].HastaID;

    // Son 90 günün kayıtlarını getir
    const sonuc = await pool.request()
      .input('hastaId', sql.Int, hastaId)
      .query(`
        SELECT
          TakipID,
          Tip,
          Deger,
          Tarih,
          [Not]
        FROM SaglikTakibi
        WHERE HastaID = @hastaId
          AND Tarih >= DATEADD(DAY, -90, GETDATE())
        ORDER BY Tarih DESC
      `);

    res.json(sonuc.recordset);
  } catch (err) {
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// POST /api/saglik
// Yeni sağlık takip kaydı ekler
// Body: { tip, deger, tarih?, not? }
// ============================================================
router.post('/', async (req, res) => {
  const { tip, deger, tarih, not } = req.body;

  if (!tip || !deger) {
    return res.status(400).json({ hata: 'Tip ve değer zorunludur' });
  }

  if (!GECERLI_TIPLER.includes(tip)) {
    return res.status(400).json({
      hata: `Geçersiz tip. Geçerli tipler: ${GECERLI_TIPLER.join(', ')}`,
    });
  }

  if (String(deger).length > 100) {
    return res.status(400).json({ hata: 'Değer 100 karakterden uzun olamaz' });
  }

  if (not && not.length > 300) {
    return res.status(400).json({ hata: 'Not 300 karakterden uzun olamaz' });
  }

  // Tarih verilmişse format kontrolü
  if (tarih && !/^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/.test(tarih)) {
    return res.status(400).json({ hata: 'Geçersiz tarih formatı' });
  }

  try {
    const pool = await getPool();
    const kullaniciId = req.kullanici.kullaniciId;

    // Kullanıcının HastaID'sini bul
    const hastaQuery = await pool.request()
      .input('kullaniciId', sql.Int, kullaniciId)
      .query('SELECT HastaID FROM Hastalar WHERE KullaniciID = @kullaniciId');

    if (hastaQuery.recordset.length === 0) {
      return res.status(403).json({ hata: 'Hasta profili bulunamadı' });
    }

    const hastaId = hastaQuery.recordset[0].HastaID;

    const sonuc = await pool.request()
      .input('hastaId', sql.Int,      hastaId)
      .input('tip',     sql.NVarChar, tip)
      .input('deger',   sql.NVarChar, String(deger))
      .input('tarih',   sql.DateTime, tarih ? new Date(tarih) : new Date())
      .input('not',     sql.NVarChar, not?.trim() || null)
      .query(`
        INSERT INTO SaglikTakibi (HastaID, Tip, Deger, Tarih, [Not])
        OUTPUT INSERTED.TakipID, INSERTED.Tarih
        VALUES (@hastaId, @tip, @deger, @tarih, @not)
      `);

    res.status(201).json({
      mesaj: 'Sağlık kaydı eklendi',
      takipId: sonuc.recordset[0].TakipID,
      tarih: sonuc.recordset[0].Tarih,
    });
  } catch (err) {
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// DELETE /api/saglik/:id
// Sağlık takip kaydını siler (sadece kendi kaydını silebilir)
// ============================================================
router.delete('/:id', async (req, res) => {
  const takipId = parseInt(req.params.id);
  if (isNaN(takipId)) return res.status(400).json({ hata: 'Geçersiz kayıt ID' });

  try {
    const pool = await getPool();
    const kullaniciId = req.kullanici.kullaniciId;

    // Kullanıcının HastaID'sini bul
    const hastaQuery = await pool.request()
      .input('kullaniciId', sql.Int, kullaniciId)
      .query('SELECT HastaID FROM Hastalar WHERE KullaniciID = @kullaniciId');

    if (hastaQuery.recordset.length === 0) {
      return res.status(403).json({ hata: 'Hasta profili bulunamadı' });
    }

    const hastaId = hastaQuery.recordset[0].HastaID;

    // Sadece kendi kaydını silebilir
    const sonuc = await pool.request()
      .input('takipId', sql.Int, takipId)
      .input('hastaId', sql.Int, hastaId)
      .query(`
        DELETE FROM SaglikTakibi
        WHERE TakipID = @takipId AND HastaID = @hastaId
      `);

    if (sonuc.rowsAffected[0] === 0) {
      return res.status(404).json({ hata: 'Kayıt bulunamadı veya yetkiniz yok' });
    }

    res.json({ mesaj: 'Sağlık kaydı silindi' });
  } catch (err) {
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

module.exports = router;
