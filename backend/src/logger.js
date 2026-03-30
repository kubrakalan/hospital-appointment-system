const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase().padEnd(5)} ${message}`;
    })
  ),
  transports: [
    // Konsola yaz
    new winston.transports.Console(),
    // Tüm logları dosyaya yaz
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/uygulama.log'),
    }),
    // Sadece hataları ayrı dosyaya yaz
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/hata.log'),
      level: 'error',
    }),
  ],
});

module.exports = logger;
