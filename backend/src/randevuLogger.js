const winston = require('winston');
const path = require('path');

// Genel logger'dan bağımsız, sadece randevu olaylarını yazar
const randevuLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase().padEnd(5)} ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/randevu.log'),
    }),
  ],
});

module.exports = randevuLogger;
