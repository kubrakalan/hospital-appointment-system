-- ============================================================
-- EN YAKIN MÜSAİT RANDEVU STORED PROCEDURE'LERİ
-- ============================================================
-- Kullanım:
--   EXEC SP_EnYakinMusaitTarih @DoktorID = 3, @BaslangicTarihi = '2026-04-01'
--   EXEC SP_EnYakinMusaitTarihByUzmanlik @UzmanlikID = 1, @BaslangicTarihi = '2026-04-01'
-- ============================================================


-- ============================================================
-- 1) Belirli bir doktor için en yakın müsait gün ve saatleri bul
-- ============================================================
CREATE OR ALTER PROCEDURE SP_EnYakinMusaitTarih
    @DoktorID       INT,
    @BaslangicTarihi DATE          -- Bu tarihten sonrasına bakılır (dahil değil)
AS
BEGIN
    SET NOCOUNT ON;

    -- Doktorun çalışma günleri ve saatleri
    -- Randevu slotu: her 60 dakikada bir (09:00, 10:00, 11:00, 14:00, 15:00 gibi)
    -- Gerçek çalışma saatlerini DoktorCalisma tablosundan al

    DECLARE @GunSayaci   INT  = 1;
    DECLARE @MaxGun      INT  = 30;       -- En fazla 30 gün ileriye bak
    DECLARE @AdimlakSaat INT  = 60;       -- Dakika cinsinden slot aralığı
    DECLARE @KontrolTarih DATE;
    DECLARE @GunAdi      NVARCHAR(15);

    -- Tüm slotları ve durumlarını geçici tabloya al
    CREATE TABLE #Sonuc (
        Tarih        DATE,
        Saat         TIME,
        MusaitMi     BIT
    );

    -- Türkçe gün adı fonksiyonu yok, DATEPART ile çöz
    -- 1=Pazar, 2=Pazartesi, 3=Salı, 4=Çarşamba, 5=Perşembe, 6=Cuma, 7=Cumartesi
    DECLARE @GunMapleme TABLE (DatepartNo INT, GunAdi NVARCHAR(15));
    INSERT INTO @GunMapleme VALUES
        (2, 'Pazartesi'), (3, 'Salı'), (4, 'Çarşamba'),
        (5, 'Perşembe'), (6, 'Cuma');

    WHILE @GunSayaci <= @MaxGun
    BEGIN
        SET @KontrolTarih = DATEADD(DAY, @GunSayaci, @BaslangicTarihi);

        -- Hafta sonu atla (1=Pazar, 7=Cumartesi)
        IF DATEPART(WEEKDAY, @KontrolTarih) IN (1, 7)
        BEGIN
            SET @GunSayaci = @GunSayaci + 1;
            CONTINUE;
        END

        -- O güne ait Türkçe gün adını bul
        SELECT @GunAdi = GunAdi
        FROM @GunMapleme
        WHERE DatepartNo = DATEPART(WEEKDAY, @KontrolTarih);

        -- Doktor o gün çalışıyor mu?
        IF NOT EXISTS (
            SELECT 1 FROM DoktorCalisma
            WHERE DoktorID = @DoktorID AND Gun = @GunAdi
        )
        BEGIN
            SET @GunSayaci = @GunSayaci + 1;
            CONTINUE;
        END

        -- O günün çalışma saatlerini al ve slotları oluştur
        INSERT INTO #Sonuc (Tarih, Saat, MusaitMi)
        SELECT
            @KontrolTarih,
            CAST(DATEADD(MINUTE, n.Dakika, dc.BaslangicSaat) AS TIME),
            CASE
                WHEN EXISTS (
                    SELECT 1 FROM Randevular r
                    WHERE r.DoktorID = @DoktorID
                      AND r.RandevuTarihi = @KontrolTarih
                      AND r.RandevuSaati = CAST(DATEADD(MINUTE, n.Dakika, dc.BaslangicSaat) AS TIME)
                      AND r.Durum NOT IN ('İptal')
                ) THEN 0
                ELSE 1
            END
        FROM DoktorCalisma dc
        -- Çalışma saati boyunca 60'ar dakikalık slotlar üret
        CROSS APPLY (
            SELECT TOP (
                DATEDIFF(MINUTE, dc.BaslangicSaat, dc.BitisSaat) / @AdimlakSaat
            )
            ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) * @AdimlakSaat - @AdimlakSaat AS Dakika
            FROM (VALUES(0),(1),(2),(3),(4),(5),(6),(7),(8),(9)) a(n)
            CROSS JOIN (VALUES(0),(1),(2),(3),(4),(5),(6),(7),(8),(9)) b(n)
        ) n
        WHERE dc.DoktorID = @DoktorID AND dc.Gun = @GunAdi;

        -- Bu gün için en az 1 müsait slot varsa dur
        IF EXISTS (SELECT 1 FROM #Sonuc WHERE Tarih = @KontrolTarih AND MusaitMi = 1)
            BREAK;

        -- Bu gün tamamen doluysa geçici sonuçları temizle, devam et
        DELETE FROM #Sonuc WHERE Tarih = @KontrolTarih;

        SET @GunSayaci = @GunSayaci + 1;
    END

    -- Sonuç: sadece müsait slotları döndür
    SELECT
        Tarih                                    AS EnYakinTarih,
        Saat                                     AS MusaitSaat,
        FORMAT(Tarih, 'dd MMMM yyyy', 'tr-TR')  AS TarihGosterim
    FROM #Sonuc
    WHERE MusaitMi = 1
    ORDER BY Tarih, Saat;

    DROP TABLE #Sonuc;
END;
GO


-- ============================================================
-- 2) Belirli bir uzmanlık alanı için tüm doktorlarda en yakın randevuyu bul
-- ============================================================
CREATE OR ALTER PROCEDURE SP_EnYakinMusaitTarihByUzmanlik
    @UzmanlikID     INT,
    @BaslangicTarihi DATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Her doktor için en yakın müsait tarihi bul, en erkini döndür
    SELECT TOP 1
        d.DoktorID,
        k.Ad + ' ' + k.Soyad   AS DoktorAdi,
        u.UzmanlikAdi,
        -- En yakın müsait tarih: o doktorda randevusu olmayan ilk iş günü
        MIN(CASE
            WHEN NOT EXISTS (
                SELECT 1 FROM Randevular r
                WHERE r.DoktorID = d.DoktorID
                  AND r.RandevuTarihi = CAST(DATEADD(DAY, n.Gun, @BaslangicTarihi) AS DATE)
                  AND r.Durum NOT IN ('İptal')
            )
            AND DATEPART(WEEKDAY, DATEADD(DAY, n.Gun, @BaslangicTarihi)) NOT IN (1, 7)
            AND EXISTS (
                SELECT 1 FROM DoktorCalisma dc2
                WHERE dc2.DoktorID = d.DoktorID
            )
            THEN CAST(DATEADD(DAY, n.Gun, @BaslangicTarihi) AS DATE)
        END) AS EnYakinMusaitTarih
    FROM Doktorlar d
    JOIN Kullaniciler k ON k.KullaniciID = d.KullaniciID
    JOIN Uzmanliklar u  ON u.UzmanlikID  = d.UzmanlikID
    -- 1'den 30'a kadar gün offset'leri
    CROSS JOIN (
        SELECT TOP 30 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS Gun
        FROM (VALUES(0),(1),(2),(3),(4),(5),(6),(7),(8),(9)) a(n)
        CROSS JOIN (VALUES(0),(1),(2),(3),(4),(5),(6),(7),(8),(9)) b(n)
    ) n
    WHERE d.UzmanlikID = @UzmanlikID
    GROUP BY d.DoktorID, k.Ad, k.Soyad, u.UzmanlikAdi
    HAVING MIN(CASE
        WHEN NOT EXISTS (
            SELECT 1 FROM Randevular r
            WHERE r.DoktorID = d.DoktorID
              AND r.RandevuTarihi = CAST(DATEADD(DAY, n.Gun, @BaslangicTarihi) AS DATE)
              AND r.Durum NOT IN ('İptal')
        )
        AND DATEPART(WEEKDAY, DATEADD(DAY, n.Gun, @BaslangicTarihi)) NOT IN (1, 7)
        THEN CAST(DATEADD(DAY, n.Gun, @BaslangicTarihi) AS DATE)
    END) IS NOT NULL
    ORDER BY EnYakinMusaitTarih;
END;
GO
