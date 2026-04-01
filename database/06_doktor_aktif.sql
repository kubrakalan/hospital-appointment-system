-- Doktorlar tablosuna Aktif kolonu ekle
-- 1 = aktif (randevu alınabilir), 0 = pasif (randevu alınamaz)
ALTER TABLE Doktorlar
ADD Aktif BIT NOT NULL DEFAULT 1;
