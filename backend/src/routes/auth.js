const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { getPool, sql } = require('../db');
const logger = require('../logger');

const router = express.Router();

// 15 dakikada en fazla 10 login denemesi
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { hata: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 1 saatte en fazla 5 kayıt
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { hata: 'Çok fazla kayıt denemesi. 1 saat sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================
// POST /api/auth/login
// Kullanıcı email + şifre gönderir, token alır
// ============================================================
router.post('/login', loginLimiter, async (req, res) => {
  const { email, sifre } = req.body;

  if (!email || !sifre) {
    return res.status(400).json({ hata: 'Email ve şifre zorunludur' });
  }

  try {
    const pool = await getPool();

    // Veritabanında bu email'i ara
    const sonuc = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM Kullaniciler WHERE Email = @email');

    const kullanici = sonuc.recordset[0];

    if (!kullanici) {
      logger.warn(`Başarısız giriş denemesi (kullanıcı bulunamadı): ${email}`);
      return res.status(401).json({ hata: 'Email veya şifre hatalı' });
    }

    // Girilen şifre ile veritabanındaki hash'i karşılaştır
    const sifreEslesti = await bcrypt.compare(sifre, kullanici.SifreHash);

    if (!sifreEslesti) {
      logger.warn(`Başarısız giriş denemesi (yanlış şifre): ${email}`);
      return res.status(401).json({ hata: 'Email veya şifre hatalı' });
    }

    // Token oluştur — içine kullanıcı bilgilerini göm
    const token = jwt.sign(
      {
        kullaniciId: kullanici.KullaniciID,
        email: kullanici.Email,
        rol: kullanici.Rol,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }  // 8 saat geçerli
    );

    logger.info(`Başarılı giriş: ${kullanici.Email} (rol: ${kullanici.Rol})`);

    // Şifre hash'ini cevaba dahil etme!
    res.json({
      token,
      kullanici: {
        id: kullanici.KullaniciID,
        email: kullanici.Email,
        ad: kullanici.Ad,
        soyad: kullanici.Soyad,
        rol: kullanici.Rol,
      },
    });

  } catch (err) {
    logger.error(`Login hatası: ${err.message}`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// POST /api/auth/register
// Yeni hasta kaydı oluşturur
// ============================================================
router.post('/register', registerLimiter, async (req, res) => {
  const { email, sifre, ad, soyad } = req.body;

  if (!email || !sifre || !ad || !soyad) {
    return res.status(400).json({ hata: 'Tüm alanlar zorunludur' });
  }

  try {
    const pool = await getPool();

    // Email daha önce kayıtlı mı?
    const mevcutKullanici = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT KullaniciID FROM Kullaniciler WHERE Email = @email');

    if (mevcutKullanici.recordset.length > 0) {
      logger.warn(`Kayıt denemesi — email zaten mevcut: ${email}`);
      return res.status(409).json({ hata: 'Bu email zaten kayıtlı' });
    }

    // Şifreyi hashle — asla düz metin saklanmaz
    const sifreHash = await bcrypt.hash(sifre, 10);

    // Kullaniciler tablosuna ekle
    const yeniKullanici = await pool.request()
      .input('email', sql.NVarChar, email)
      .input('sifreHash', sql.NVarChar, sifreHash)
      .input('ad', sql.NVarChar, ad)
      .input('soyad', sql.NVarChar, soyad)
      .query(`
        INSERT INTO Kullaniciler (Email, SifreHash, Rol, Ad, Soyad)
        OUTPUT INSERTED.KullaniciID
        VALUES (@email, @sifreHash, 'Hasta', @ad, @soyad)
      `);

    const yeniId = yeniKullanici.recordset[0].KullaniciID;

    // Hastalar tablosuna da ekle (hasta profili)
    await pool.request()
      .input('kullaniciId', sql.Int, yeniId)
      .query('INSERT INTO Hastalar (KullaniciID) VALUES (@kullaniciId)');

    logger.info(`Yeni kullanıcı kaydedildi: ${email}`);
    res.status(201).json({ mesaj: 'Kayıt başarılı' });

  } catch (err) {
    logger.error(`Register hatası: ${err.message}`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

module.exports = router;
