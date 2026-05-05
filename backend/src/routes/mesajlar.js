const express = require('express');
const { getPool, sql } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Tüm route'lar için login zorunlu
router.use(authMiddleware);

// ============================================================
// GET /api/mesajlar/:randevuId
// Randevuya ait mesajları getirir
// Sadece randevunun hastası veya doktoru erişebilir
// ============================================================
router.get('/:randevuId', async (req, res) => {
  const randevuId = parseInt(req.params.randevuId);
  if (isNaN(randevuId)) return res.status(400).json({ hata: 'Geçersiz randevu ID' });

  try {
    const pool = await getPool();
    const kullaniciId = req.kullanici.kullaniciId;

    // Erişim kontrolü: kullanıcı bu randevunun hastası veya doktoru mu?
    const erisim = await pool.request()
      .input('randevuId', sql.Int, randevuId)
      .input('kullaniciId', sql.Int, kullaniciId)
      .query(`
        SELECT r.RandevuID
        FROM Randevular r
        JOIN Hastalar h  ON r.HastaID  = h.HastaID
        JOIN Doktorlar d ON r.DoktorID = d.DoktorID
        WHERE r.RandevuID = @randevuId
          AND (h.KullaniciID = @kullaniciId OR d.KullaniciID = @kullaniciId)
      `);

    if (erisim.recordset.length === 0) {
      return res.status(403).json({ hata: 'Bu randevuya erişim izniniz yok' });
    }

    // Mesajları getir, gönderen adı ve rolü ile birlikte
    const sonuc = await pool.request()
      .input('randevuId', sql.Int, randevuId)
      .query(`
        SELECT
          m.MesajID,
          m.GonderenID,
          m.Mesaj,
          m.GonderimTarihi,
          m.OkunduMu,
          k.Ad + ' ' + k.Soyad AS GonderenAd,
          CASE
            WHEN h.KullaniciID IS NOT NULL THEN 'hasta'
            WHEN d.KullaniciID IS NOT NULL THEN 'doktor'
            ELSE 'bilinmiyor'
          END AS GonderenRol
        FROM Mesajlar m
        JOIN Kullaniciler k  ON m.GonderenID = k.KullaniciID
        LEFT JOIN Hastalar h  ON k.KullaniciID = h.KullaniciID
        LEFT JOIN Doktorlar d ON k.KullaniciID = d.KullaniciID
        WHERE m.RandevuID = @randevuId
        ORDER BY m.GonderimTarihi ASC
      `);

    res.json(sonuc.recordset);
  } catch (err) {
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// POST /api/mesajlar/:randevuId
// Mesaj gönderir
// Body: { mesaj: string }
// ============================================================
router.post('/:randevuId', async (req, res) => {
  const randevuId = parseInt(req.params.randevuId);
  if (isNaN(randevuId)) return res.status(400).json({ hata: 'Geçersiz randevu ID' });

  const { mesaj } = req.body;
  if (!mesaj || mesaj.trim().length === 0) {
    return res.status(400).json({ hata: 'Mesaj boş olamaz' });
  }
  if (mesaj.length > 1000) {
    return res.status(400).json({ hata: 'Mesaj 1000 karakterden uzun olamaz' });
  }

  try {
    const pool = await getPool();
    const kullaniciId = req.kullanici.kullaniciId;

    // Erişim kontrolü: kullanıcı bu randevunun hastası veya doktoru mu?
    const erisim = await pool.request()
      .input('randevuId', sql.Int, randevuId)
      .input('kullaniciId', sql.Int, kullaniciId)
      .query(`
        SELECT r.RandevuID
        FROM Randevular r
        JOIN Hastalar h  ON r.HastaID  = h.HastaID
        JOIN Doktorlar d ON r.DoktorID = d.DoktorID
        WHERE r.RandevuID = @randevuId
          AND (h.KullaniciID = @kullaniciId OR d.KullaniciID = @kullaniciId)
      `);

    if (erisim.recordset.length === 0) {
      return res.status(403).json({ hata: 'Bu randevuya erişim izniniz yok' });
    }

    // Mesajı kaydet
    const sonuc = await pool.request()
      .input('randevuId',  sql.Int,      randevuId)
      .input('gonderenId', sql.Int,      kullaniciId)
      .input('mesaj',      sql.NVarChar, mesaj.trim())
      .query(`
        INSERT INTO Mesajlar (RandevuID, GonderenID, Mesaj)
        OUTPUT INSERTED.MesajID, INSERTED.GonderimTarihi
        VALUES (@randevuId, @gonderenId, @mesaj)
      `);

    res.status(201).json({
      mesaj: 'Mesaj gönderildi',
      mesajId: sonuc.recordset[0].MesajID,
      gonderimTarihi: sonuc.recordset[0].GonderimTarihi,
    });
  } catch (err) {
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// PATCH /api/mesajlar/:randevuId/okundu
// Randevudaki mesajları okundu olarak işaretler
// (Karşı tarafın gönderdiği mesajları okundu yapar)
// ============================================================
router.patch('/:randevuId/okundu', async (req, res) => {
  const randevuId = parseInt(req.params.randevuId);
  if (isNaN(randevuId)) return res.status(400).json({ hata: 'Geçersiz randevu ID' });

  try {
    const pool = await getPool();
    const kullaniciId = req.kullanici.kullaniciId;

    // Erişim kontrolü: kullanıcı bu randevunun hastası veya doktoru mu?
    const erisim = await pool.request()
      .input('randevuId', sql.Int, randevuId)
      .input('kullaniciId', sql.Int, kullaniciId)
      .query(`
        SELECT r.RandevuID
        FROM Randevular r
        JOIN Hastalar h  ON r.HastaID  = h.HastaID
        JOIN Doktorlar d ON r.DoktorID = d.DoktorID
        WHERE r.RandevuID = @randevuId
          AND (h.KullaniciID = @kullaniciId OR d.KullaniciID = @kullaniciId)
      `);

    if (erisim.recordset.length === 0) {
      return res.status(403).json({ hata: 'Bu randevuya erişim izniniz yok' });
    }

    // Karşı tarafın (kendi göndermediği) okunmamış mesajlarını okundu yap
    const sonuc = await pool.request()
      .input('randevuId',    sql.Int, randevuId)
      .input('kullaniciId',  sql.Int, kullaniciId)
      .query(`
        UPDATE Mesajlar
        SET OkunduMu = 1
        WHERE RandevuID = @randevuId
          AND GonderenID != @kullaniciId
          AND OkunduMu = 0
      `);

    res.json({
      mesaj: 'Mesajlar okundu olarak işaretlendi',
      guncellenenSayisi: sonuc.rowsAffected[0],
    });
  } catch (err) {
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

module.exports = router;
