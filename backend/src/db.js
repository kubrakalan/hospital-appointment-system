const sql = require('mssql');
require('dotenv').config();

// SQL Server bağlantı ayarları
const config = {
  server: 'localhost',
  port: 45800,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    trustServerCertificate: true,
    encrypt: false,
  },
};

// Bağlantı havuzu — her istek için yeni bağlantı açmak yerine
// mevcut bağlantıları yeniden kullanır (performans için)
let pool;

async function getPool() {
  if (!pool) {
    pool = sql.connect(config);
    await pool;
    console.log('Veritabanına bağlandı');
  }
  return pool;
}

module.exports = { getPool, sql };
