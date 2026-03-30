// Admin rotaları için çift katman koruma — JWT'den önce çalışır
// İstemci header'a şunu eklemeli: Authorization: Basic <base64(user:pass)>
// Ancak admin rotalarında hem Basic hem Bearer aynı header'a giremez,
// bu yüzden Basic Auth bilgisini ayrı bir header'da alıyoruz: X-Admin-Auth
module.exports = function basicAuth(req, res, next) {
  const header = req.headers['x-admin-auth'];

  if (!header || !header.startsWith('Basic ')) {
    return res.status(401).json({ hata: 'Admin kimlik doğrulaması gerekli' });
  }

  let kullanici, sifre;
  try {
    const decoded = Buffer.from(header.split(' ')[1], 'base64').toString('utf-8');
    [kullanici, sifre] = decoded.split(':');
  } catch {
    return res.status(401).json({ hata: 'Geçersiz kimlik bilgisi formatı' });
  }

  if (
    kullanici !== process.env.ADMIN_BASIC_USER ||
    sifre !== process.env.ADMIN_BASIC_PASS
  ) {
    return res.status(401).json({ hata: 'Yanlış admin kimlik bilgisi' });
  }

  next();
};
