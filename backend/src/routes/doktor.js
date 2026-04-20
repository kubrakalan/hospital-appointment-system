const express = require('express');
const { getPool, sql } = require('../db');
const authMiddleware = require('../middleware/auth');
const randevuLogger = require('../randevuLogger');
const logger = require('../logger');
const emailService = require('../emailService');

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
    logger.error(`Doktor randevuları getirme hatası | kullaniciId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// PATCH /api/doktor/randevular/:id/durum — onayla / iptal / tamamla
router.patch('/randevular/:id/durum', async (req, res) => {
  if (isNaN(parseInt(req.params.id))) {
    return res.status(400).json({ hata: 'Geçersiz randevu ID' });
  }
  const { durum } = req.body;
  // 'Gelmedi' eklendi — doktor hastanın gelmediğini işaretleyebilir
  const gecerliDurumlar = ['Onaylandı', 'İptal', 'Tamamlandı', 'Gelmedi'];
  if (!gecerliDurumlar.includes(durum)) {
    return res.status(400).json({ hata: 'Geçersiz durum' });
  }
  try {
    const pool = await getPool();

    // Önce randevuyu bul ve doktora ait olduğunu doğrula
    const bilgiSonuc = await pool.request()
      .input('randevuId', sql.Int, req.params.id)
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .query(`
        SELECT h.KullaniciID AS hastaKullaniciId,
               h.HastaID AS hastaId,
               kh.Ad + ' ' + kh.Soyad AS hastaAdi,
               kh.Ad AS hastaAdSadece,
               kh.Email AS hastaEmail,
               kd.Ad + ' ' + kd.Soyad AS doktorAdi,
               CONVERT(varchar(10), r.RandevuTarihi, 23) AS tarih,
               LEFT(CONVERT(varchar(5), r.RandevuSaati, 108), 5) AS saat
        FROM Randevular r
        JOIN Doktorlar d ON r.DoktorID = d.DoktorID
        JOIN Hastalar h ON r.HastaID = h.HastaID
        JOIN Kullaniciler kh ON h.KullaniciID = kh.KullaniciID
        JOIN Kullaniciler kd ON d.KullaniciID = kd.KullaniciID
        WHERE r.RandevuID = @randevuId AND d.KullaniciID = @kullaniciId
      `);

    if (bilgiSonuc.recordset.length === 0) {
      return res.status(404).json({ hata: 'Randevu bulunamadı veya yetkiniz yok' });
    }

    // Durumu güncelle
    await pool.request()
      .input('randevuId', sql.Int, req.params.id)
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .input('durum', sql.NVarChar, durum)
      .query(`
        UPDATE r SET r.Durum = @durum
        FROM Randevular r
        JOIN Doktorlar d ON r.DoktorID = d.DoktorID
        WHERE r.RandevuID = @randevuId AND d.KullaniciID = @kullaniciId
      `);

    const { hastaKullaniciId, hastaId, hastaAdi, hastaAdSadece, hastaEmail, doktorAdi, tarih, saat } = bilgiSonuc.recordset[0];

    // Hastaya e-posta bildirimi gönder
    if (hastaEmail) {
      if (durum === 'Onaylandı')  emailService.randevuOnaylandi(hastaAdSadece, hastaEmail, doktorAdi, tarih, saat);
      if (durum === 'İptal')      emailService.randevuIptalDoktor(hastaAdSadece, hastaEmail, doktorAdi, tarih);
      if (durum === 'Tamamlandı') emailService.randevuTamamlandi(hastaAdSadece, hastaEmail, doktorAdi, tarih);
    }

    // Hastaya sistem bildirimi gönder
    const mesajlar = {
      'Onaylandı':  `Dr. ${doktorAdi} ile ${tarih} tarihli randevunuz onaylandı.`,
      'İptal':      `Dr. ${doktorAdi} ile ${tarih} tarihli randevunuz iptal edildi.`,
      'Tamamlandı': `Dr. ${doktorAdi} ile ${tarih} tarihli randevunuz tamamlandı.`,
      'Gelmedi':    `${tarih} tarihli randevunuza gelmediğiniz tespit edildi. 10 gün süreyle yeni randevu alamazsınız.`,
    };

    await pool.request()
      .input('kullaniciId', sql.Int, hastaKullaniciId)
      .input('mesaj', sql.NVarChar, mesajlar[durum])
      .query('INSERT INTO Bildirimler (KullaniciID, Mesaj) VALUES (@kullaniciId, @mesaj)');

    // 'Gelmedi' seçildiyse → 10 gün ban uygula
    if (durum === 'Gelmedi') {
      const banBitis = new Date();
      banBitis.setDate(banBitis.getDate() + 10);

      await pool.request()
        .input('hastaId', sql.Int, hastaId)
        .input('banBitis', sql.DateTime, banBitis)
        .input('banSebebi', sql.NVarChar, `${tarih} tarihli randevuya gelmedi (Dr. ${doktorAdi})`)
        .query(`
          UPDATE Hastalar
          SET BanBitisTarihi = @banBitis, BanSebebi = @banSebebi
          WHERE HastaID = @hastaId
        `);

      randevuLogger.info(`GELMEDİ | randevuId=${req.params.id} hasta="${hastaAdi}"(${hastaKullaniciId}) tarih=${tarih} banBitis=${banBitis.toISOString().split('T')[0]} doktorId=${req.kullanici.kullaniciId} ip=${req.ip}`);
    } else {
      randevuLogger.info(`DURUM DEĞİŞTİ | randevuId=${req.params.id} yeniDurum=${durum} hasta="${hastaAdi}" tarih=${tarih} doktorId=${req.kullanici.kullaniciId} ip=${req.ip}`);
    }

    res.json({ mesaj: 'Güncellendi' });
  } catch (err) {
    logger.error(`Doktor randevu durum güncelleme hatası | randevuId=${req.params.id} kullaniciId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// GET /api/doktor/calisma-saatleri — doktorun mevcut çalışma saatleri
// ============================================================
router.get('/calisma-saatleri', async (req, res) => {
  try {
    const pool = await getPool();
    const sonuc = await pool.request()
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .query(`
        SELECT dc.CalismaID, dc.Gun, dc.BaslangicSaat, dc.BitisSaat
        FROM DoktorCalisma dc
        JOIN Doktorlar d ON dc.DoktorID = d.DoktorID
        WHERE d.KullaniciID = @kullaniciId
        ORDER BY
          CASE dc.Gun
            WHEN 'Pazartesi' THEN 1 WHEN 'Salı' THEN 2 WHEN 'Çarşamba' THEN 3
            WHEN 'Perşembe' THEN 4 WHEN 'Cuma' THEN 5 WHEN 'Cumartesi' THEN 6
            WHEN 'Pazar' THEN 7 ELSE 8 END
      `);
    res.json(sonuc.recordset);
  } catch (err) {
    logger.error(`Çalışma saatleri getirme hatası | kullaniciId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// PUT /api/doktor/calisma-saatleri — çalışma saatlerini tamamen güncelle
// ============================================================
router.put('/calisma-saatleri', async (req, res) => {
  const { saatler } = req.body; // [{ gun, baslangicSaat, bitisSaat }]

  if (!Array.isArray(saatler)) {
    return res.status(400).json({ hata: 'Geçersiz veri formatı' });
  }

  const gecerliGunler = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  for (const s of saatler) {
    if (!gecerliGunler.includes(s.gun)) {
      return res.status(400).json({ hata: `Geçersiz gün: ${s.gun}` });
    }
    if (!/^\d{2}:\d{2}$/.test(s.baslangicSaat) || !/^\d{2}:\d{2}$/.test(s.bitisSaat)) {
      return res.status(400).json({ hata: 'Geçersiz saat formatı (HH:MM bekleniyor)' });
    }
    if (s.baslangicSaat >= s.bitisSaat) {
      return res.status(400).json({ hata: `${s.gun}: Başlangıç saati bitiş saatinden önce olmalı` });
    }
  }

  try {
    const pool = await getPool();

    // DoktorID'yi al
    const doktorSonuc = await pool.request()
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .query('SELECT DoktorID FROM Doktorlar WHERE KullaniciID = @kullaniciId');

    if (doktorSonuc.recordset.length === 0) {
      return res.status(404).json({ hata: 'Doktor profili bulunamadı' });
    }

    const doktorId = doktorSonuc.recordset[0].DoktorID;

    // Önce mevcut kayıtları sil, sonra yenileri ekle
    await pool.request()
      .input('doktorId', sql.Int, doktorId)
      .query('DELETE FROM DoktorCalisma WHERE DoktorID = @doktorId');

    for (const s of saatler) {
      await pool.request()
        .input('doktorId', sql.Int, doktorId)
        .input('gun', sql.NVarChar, s.gun)
        .input('baslangic', sql.NVarChar, s.baslangicSaat + ':00')
        .input('bitis', sql.NVarChar, s.bitisSaat + ':00')
        .query('INSERT INTO DoktorCalisma (DoktorID, Gun, BaslangicSaat, BitisSaat) VALUES (@doktorId, @gun, @baslangic, @bitis)');
    }

    logger.info(`Çalışma saatleri güncellendi | doktorId=${doktorId} kullaniciId=${req.kullanici.kullaniciId} ip=${req.ip}`);
    res.json({ mesaj: 'Çalışma saatleri güncellendi' });
  } catch (err) {
    logger.error(`Çalışma saatleri güncelleme hatası | kullaniciId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// POST /api/doktor/randevular/:id/tibbi-kayit
// Doktor tıbbi kayıt oluşturur veya günceller (upsert)
// ============================================================
router.post('/randevular/:id/tibbi-kayit', async (req, res) => {
  if (isNaN(parseInt(req.params.id))) {
    return res.status(400).json({ hata: 'Geçersiz randevu ID' });
  }

  const { tani, uygulananIslem, recete, labNotu, doktorNotu, sonrakiKontrol } = req.body;

  try {
    const pool = await getPool();

    // Randevunun bu doktora ait olduğunu doğrula
    const randevuKontrol = await pool.request()
      .input('randevuId', sql.Int, req.params.id)
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .query(`
        SELECT r.RandevuID
        FROM Randevular r
        JOIN Doktorlar d ON r.DoktorID = d.DoktorID
        WHERE r.RandevuID = @randevuId AND d.KullaniciID = @kullaniciId
      `);

    if (randevuKontrol.recordset.length === 0) {
      return res.status(404).json({ hata: 'Randevu bulunamadı veya yetkiniz yok' });
    }

    // Kayıt varsa güncelle, yoksa ekle (MERGE / upsert)
    await pool.request()
      .input('randevuId', sql.Int, req.params.id)
      .input('tani', sql.NVarChar, tani?.trim() || null)
      .input('uygulananIslem', sql.NVarChar, uygulananIslem?.trim() || null)
      .input('recete', sql.NVarChar, recete?.trim() || null)
      .input('labNotu', sql.NVarChar, labNotu?.trim() || null)
      .input('doktorNotu', sql.NVarChar, doktorNotu?.trim() || null)
      .input('sonrakiKontrol', sql.Date, sonrakiKontrol || null)
      .query(`
        MERGE TibbiBilgiler AS hedef
        USING (SELECT @randevuId AS RandevuID) AS kaynak ON hedef.RandevuID = kaynak.RandevuID
        WHEN MATCHED THEN
          UPDATE SET
            Tani           = @tani,
            UygulananIslem = @uygulananIslem,
            Recete         = @recete,
            LabNotu        = @labNotu,
            DoktorNotu     = @doktorNotu,
            SonrakiKontrol = @sonrakiKontrol
        WHEN NOT MATCHED THEN
          INSERT (RandevuID, Tani, UygulananIslem, Recete, LabNotu, DoktorNotu, SonrakiKontrol)
          VALUES (@randevuId, @tani, @uygulananIslem, @recete, @labNotu, @doktorNotu, @sonrakiKontrol);
      `);

    logger.info(`Tıbbi kayıt kaydedildi | randevuId=${req.params.id} doktorKullaniciId=${req.kullanici.kullaniciId}`);
    res.json({ mesaj: 'Tıbbi kayıt kaydedildi' });
  } catch (err) {
    logger.error(`Tıbbi kayıt kaydetme hatası | randevuId=${req.params.id} kullaniciId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// GET /api/doktor/randevular/:id/tibbi-kayit
// Doktor kendi randevusunun tıbbi kaydını okur (DoktorNotu dahil)
// ============================================================
router.get('/randevular/:id/tibbi-kayit', async (req, res) => {
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
               tb.LabNotu, tb.DoktorNotu, tb.SonrakiKontrol, tb.OlusturmaTarihi
        FROM TibbiBilgiler tb
        JOIN Randevular r ON tb.RandevuID = r.RandevuID
        JOIN Doktorlar d ON r.DoktorID = d.DoktorID
        WHERE tb.RandevuID = @randevuId AND d.KullaniciID = @kullaniciId
      `);

    res.json(sonuc.recordset[0] || null);
  } catch (err) {
    logger.error(`Tıbbi kayıt getirme hatası | randevuId=${req.params.id} kullaniciId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// GET /api/doktor/istatistikler — doktorun kendi performans özeti
// ============================================================
router.get('/istatistikler', async (req, res) => {
  try {
    const pool = await getPool();
    const sonuc = await pool.request()
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .query(`
        SELECT
          COUNT(*) AS toplamRandevu,
          SUM(CASE WHEN r.Durum = 'Tamamlandı' THEN 1 ELSE 0 END) AS tamamlanan,
          SUM(CASE WHEN r.Durum = 'İptal'      THEN 1 ELSE 0 END) AS iptalEdilen,
          SUM(CASE WHEN r.Durum = 'Gelmedi'    THEN 1 ELSE 0 END) AS gelmedi,
          SUM(CASE WHEN r.Durum = 'Beklemede'  THEN 1 ELSE 0 END) AS bekleyen,
          SUM(CASE WHEN r.Durum = 'Onaylandı'  THEN 1 ELSE 0 END) AS onaylandi,
          SUM(CASE WHEN r.RandevuTarihi = CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) AS bugun,
          SUM(CASE WHEN r.RandevuTarihi >= DATEADD(day, -30, GETDATE()) THEN 1 ELSE 0 END) AS son30Gun,
          COUNT(DISTINCT r.HastaID) AS benzersizHasta
        FROM Randevular r
        JOIN Doktorlar d ON r.DoktorID = d.DoktorID
        WHERE d.KullaniciID = @kullaniciId
      `);

    // Aylık dağılım (son 6 ay)
    const aylik = await pool.request()
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .query(`
        SELECT
          FORMAT(RandevuTarihi, 'yyyy-MM') AS ay,
          COUNT(*) AS sayi,
          SUM(CASE WHEN r.Durum = 'Tamamlandı' THEN 1 ELSE 0 END) AS tamamlanan
        FROM Randevular r
        JOIN Doktorlar d ON r.DoktorID = d.DoktorID
        WHERE d.KullaniciID = @kullaniciId
          AND r.RandevuTarihi >= DATEADD(month, -6, GETDATE())
        GROUP BY FORMAT(r.RandevuTarihi, 'yyyy-MM')
        ORDER BY ay
      `);

    // En sık gelen hastalar (top 5)
    const topHastalar = await pool.request()
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .query(`
        SELECT TOP 5
          k.Ad + ' ' + k.Soyad AS hastaAdi,
          COUNT(*) AS randevuSayisi
        FROM Randevular r
        JOIN Doktorlar d ON r.DoktorID = d.DoktorID
        JOIN Hastalar h ON r.HastaID = h.HastaID
        JOIN Kullaniciler k ON h.KullaniciID = k.KullaniciID
        WHERE d.KullaniciID = @kullaniciId AND r.Durum = N'Tamamlandı'
        GROUP BY k.Ad, k.Soyad
        ORDER BY randevuSayisi DESC
      `);

    res.json({
      ozet: sonuc.recordset[0],
      aylik: aylik.recordset,
      topHastalar: topHastalar.recordset,
    });
  } catch (err) {
    logger.error(`Doktor istatistik hatası | kullaniciId=${req.kullanici?.kullaniciId} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

module.exports = router;
