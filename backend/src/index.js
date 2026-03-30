const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const logger = require('./logger');
const app = express();

// CORS: Frontend'in (port 5173) bu sunucuya istek atmasına izin ver
app.use(cors({ origin: /^http:\/\/localhost(:\d+)?$/ }));

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

// Test endpoint'i — sunucunun çalışıp çalışmadığını kontrol etmek için
app.get('/api/ping', (_req, res) => {
  res.json({ mesaj: 'Backend çalışıyor!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
