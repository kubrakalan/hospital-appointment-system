const nodemailer = require('nodemailer');
const { getPool, sql } = require('./db');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// Yarın randevusu olan hastalara email gönder
async function hatirlatmalarıGonder() {
  try {
    const pool = await getPool();

    // Yarının tarihini hesapla
    const yarin = new Date();
    yarin.setDate(yarin.getDate() + 1);
    const yarinStr = yarin.toISOString().split('T')[0]; // YYYY-MM-DD

    // Yarın Beklemede veya Onaylandı durumunda randevusu olan hastaları getir
    const sonuc = await pool.request()
      .input('yarin', sql.NVarChar, yarinStr)
      .query(`
        SELECT
          kh.Ad + ' ' + kh.Soyad AS HastaAdi,
          kh.Email AS HastaEmail,
          kd.Ad + ' ' + kd.Soyad AS DoktorAdi,
          u.UzmanlikAdi,
          CONVERT(varchar(5), r.RandevuSaati, 108) AS Saat,
          r.Durum
        FROM Randevular r
        JOIN Hastalar h ON r.HastaID = h.HastaID
        JOIN Kullaniciler kh ON h.KullaniciID = kh.KullaniciID
        JOIN Doktorlar d ON r.DoktorID = d.DoktorID
        JOIN Kullaniciler kd ON d.KullaniciID = kd.KullaniciID
        JOIN Uzmanliklar u ON d.UzmanlikID = u.UzmanlikID
        WHERE CAST(r.RandevuTarihi AS DATE) = CAST(@yarin AS DATE)
          AND r.Durum IN ('Beklemede', 'Onaylandı')
      `);

    const randevular = sonuc.recordset;

    if (randevular.length === 0) {
      logger.info(`Email hatırlatma: ${yarinStr} için randevu yok, email gönderilmedi`);
      return;
    }

    // Her hasta için email gönder
    let gonderilen = 0;
    let basarisiz = 0;

    for (const r of randevular) {
      try {
        await transporter.sendMail({
          from: `"MediRandevu" <${process.env.EMAIL_USER}>`,
          to: r.HastaEmail,
          subject: '🏥 Yarın Randevunuz Var — MediRandevu',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
              <h2 style="color: #2563eb; margin-bottom: 4px;">Randevu Hatırlatması</h2>
              <p style="color: #64748b; margin-top: 0;">Merhaba <strong>${r.HastaAdi}</strong>,</p>
              <p style="color: #374151;">Yarın bir randevunuz bulunmaktadır:</p>

              <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Doktor</td>
                    <td style="font-weight: 600; color: #1e293b; font-size: 13px;">Dr. ${r.DoktorAdi}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Uzmanlık</td>
                    <td style="color: #1e293b; font-size: 13px;">${r.UzmanlikAdi}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Tarih</td>
                    <td style="color: #1e293b; font-size: 13px;">${yarinStr}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Saat</td>
                    <td style="font-weight: 600; color: #2563eb; font-size: 13px;">${r.Saat}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Durum</td>
                    <td style="color: #16a34a; font-size: 13px;">${r.Durum}</td>
                  </tr>
                </table>
              </div>

              <p style="color: #64748b; font-size: 13px;">Randevunuza zamanında gelmenizi rica ederiz. İptal etmek isterseniz sisteme giriş yapabilirsiniz.</p>
              <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">MediRandevu — Otomatik hatırlatma</p>
            </div>
          `,
        });
        gonderilen++;
      } catch (emailHata) {
        basarisiz++;
        logger.error(`Email gönderilemedi | alıcı=${r.HastaEmail} hata="${emailHata.message}"`);
      }
    }

    logger.info(`Email hatırlatma tamamlandı | tarih=${yarinStr} toplam=${randevular.length} gönderilen=${gonderilen} başarısız=${basarisiz}`);

  } catch (err) {
    logger.error(`Email hatırlatma servisi hatası: ${err.message}`);
  }
}

// Her gün sabah 08:00'de çalıştır
function schedulerBaslat() {
  // Bir sonraki 08:00'i hesapla
  function birSonraki08() {
    const simdi = new Date();
    const hedef = new Date();
    hedef.setHours(8, 0, 0, 0);
    if (simdi >= hedef) {
      hedef.setDate(hedef.getDate() + 1); // Bugün 08:00 geçtiyse yarın
    }
    return hedef.getTime() - simdi.getTime();
  }

  // İlk çalışmayı planla
  setTimeout(function ilkCalisma() {
    hatirlatmalarıGonder();
    // Sonra her 24 saatte bir tekrar et
    setInterval(hatirlatmalarıGonder, 24 * 60 * 60 * 1000);
  }, birSonraki08());

  const ilkBeklemeDk = Math.round(birSonraki08() / 60000);
  logger.info(`Email hatırlatma scheduler başlatıldı — ilk çalışma ${ilkBeklemeDk} dakika sonra (08:00)`);
}

module.exports = { schedulerBaslat, hatirlatmalarıGonder };
