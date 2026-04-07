-- ============================================================
-- Ban sistemi ve Gelmedi durumu
-- ============================================================
USE HastaneDB;

-- 1. Hastalar tablosuna ban sütunları ekle
--    BanBitisTarihi → ban ne zaman bitiyor? NULL ise ban yok
--    BanSebebi      → neden ban yedi? (randevuya gelmedi vb.)
ALTER TABLE Hastalar
ADD BanBitisTarihi DATETIME     NULL,
    BanSebebi      NVARCHAR(255) NULL;
GO

-- 2. Randevular tablosundaki Durum CHECK constraint'i güncelle
--    Mevcut constraint'i bul ve kaldır, yenisini ekle
DECLARE @constraintAdi NVARCHAR(200)
SELECT @constraintAdi = cc.name
FROM sys.check_constraints cc
JOIN sys.tables t ON cc.parent_object_id = t.object_id
WHERE t.name = 'Randevular'

IF @constraintAdi IS NOT NULL
    EXEC('ALTER TABLE Randevular DROP CONSTRAINT ' + @constraintAdi)
GO

-- 3. Randevular Durum sütununa 'Gelmedi' değerini ekle
ALTER TABLE Randevular
ADD CONSTRAINT CK_Randevular_Durum
CHECK (Durum IN ('Beklemede', 'Onaylandı', 'İptal', 'Tamamlandı', 'Gelmedi'));
GO
