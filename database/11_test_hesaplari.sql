-- ============================================================
-- TEST HESAPLARI
-- Şifrelerin tümü: Test1234!
-- bcrypt hash (cost=10) karşılığı: $2a$10$Lz.../...
-- ============================================================
-- Bu scripti çalıştırmadan önce 01-09 scriptlerin çalıştığından emin ol.

-- ============================================================
-- ADMIN HESABI
-- Email   : admin@medirandevu.com
-- Şifre   : Test1234!
-- Rol     : Admin
-- ============================================================
INSERT INTO Kullaniciler (Email, SifreHash, Rol, Ad, Soyad)
VALUES (
  'admin@medirandevu.com',
  '$2b$10$ErOtKClqQnj.TGYVj06moupSXQcD4RojYaiLgPFCgq7Xc/52vDEri',
  'Admin', 'Sistem', 'Yöneticisi'
);

-- ============================================================
-- DOKTOR HESABI
-- Email   : doktor@medirandevu.com
-- Şifre   : Test1234!
-- Rol     : Doktor  |  Uzmanlık: Kardiyoloji
-- ============================================================
DECLARE @doktorKullaniciId INT;
INSERT INTO Kullaniciler (Email, SifreHash, Rol, Ad, Soyad)
VALUES (
  'doktor@medirandevu.com',
  '$2b$10$ErOtKClqQnj.TGYVj06moupSXQcD4RojYaiLgPFCgq7Xc/52vDEri',
  'Doktor', 'Ahmet', 'Yılmaz'
);
SET @doktorKullaniciId = SCOPE_IDENTITY();

-- Uzmanlık ID'sini bul (Kardiyoloji yoksa ilk uzmanlığı kullan)
DECLARE @uzmanlikId INT;
SELECT TOP 1 @uzmanlikId = UzmanlikID FROM Uzmanliklar WHERE UzmanlikAdi = 'Kardiyoloji';
IF @uzmanlikId IS NULL SELECT TOP 1 @uzmanlikId = UzmanlikID FROM Uzmanliklar;

INSERT INTO Doktorlar (KullaniciID, UzmanlikID, Telefon)
VALUES (@doktorKullaniciId, @uzmanlikId, '0532 111 22 33');

-- ============================================================
-- HASTA HESABI
-- Email   : hasta@medirandevu.com
-- Şifre   : Test1234!
-- Rol     : Hasta
-- ============================================================
DECLARE @hastaKullaniciId INT;
INSERT INTO Kullaniciler (Email, SifreHash, Rol, Ad, Soyad)
VALUES (
  'hasta@medirandevu.com',
  '$2b$10$ErOtKClqQnj.TGYVj06moupSXQcD4RojYaiLgPFCgq7Xc/52vDEri',
  'Hasta', 'Fatma', 'Demir'
);
SET @hastaKullaniciId = SCOPE_IDENTITY();

INSERT INTO Hastalar (KullaniciID, Telefon, Cinsiyet, KanGrubu)
VALUES (@hastaKullaniciId, '0533 222 33 44', 'Kadın', 'A+');

-- ============================================================
-- Kayıtları doğrula
-- ============================================================
SELECT KullaniciID, Email, Rol, Ad, Soyad FROM Kullaniciler
WHERE Email IN ('admin@medirandevu.com', 'doktor@medirandevu.com', 'hasta@medirandevu.com');
