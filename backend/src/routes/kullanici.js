const express = require('express');
const { getPool, sql } = require('../db');
const authMiddleware = require('../middleware/auth');
const logger = require('../logger');

const router = express.Router();
router.use(authMiddleware);

// POST /api/kullanici/push-token
router.post('/push-token', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ hata: 'Token zorunludur' });
  try {
    const pool = await getPool();
    await pool.request()
      .input('kullaniciId', sql.Int, req.kullanici.kullaniciId)
      .input('token', sql.NVarChar, token)
      .query('UPDATE Kullaniciler SET PushToken = @token WHERE KullaniciID = @kullaniciId');
    res.json({ mesaj: 'Push token kaydedildi' });
  } catch (err) {
    logger.error(`Push token hatası: ${err.message}`);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

module.exports = router;
