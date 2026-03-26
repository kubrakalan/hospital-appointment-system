const jwt = require('jsonwebtoken');

// Her istekte token'ı kontrol eder
// Token geçerliyse req.kullanici'ya kullanıcı bilgilerini yazar
module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ hata: 'Token gerekli' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.kullanici = decoded;
    next();
  } catch {
    res.status(401).json({ hata: 'Geçersiz token' });
  }
};
