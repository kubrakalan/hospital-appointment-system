const express = require('express');
const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../db');
const authMiddleware = require('../middleware/auth');
const randevuLogger = require('../randevuLogger');
const logger = require('../logger');
const emailService = require('../emailService');

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
          CONVERT(varchar(10), r.RandevuTarihi, 23)         AS RandevuTarihi,
          LEFT(CONVERT(varchar(8), r.RandevuSaati, 108), 5) AS RandevuSaati,
          r.Durum,
          r.Notlar,
          ISNULL(r.RandevuTipi, 'Hastane') AS RandevuTipi,
          r.VideoOdaID,
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
// GET /api/randevular/uzmanliklar
// Tüm uzmanlık alanları
// ============================================================
router.get('/uzmanliklar', async (req, res) => {
  try {
    const pool = await getPool();
    const sonuc = await pool.request().query(
      `SELECT UzmanlikID, UzmanlikAdi FROM Uzmanliklar ORDER BY UzmanlikAdi`
    );
    res.json(sonuc.recordset);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// ============================================================
// GET /api/randevular/doktorlar?uzmanlik=X&ad=Y
// Doktor listesi — uzmanlik ve ad filtresi destekli
// ============================================================
router.get('/doktorlar', async (req, res) => {
  const { uzmanlik, ad } = req.query;
  try {
    const pool = await getPool();

    const buildRequest = () => {
      const r = pool.request();
      let where = `WHERE (d.Durum = 'Aktif' OR (d.Durum = 'İzinli' AND d.IzinBaslangic IS NOT NULL AND GETDATE() < d.IzinBaslangic))`;
      if (uzmanlik) { r.input('uzmanlik', sql.NVarChar, uzmanlik); where += ` AND u.UzmanlikAdi = @uzmanlik`; }
      if (ad) { r.input('ad', sql.NVarChar, `%${ad}%`); where += ` AND (k.Ad + ' ' + k.Soyad) LIKE @ad`; }
      return { r, where };
    };

    let sonuc;
    try {
      // Degerlendirmeler tablosu varsa puan bilgisiyle getir
      const { r, where } = buildRequest();
      sonuc = await r.query(`
        SELECT d.DoktorID, k.Ad + ' ' + k.Soyad AS Ad, u.UzmanlikAdi, d.Durum,
               d.Biyografi, d.FotoUrl,
               ISNULL(AVG(CAST(dg.Puan AS FLOAT)), 0) AS OrtPuan,
               COUNT(dg.DegerlendirmeID) AS DegerlendirmeSayisi
        FROM Doktorlar d
        JOIN Kullaniciler k ON d.KullaniciID = k.KullaniciID
        JOIN Uzmanliklar u ON d.UzmanlikID = u.UzmanlikID
        LEFT JOIN Degerlendirmeler dg ON d.DoktorID = dg.DoktorID
        ${where}
        GROUP BY d.DoktorID, k.Ad, k.Soyad, u.UzmanlikAdi, d.Durum, d.Biyografi, d.FotoUrl
      `);
    } catch {
      // Degerlendirmeler tablosu henüz oluşturulmamışsa puansız sürüm
      const { r, where } = buildRequest();
      sonuc = await r.query(`
        SELECT d.DoktorID, k.Ad + ' ' + k.Soyad AS Ad, u.UzmanlikAdi, d.Durum,
               NULL AS Biyografi, NULL AS FotoUrl, 0 AS OrtPuan, 0 AS DegerlendirmeSayisi
        FROM Doktorlar d
        JOIN Kullaniciler k ON d.KullaniciID = k.KullaniciID
        JOIN Uzmanliklar u ON d.UzmanlikID = u.UzmanlikID
        ${where}
      `);
    }

    res.json(sonuc.recordset);
  } catch (err) {
    logger.error(`Randevular hatası | endpoint="${req.method} ${req.path}" kullaniciId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// GET /api/randevular/doktor/:id
// Doktor profili + değerlendirmeleri
// ============================================================
router.get('/doktor/:id', async (req, res) => {
  if (isNaN(parseInt(req.params.id))) return res.status(400).json({ hata: 'Geçersiz doktor ID' });
  try {
    const pool = await getPool();
    const profil = await pool.request()
      .input('doktorId', sql.Int, req.params.id)
      .query(`
        SELECT d.DoktorID, k.Ad + ' ' + k.Soyad AS Ad, u.UzmanlikAdi,
               d.Telefon, d.Biyografi, d.FotoUrl, d.Durum,
               ISNULL(AVG(CAST(dg.Puan AS FLOAT)), 0) AS OrtPuan,
               COUNT(dg.DegerlendirmeID) AS DegerlendirmeSayisi
        FROM Doktorlar d
        JOIN Kullaniciler k ON d.KullaniciID = k.KullaniciID
        JOIN Uzmanliklar u ON d.UzmanlikID = u.UzmanlikID
        LEFT JOIN Degerlendirmeler dg ON d.DoktorID = dg.DoktorID
        WHERE d.DoktorID = @doktorId
        GROUP BY d.DoktorID, k.Ad, k.Soyad, u.UzmanlikAdi, d.Telefon, d.Biyografi, d.FotoUrl, d.Durum
      `);
    if (!profil.recordset[0]) return res.status(404).json({ hata: 'Doktor bulunamadı' });

    const degerlendirmeler = await pool.request()
      .input('doktorId', sql.Int, req.params.id)
      .query(`
        SELECT TOP 10 dg.Puan, dg.Yorum, dg.OlusturmaTarihi,
               k.Ad + ' ' + LEFT(k.Soyad, 1) + '.' AS HastaAdi
        FROM Degerlendirmeler dg
        JOIN Hastalar h ON dg.HastaID = h.HastaID
        JOIN Kullaniciler k ON h.KullaniciID = k.KullaniciID
        WHERE dg.DoktorID = @doktorId
        ORDER BY dg.OlusturmaTarihi DESC
      `);

    res.json({ ...profil.recordset[0], degerlendirmeler: degerlendirmeler.recordset });
  } catch (err) {
    logger.error(`Doktor profil hatası: ${err.message}`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// GET /api/randevular/doktor/:id/calisma-saatleri — public
// ============================================================
router.get('/doktor/:id/calisma-saatleri', async (req, res) => {
  if (isNaN(parseInt(req.params.id))) return res.status(400).json({ hata: 'Geçersiz doktor ID' });
  try {
    const pool = await getPool();
    const sonuc = await pool.request()
      .input('doktorId', sql.Int, req.params.id)
      .query(`
        SELECT dc.Gun,
          LEFT(CONVERT(varchar(8), dc.BaslangicSaat, 108), 5) AS BaslangicSaat,
          LEFT(CONVERT(varchar(8), dc.BitisSaat,     108), 5) AS BitisSaat
        FROM DoktorCalisma dc
        JOIN Doktorlar d ON dc.DoktorID = d.DoktorID
        WHERE d.DoktorID = @doktorId
      `);
    res.json(sonuc.recordset);
  } catch (err) {
    logger.error(`Doktor çalışma saatleri (public) hatası: ${err.message}`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// GET /api/randevular/dolu-saatler?doktorId=X&tarih=YYYY-MM-DD
// O doktora o günkü dolu saatleri döndürür
// ============================================================
router.get('/dolu-saatler', async (req, res) => {
  const { doktorId, tarih } = req.query;

  if (!doktorId || !tarih) {
    return res.status(400).json({ hata: 'doktorId ve tarih zorunludur' });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) {
    return res.status(400).json({ hata: 'Geçersiz tarih formatı' });
  }

  try {
    const pool = await getPool();

    // O doktora o günkü iptal edilmemiş randevuların saatlerini getir
    const sonuc = await pool.request()
      .input('doktorId', sql.Int, doktorId)
      .input('tarih', sql.NVarChar, tarih)
      .query(`
        SELECT CONVERT(varchar(5), RandevuSaati, 108) AS saat
        FROM Randevular
        WHERE DoktorID = @doktorId
          AND CAST(RandevuTarihi AS DATE) = CAST(@tarih AS DATE)
          AND Durum != 'İptal'
      `);

    // Sadece saat listesi döndür: ["09:00", "11:00"]
    const doluSaatler = sonuc.recordset.map(r => r.saat);
    res.json(doluSaatler);
  } catch (err) {
    logger.error(`Dolu saatler hatası | endpoint="${req.method} ${req.path}" kullaniciId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// POST /api/randevular
// Yeni randevu oluşturur
// ============================================================
router.post('/', async (req, res) => {
  const { doktorId, tarih, saat, notlar, randevuTipi } = req.body;

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

    // Doktor adı ve uzmanlık bilgisini e-posta için al
    const doktorBilgi = await pool.request()
      .input('doktorId', sql.Int, doktorId)
      .query(`
        SELECT k.Ad + ' ' + k.Soyad AS DoktorAdi, u.UzmanlikAdi, k.Email AS DoktorEmail
        FROM Doktorlar d
        JOIN Kullaniciler k ON d.KullaniciID = k.KullaniciID
        JOIN Uzmanliklar u ON d.UzmanlikID = u.UzmanlikID
        WHERE d.DoktorID = @doktorId
      `);

    // Online randevu için UUID oda ID üret
    const tip = randevuTipi === 'Online' ? 'Online' : 'Hastane';
    const odaId = tip === 'Online'
      ? require('crypto').randomBytes(16).toString('hex')
      : null;

    // Randevuyu ekle
    await pool.request()
      .input('hastaId',     sql.Int,      hastaId)
      .input('doktorId',    sql.Int,      doktorId)
      .input('tarih',       sql.NVarChar, tarih)
      .input('saat',        sql.NVarChar, saat)
      .input('notlar',      sql.NVarChar, notlar || null)
      .input('randevuTipi', sql.NVarChar, tip)
      .input('videoOdaID',  sql.NVarChar, odaId)
      .query(`
        INSERT INTO Randevular (HastaID, DoktorID, RandevuTarihi, RandevuSaati, Notlar, RandevuTipi, VideoOdaID)
        VALUES (@hastaId, @doktorId, CAST(@tarih AS DATE), CAST(@saat AS TIME), @notlar, @randevuTipi, @videoOdaID)
      `);

    // Hastanın adını ve emailini al, bildirim e-postası gönder
    const hastaKullanici = await pool.request()
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .query('SELECT Ad, Email FROM Kullaniciler WHERE KullaniciID = @kullaniciId');

    if (hastaKullanici.recordset.length > 0 && doktorBilgi.recordset.length > 0) {
      const { Ad, Email } = hastaKullanici.recordset[0];
      const { DoktorAdi, UzmanlikAdi } = doktorBilgi.recordset[0];
      emailService.randevuOlusturuldu(Ad, Email, DoktorAdi, UzmanlikAdi, tarih, saat.substring(0, 5), tip);
    }

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
// GET /api/randevular/:id/oda
// Video görüşme oda bilgisi — sadece randevu sahibi hasta veya doktora
// Randevudan 5 dk önce / 60 dk sonrasına kadar erişilebilir
// ============================================================
router.get('/:id/oda', async (req, res) => {
  const randevuId = parseInt(req.params.id);
  if (isNaN(randevuId)) return res.status(400).json({ hata: 'Geçersiz randevu ID' });

  try {
    const pool = await getPool();
    const uid = req.kullanici.kullaniciId;
    const rol = (req.kullanici.rol || '').toLowerCase();

    // Randevu bilgisini getir — hasta veya doktor olduğunu doğrula
    const q = await pool.request()
      .input('randevuId', sql.Int, randevuId)
      .input('uid', sql.Int, uid)
      .query(`
        SELECT r.RandevuID, r.RandevuTarihi, r.RandevuSaati, r.Durum,
               r.RandevuTipi, r.VideoOdaID,
               h.KullaniciID AS HastaKullaniciID,
               dk.KullaniciID AS DoktorKullaniciID,
               hk.Ad + ' ' + hk.Soyad AS HastaAdi,
               dk.Ad + ' ' + dk.Soyad AS DoktorAdi,
               uz.UzmanlikAdi
        FROM Randevular r
        JOIN Hastalar h   ON r.HastaID  = h.HastaID
        JOIN Kullaniciler hk ON h.KullaniciID = hk.KullaniciID
        JOIN Doktorlar d  ON r.DoktorID  = d.DoktorID
        JOIN Kullaniciler dk ON d.KullaniciID = dk.KullaniciID
        JOIN Uzmanliklar uz ON d.UzmanlikID = uz.UzmanlikID
        WHERE r.RandevuID = @randevuId
          AND (h.KullaniciID = @uid OR dk.KullaniciID = @uid)
      `);

    if (!q.recordset[0]) {
      return res.status(403).json({ hata: 'Bu randevuya erişim izniniz yok' });
    }

    const rv = q.recordset[0];

    if (rv.RandevuTipi !== 'Online') {
      return res.status(400).json({ hata: 'Bu randevu online görüşme değil' });
    }

    if (rv.Durum === 'İptal') {
      return res.status(400).json({ hata: 'İptal edilmiş randevu' });
    }

    // Zaman kısıtı: 5 dk önce → 60 dk sonra
    const tarihStr = rv.RandevuTarihi.toISOString
      ? rv.RandevuTarihi.toISOString().split('T')[0]
      : String(rv.RandevuTarihi).split('T')[0];
    const saatStr = String(rv.RandevuSaati).substring(0, 5); // HH:MM
    const randevuBaslangic = new Date(`${tarihStr}T${saatStr}:00`);
    const simdi = new Date();
    const farkDk = (simdi - randevuBaslangic) / 60000; // negatif = henüz olmadı

    if (farkDk < -30) {
      const kalanDk = Math.ceil(-farkDk - 30);
      return res.status(403).json({
        hata: `Görüşme henüz başlamadı. ${kalanDk} dakika sonra tekrar deneyin.`,
        kalanDakika: kalanDk,
      });
    }

    if (farkDk > 60) {
      return res.status(403).json({ hata: 'Görüşme süresi doldu (60 dakika)' });
    }

    const isHasta = rv.HastaKullaniciID === uid;
    const displayAd = isHasta ? rv.HastaAdi : `Dr. ${rv.DoktorAdi}`;

    res.json({
      odaId: rv.VideoOdaID,
      jitsiUrl: `https://meet.jit.si/medirandevu-${rv.VideoOdaID}`,
      displayAd,
      isHasta,
      randevuBilgi: {
        tarih: tarihStr,
        saat: saatStr,
        doktorAdi: rv.DoktorAdi,
        hastaAdi: rv.HastaAdi,
        uzmanlik: rv.UzmanlikAdi,
      },
    });
  } catch (err) {
    logger.error(`Randevular hatası | endpoint="${req.method} ${req.path}" kullaniciId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// PATCH /api/randevular/:id/yeniden-planla
// Beklemede/Onaylandı randevuyu yeni tarih+saate taşır
// ============================================================
router.patch('/:id/yeniden-planla', async (req, res) => {
  if (isNaN(parseInt(req.params.id))) return res.status(400).json({ hata: 'Geçersiz randevu ID' });
  const { tarih, saat } = req.body;
  if (!tarih || !saat) return res.status(400).json({ hata: 'Yeni tarih ve saat zorunludur' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) return res.status(400).json({ hata: 'Geçersiz tarih formatı' });

  const yeniTarih = new Date(tarih);
  const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
  if (yeniTarih < bugun) return res.status(400).json({ hata: 'Geçmiş tarihe taşınamaz' });

  try {
    const pool = await getPool();
    const sonuc = await pool.request()
      .input('randevuId', sql.Int, req.params.id)
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .input('tarih', sql.NVarChar, tarih)
      .input('saat', sql.NVarChar, saat)
      .query(`
        UPDATE r SET r.RandevuTarihi = CAST(@tarih AS DATE),
                     r.RandevuSaati  = CAST(@saat AS TIME),
                     r.Durum         = 'Beklemede'
        FROM Randevular r
        JOIN Hastalar h ON r.HastaID = h.HastaID
        WHERE r.RandevuID = @randevuId
          AND h.KullaniciID = @kullaniciId
          AND r.Durum IN ('Beklemede', 'Onaylandı')
      `);
    if (sonuc.rowsAffected[0] === 0)
      return res.status(404).json({ hata: 'Randevu bulunamadı, yetkiniz yok veya taşınamaz durumda' });
    randevuLogger.info(`YENİDEN PLANLA | hastaId=${req.kullanici.kullaniciId} randevuId=${req.params.id} yeniTarih=${tarih} yeniSaat=${saat}`);
    res.json({ mesaj: 'Randevu yeniden planlandı' });
  } catch (err) {
    if (err.number === 2627) return res.status(409).json({ hata: 'Bu saat dolu, başka bir saat seçin' });
    logger.error(`Yeniden planlama hatası: ${err.message}`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// POST /api/randevular/:id/degerlendirme
// Tamamlanan randevuya puan + yorum ekle
// ============================================================
router.post('/:id/degerlendirme', async (req, res) => {
  if (isNaN(parseInt(req.params.id))) return res.status(400).json({ hata: 'Geçersiz randevu ID' });
  const { puan, yorum } = req.body;
  if (!puan || puan < 1 || puan > 5) return res.status(400).json({ hata: 'Puan 1-5 arasında olmalıdır' });
  if (yorum && yorum.length > 500) return res.status(400).json({ hata: 'Yorum 500 karakterden uzun olamaz' });

  try {
    const pool = await getPool();
    const randevu = await pool.request()
      .input('randevuId', sql.Int, req.params.id)
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .query(`
        SELECT r.RandevuID, r.DoktorID, h.HastaID
        FROM Randevular r
        JOIN Hastalar h ON r.HastaID = h.HastaID
        WHERE r.RandevuID = @randevuId
          AND h.KullaniciID = @kullaniciId
          AND r.Durum = 'Tamamlandı'
      `);
    if (!randevu.recordset[0]) return res.status(404).json({ hata: 'Tamamlanmış randevu bulunamadı' });

    const { DoktorID, HastaID } = randevu.recordset[0];
    await pool.request()
      .input('randevuId', sql.Int, req.params.id)
      .input('hastaId', sql.Int, HastaID)
      .input('doktorId', sql.Int, DoktorID)
      .input('puan', sql.TinyInt, puan)
      .input('yorum', sql.NVarChar, yorum || null)
      .query(`
        INSERT INTO Degerlendirmeler (RandevuID, HastaID, DoktorID, Puan, Yorum)
        VALUES (@randevuId, @hastaId, @doktorId, @puan, @yorum)
      `);
    res.status(201).json({ mesaj: 'Değerlendirme kaydedildi' });
  } catch (err) {
    if (err.number === 2627) return res.status(409).json({ hata: 'Bu randevu için daha önce değerlendirme yapıldı' });
    logger.error(`Değerlendirme hatası: ${err.message}`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// GET /api/randevular/:id/degerlendirme
// Randevunun değerlendirmesini getir (var mı?)
// ============================================================
router.get('/:id/degerlendirme', async (req, res) => {
  if (isNaN(parseInt(req.params.id))) return res.status(400).json({ hata: 'Geçersiz randevu ID' });
  try {
    const pool = await getPool();
    const sonuc = await pool.request()
      .input('randevuId', sql.Int, req.params.id)
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .query(`
        SELECT dg.DegerlendirmeID, dg.Puan, dg.Yorum, dg.OlusturmaTarihi
        FROM Degerlendirmeler dg
        JOIN Hastalar h ON dg.HastaID = h.HastaID
        WHERE dg.RandevuID = @randevuId AND h.KullaniciID = @kullaniciId
      `);
    res.json(sonuc.recordset[0] || null);
  } catch (err) {
    logger.error(`Değerlendirme getirme hatası: ${err.message}`);
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

// ============================================================
// GET /api/randevular/odemelerim
// Hastanın kendi randevularına ait ödeme kayıtları
// ============================================================
router.get('/odemelerim', async (req, res) => {
  try {
    const pool = await getPool();
    const sonuc = await pool.request()
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .query(`
        SELECT
          o.OdemeID, o.Tutar, o.Durum, o.OdemeYontemi, o.Notlar,
          o.OdemeTarihi, o.OlusturmaTarihi,
          r.RandevuID, r.RandevuTarihi, r.RandevuSaati,
          k.Ad + ' ' + k.Soyad AS DoktorAdi,
          u.UzmanlikAdi
        FROM Odemeler o
        JOIN Randevular r ON o.RandevuID = r.RandevuID
        JOIN Hastalar h ON r.HastaID = h.HastaID
        JOIN Doktorlar d ON r.DoktorID = d.DoktorID
        JOIN Kullaniciler k ON d.KullaniciID = k.KullaniciID
        JOIN Uzmanliklar u ON d.UzmanlikID = u.UzmanlikID
        WHERE h.KullaniciID = @kullaniciId
        ORDER BY o.OlusturmaTarihi DESC
      `);
    res.json(sonuc.recordset);
  } catch (err) {
    logger.error(`Hasta ödeme listesi hatası: ${err.message}`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// PATCH /api/randevular/sifre-degistir
// Giriş yapan kullanıcı kendi şifresini değiştirir
// ============================================================
router.patch('/sifre-degistir', async (req, res) => {
  const { eskiSifre, yeniSifre } = req.body;

  if (!eskiSifre || !yeniSifre) {
    return res.status(400).json({ hata: 'Eski ve yeni şifre zorunludur' });
  }
  if (yeniSifre.length < 6) {
    return res.status(400).json({ hata: 'Yeni şifre en az 6 karakter olmalıdır' });
  }
  if (eskiSifre === yeniSifre) {
    return res.status(400).json({ hata: 'Yeni şifre eskisiyle aynı olamaz' });
  }

  try {
    const pool = await getPool();

    const sonuc = await pool.request()
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .query('SELECT SifreHash FROM Kullaniciler WHERE KullaniciID = @kullaniciId');

    if (sonuc.recordset.length === 0) {
      return res.status(404).json({ hata: 'Kullanıcı bulunamadı' });
    }

    const eslesti = await bcrypt.compare(eskiSifre, sonuc.recordset[0].SifreHash);
    if (!eslesti) {
      return res.status(400).json({ hata: 'Mevcut şifre yanlış' });
    }

    const yeniHash = await bcrypt.hash(yeniSifre, 10);
    await pool.request()
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .input('sifreHash', sql.NVarChar, yeniHash)
      .query('UPDATE Kullaniciler SET SifreHash = @sifreHash WHERE KullaniciID = @kullaniciId');

    logger.info(`ŞİFRE DEĞİŞTİRİLDİ | kullaniciId=${req.kullanici.kullaniciId} ip=${req.ip}`);
    res.json({ mesaj: 'Şifreniz başarıyla güncellendi' });
  } catch (err) {
    logger.error(`Şifre değiştirme hatası | kullaniciId=${req.kullanici?.kullaniciId} ip=${req.ip} hata="${err.message}"`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

module.exports = router;
