const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

function sarmal(icerik) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:24px;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#2563eb;font-size:24px;margin:0;">🏥 MediRandevu</h1>
      </div>
      <div style="background:#fff;border-radius:8px;padding:24px;border:1px solid #e5e7eb;">
        ${icerik}
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px;">
        Bu e-posta MediRandevu sistemi tarafından otomatik gönderilmiştir.
      </p>
    </div>
  `;
}

async function gonder(to, subject, html) {
  try {
    await transporter.sendMail({
      from: `"MediRandevu" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: sarmal(html),
    });
    logger.info(`E-posta gönderildi | alıcı=${to} konu="${subject}"`);
  } catch (err) {
    logger.error(`E-posta gönderilemedi | alıcı=${to} hata="${err.message}"`);
  }
}

module.exports = {
  hosgeldin(ad, email) {
    return gonder(email, 'MediRandevu\'ya Hoş Geldiniz!', `
      <h2 style="color:#1f2937;margin-top:0;">Merhaba ${ad}! 👋</h2>
      <p style="color:#4b5563;">MediRandevu ailesine katıldığınız için teşekkürler.</p>
      <p style="color:#4b5563;">Artık online randevu alabilir, tıbbi kayıtlarınıza ulaşabilirsiniz.</p>
      <div style="background:#eff6ff;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#1d4ed8;font-size:14px;">
          🔐 Hesabınızı korumak için güçlü bir şifre kullandığınızdan emin olun.
        </p>
      </div>
    `);
  },

  randevuOlusturuldu(ad, email, doktorAdi, uzmanlik, tarih, saat) {
    return gonder(email, `Randevunuz Oluşturuldu — ${tarih}`, `
      <h2 style="color:#1f2937;margin-top:0;">Randevunuz Oluşturuldu ✅</h2>
      <p style="color:#4b5563;">Merhaba ${ad},</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="color:#6b7280;font-size:14px;padding:6px 0;">Doktor</td><td style="font-weight:600;color:#1f2937;">Dr. ${doktorAdi}</td></tr>
          <tr><td style="color:#6b7280;font-size:14px;padding:6px 0;">Uzmanlık</td><td style="font-weight:600;color:#1f2937;">${uzmanlik}</td></tr>
          <tr><td style="color:#6b7280;font-size:14px;padding:6px 0;">Tarih</td><td style="font-weight:600;color:#1f2937;">${tarih}</td></tr>
          <tr><td style="color:#6b7280;font-size:14px;padding:6px 0;">Saat</td><td style="font-weight:600;color:#1f2937;">${saat}</td></tr>
        </table>
      </div>
      <p style="color:#4b5563;font-size:14px;">Randevunuzu iptal etmek isterseniz sisteme giriş yapabilirsiniz.</p>
    `);
  },

  randevuOnaylandi(ad, email, doktorAdi, tarih, saat) {
    return gonder(email, `Randevunuz Onaylandı — ${tarih}`, `
      <h2 style="color:#1f2937;margin-top:0;">Randevunuz Onaylandı 🎉</h2>
      <p style="color:#4b5563;">Merhaba ${ad},</p>
      <p style="color:#4b5563;"><strong>Dr. ${doktorAdi}</strong> ile <strong>${tarih} saat ${saat}</strong> randevunuz onaylandı.</p>
      <div style="background:#eff6ff;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#1d4ed8;font-size:14px;">
          ⏰ Randevunuza zamanında gelmenizi hatırlatırız. Gelemeyeceğiniz durumda lütfen önceden iptal edin.
        </p>
      </div>
    `);
  },

  randevuIptalDoktor(ad, email, doktorAdi, tarih) {
    return gonder(email, `Randevunuz İptal Edildi — ${tarih}`, `
      <h2 style="color:#1f2937;margin-top:0;">Randevunuz İptal Edildi ❌</h2>
      <p style="color:#4b5563;">Merhaba ${ad},</p>
      <p style="color:#4b5563;"><strong>Dr. ${doktorAdi}</strong> ile <strong>${tarih}</strong> tarihli randevunuz iptal edildi.</p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#dc2626;font-size:14px;">
          Yeni randevu almak için sisteme giriş yapabilirsiniz.
        </p>
      </div>
    `);
  },

  randevuTamamlandi(ad, email, doktorAdi, tarih) {
    return gonder(email, `Randevunuz Tamamlandı — ${tarih}`, `
      <h2 style="color:#1f2937;margin-top:0;">Randevunuz Tamamlandı ✅</h2>
      <p style="color:#4b5563;">Merhaba ${ad},</p>
      <p style="color:#4b5563;"><strong>Dr. ${doktorAdi}</strong> ile <strong>${tarih}</strong> tarihli randevunuz tamamlandı.</p>
      <p style="color:#4b5563;font-size:14px;">Tıbbi kayıt notlarınıza sisteme giriş yaparak ulaşabilirsiniz.</p>
    `);
  },

  sifreSifirla(ad, email, link) {
    return gonder(email, 'Şifre Sıfırlama Talebi', `
      <h2 style="color:#1f2937;margin-top:0;">Şifre Sıfırlama 🔑</h2>
      <p style="color:#4b5563;">Merhaba ${ad},</p>
      <p style="color:#4b5563;">Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${link}" style="background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
          Şifremi Sıfırla
        </a>
      </div>
      <p style="color:#9ca3af;font-size:13px;">Bu link <strong>1 saat</strong> geçerlidir. Bu isteği siz yapmadıysanız dikkate almayın.</p>
    `);
  },

  topluDuyuru(ad, email, baslik, mesaj) {
    return gonder(email, `Duyuru: ${baslik}`, `
      <h2 style="color:#1f2937;margin-top:0;">📢 ${baslik}</h2>
      <p style="color:#4b5563;">Merhaba ${ad},</p>
      <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #2563eb;">
        <p style="color:#374151;margin:0;white-space:pre-line;">${mesaj}</p>
      </div>
    `);
  },
};
