-- ============================================================
-- 13_video_gorusme.sql
-- Video görüşme (telemedicine) desteği
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Randevular' AND COLUMN_NAME='RandevuTipi')
  ALTER TABLE Randevular ADD RandevuTipi NVARCHAR(20) NOT NULL DEFAULT 'Hastane';

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Randevular' AND COLUMN_NAME='VideoOdaID')
  ALTER TABLE Randevular ADD VideoOdaID NVARCHAR(100) NULL;

GO

-- Mevcut randevular için varsayılan değer zaten DEFAULT ile atandı
-- VideoOdaID sadece RandevuTipi='Online' olanlarda dolu olacak
