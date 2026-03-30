const express = require('express');
const { getPool, sql } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/doktor/randevular — doktorun kendi randevuları
router.get('/randevular', async (req, res) => {
  try {
    const pool = await getPool();
    const sonuc = await pool.request()
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .query(`
        SELECT r.RandevuID, r.RandevuTarihi, r.RandevuSaati, r.Durum, r.Notlar,
               k.Ad + ' ' + k.Soyad AS HastaAdi
        FROM Randevular r
        JOIN Doktorlar d ON r.DoktorID = d.DoktorID
        JOIN Hastalar h ON r.HastaID = h.HastaID
        JOIN Kullaniciler k ON h.KullaniciID = k.KullaniciID
        WHERE d.KullaniciID = @kullaniciId
        ORDER BY r.RandevuTarihi, r.RandevuSaati
      `);
    res.json(sonuc.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// PATCH /api/doktor/randevular/:id/durum — onayla / iptal / tamamla
router.patch('/randevular/:id/durum', async (req, res) => {
  const { durum } = req.body;
  const gecerliDurumlar = ['Onaylandı', 'İptal', 'Tamamlandı'];
  if (!gecerliDurumlar.includes(durum)) {
    return res.status(400).json({ hata: 'Geçersiz durum' });
  }
  try {
    const pool = await getPool();

    // Randevuyu güncelle ve hastanın KullaniciID'sini al
    const sonuc = await pool.request()
      .input('randevuId', sql.Int, req.params.id)
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .input('durum', sql.NVarChar, durum)
      .query(`
        UPDATE r SET r.Durum = @durum
        OUTPUT h.KullaniciID AS hastaKullaniciId,
               kd.Ad + ' ' + kd.Soyad AS doktorAdi,
               CONVERT(varchar(10), r.RandevuTarihi, 23) AS tarih
        FROM Randevular r
        JOIN Doktorlar d ON r.DoktorID = d.DoktorID
        JOIN Hastalar h ON r.HastaID = h.HastaID
        JOIN Kullaniciler kd ON d.KullaniciID = kd.KullaniciID
        WHERE r.RandevuID = @randevuId AND d.KullaniciID = @kullaniciId
      `);

    // Hastaya bildirim gönder
    if (sonuc.recordset.length > 0) {
      const { hastaKullaniciId, doktorAdi, tarih } = sonuc.recordset[0];
      const mesajlar = {
        'Onaylandı': `Dr. ${doktorAdi} ile ${tarih} tarihli randevunuz onaylandı.`,
        'İptal':     `Dr. ${doktorAdi} ile ${tarih} tarihli randevunuz iptal edildi.`,
        'Tamamlandı':`Dr. ${doktorAdi} ile ${tarih} tarihli randevunuz tamamlandı.`,
      };
      await pool.request()
        .input('kullaniciId', sql.Int, hastaKullaniciId)
        .input('mesaj', sql.NVarChar, mesajlar[durum])
        .query('INSERT INTO Bildirimler (KullaniciID, Mesaj) VALUES (@kullaniciId, @mesaj)');
    }

    res.json({ mesaj: 'Güncellendi' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

module.exports = router;
