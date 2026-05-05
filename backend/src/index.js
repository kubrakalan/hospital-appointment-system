const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const logger = require('./logger');
const app = express();

// CORS: Web frontend + React Native (Origin header göndermez, null origin)
app.use(cors({
  origin: (origin, cb) => cb(null, true), // localhost, LAN IP ve mobil (no-origin) hepsine izin ver
  credentials: true,
}));

// Gelen isteklerin body'sini JSON olarak oku
app.use(express.json());

// HTTP istek logları — her gelen istek otomatik loglanır
app.use(morgan('[:date[clf]] :method :url :status :response-time ms', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

// Route'ları bağla
app.use('/api/auth', require('./routes/auth'));
app.use('/api/randevular', require('./routes/randevular'));
app.use('/api/doktor', require('./routes/doktor'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/bildirimler', require('./routes/bildirimler'));
app.use('/api/kullanici', require('./routes/kullanici'));
app.use('/api/mesajlar', require('./routes/mesajlar'));
app.use('/api/saglik', require('./routes/saglik'));

// Test endpoint'i — sunucunun çalışıp çalışmadığını kontrol etmek için
app.get('/api/ping', (_req, res) => {
  res.json({ mesaj: 'Backend çalışıyor!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});

// Email hatırlatma scheduler'ı başlat — her gün 08:00'de yarın randevusu olanlara email atar
const { schedulerBaslat } = require('./emailHatirlatma');
schedulerBaslat();
