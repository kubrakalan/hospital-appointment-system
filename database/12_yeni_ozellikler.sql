-- ============================================================
-- 12_yeni_ozellikler.sql
-- Değerlendirme sistemi, doktor profil alanları, push token
-- ============================================================

-- Doktorlar tablosuna profil alanları ekle
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Doktorlar' AND COLUMN_NAME='Biyografi')
  ALTER TABLE Doktorlar ADD Biyografi NVARCHAR(1000) NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Doktorlar' AND COLUMN_NAME='FotoUrl')
  ALTER TABLE Doktorlar ADD FotoUrl NVARCHAR(500) NULL;

-- Push token (Expo push notification için)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Kullaniciler' AND COLUMN_NAME='PushToken')
  ALTER TABLE Kullaniciler ADD PushToken NVARCHAR(200) NULL;

-- Değerlendirmeler tablosu
IF OBJECT_ID('Degerlendirmeler', 'U') IS NULL
CREATE TABLE Degerlendirmeler (
  DegerlendirmeID INT IDENTITY(1,1) PRIMARY KEY,
  RandevuID       INT NOT NULL REFERENCES Randevular(RandevuID),
  HastaID         INT NOT NULL REFERENCES Hastalar(HastaID),
  DoktorID        INT NOT NULL REFERENCES Doktorlar(DoktorID),
  Puan            TINYINT NOT NULL CHECK (Puan BETWEEN 1 AND 5),
  Yorum           NVARCHAR(500) NULL,
  OlusturmaTarihi DATETIME DEFAULT GETDATE(),
  UNIQUE (RandevuID)  -- Aynı randevuya sadece bir değerlendirme
);
GO
