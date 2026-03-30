const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const { getPool, sql } = require('../db');
const logger = require('../logger');

// Şifre sıfırlama token'larını bellekte tut (token → { email, expiry })
const sifirlamaTokenlari = new Map();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

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

    // Access token — kısa süreli (15 dakika)
    const token = jwt.sign(
      {
        kullaniciId: kullanici.KullaniciID,
        email: kullanici.Email,
        rol: kullanici.Rol,
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Refresh token — uzun süreli (7 gün)
    const refreshToken = jwt.sign(
      { kullaniciId: kullanici.KullaniciID },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
      { expiresIn: '7d' }
    );

    logger.info(`Başarılı giriş: ${kullanici.Email} (rol: ${kullanici.Rol})`);

    // Şifre hash'ini cevaba dahil etme!
    res.json({
      token,
      refreshToken,
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

// ============================================================
// POST /api/auth/sifremi-unuttum
// Email gönderir, sıfırlama linki içerir
// ============================================================
router.post('/sifremi-unuttum', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ hata: 'Email zorunludur' });

  try {
    const pool = await getPool();
    const sonuc = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT KullaniciID, Ad FROM Kullaniciler WHERE Email = @email');

    // Güvenlik: kullanıcı yoksa da aynı mesajı döndür
    if (sonuc.recordset.length > 0) {
      const { KullaniciID, Ad } = sonuc.recordset[0];
      const token = jwt.sign({ kullaniciId: KullaniciID }, process.env.JWT_SECRET, { expiresIn: '1h' });
      sifirlamaTokenlari.set(token, { email, expiry: Date.now() + 3600000 });

      const link = `${process.env.FRONTEND_URL}/sifre-sifirla?token=${token}`;
      await transporter.sendMail({
        from: `"MediRandevu" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Şifre Sıfırlama',
        html: `
          <p>Merhaba ${Ad},</p>
          <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
          <a href="${link}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Şifremi Sıfırla</a>
          <p>Bu link 1 saat geçerlidir. Eğer bu isteği siz yapmadıysanız dikkate almayın.</p>
        `,
      });
      logger.info(`Şifre sıfırlama emaili gönderildi: ${email}`);
    }

    res.json({ mesaj: 'Eğer bu email kayıtlıysa sıfırlama linki gönderildi.' });
  } catch (err) {
    logger.error(`Şifre sıfırlama hatası: ${err.message}`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ============================================================
// POST /api/auth/sifre-sifirla
// Token + yeni şifre ile şifreyi günceller
// ============================================================
router.post('/sifre-sifirla', async (req, res) => {
  const { token, yeniSifre } = req.body;
  if (!token || !yeniSifre) return res.status(400).json({ hata: 'Token ve yeni şifre zorunludur' });
  if (yeniSifre.length < 6) return res.status(400).json({ hata: 'Şifre en az 6 karakter olmalıdır' });

  const kayit = sifirlamaTokenlari.get(token);
  if (!kayit || Date.now() > kayit.expiry) {
    return res.status(400).json({ hata: 'Geçersiz veya süresi dolmuş link' });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    const sifreHash = await bcrypt.hash(yeniSifre, 10);
    const pool = await getPool();
    await pool.request()
      .input('email', sql.NVarChar, kayit.email)
      .input('sifreHash', sql.NVarChar, sifreHash)
      .query('UPDATE Kullaniciler SET SifreHash = @sifreHash WHERE Email = @email');

    sifirlamaTokenlari.delete(token);
    logger.info(`Şifre sıfırlandı: ${kayit.email}`);
    res.json({ mesaj: 'Şifreniz başarıyla güncellendi.' });
  } catch {
    res.status(400).json({ hata: 'Geçersiz token' });
  }
});

// ============================================================
// POST /api/auth/refresh
// Refresh token ile yeni access token alır
// ============================================================
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ hata: 'Refresh token gerekli' });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh'
    );

    const yeniToken = jwt.sign(
      { kullaniciId: decoded.kullaniciId, email: decoded.email, rol: decoded.rol },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    logger.info(`Token yenilendi: kullaniciId=${decoded.kullaniciId}`);
    res.json({ token: yeniToken });
  } catch {
    logger.warn('Geçersiz refresh token denemesi');
    res.status(401).json({ hata: 'Geçersiz veya süresi dolmuş refresh token' });
  }
});

module.exports = router;
