-- ============================================================
-- ÖRNEK VERİLER (Test için)
-- 01_create_tables.sql'den SONRA çalıştır
-- ============================================================

-- Uzmanlık Alanları
INSERT INTO Uzmanliklar (UzmanlikAdi) VALUES
    ('Kardiyoloji'),
    ('Ortopedi'),
    ('Nöroloji'),
    ('Göz Hastalıkları'),
    ('Kulak Burun Boğaz'),
    ('Dahiliye'),
    ('Çocuk Sağlığı'),
    ('Dermatoloji');

-- Doktorlar
INSERT INTO Doktorlar (Ad, Soyad, UzmanlikID, Telefon, Email) VALUES
    ('Ahmet',   'Yılmaz',  1, '555-001', 'ahmet.yilmaz@hastane.com'),   -- Kardiyoloji
    ('Ayşe',    'Kaya',    2, '555-002', 'ayse.kaya@hastane.com'),       -- Ortopedi
    ('Mehmet',  'Demir',   3, '555-003', 'mehmet.demir@hastane.com'),    -- Nöroloji
    ('Fatma',   'Çelik',   4, '555-004', 'fatma.celik@hastane.com'),     -- Göz
    ('Ali',     'Şahin',   6, '555-005', 'ali.sahin@hastane.com');       -- Dahiliye

-- Doktor Çalışma Saatleri (Dr. Ahmet Yılmaz - Pazartesi/Çarşamba/Cuma)
INSERT INTO DoktorCalisma (DoktorID, Gun, BaslangicSaat, BitisSaat) VALUES
    (1, 'Pazartesi', '09:00', '17:00'),
    (1, 'Çarşamba',  '09:00', '17:00'),
    (1, 'Cuma',      '09:00', '13:00'),
    (2, 'Salı',      '08:00', '16:00'),
    (2, 'Perşembe',  '08:00', '16:00'),
    (3, 'Pazartesi', '10:00', '18:00'),
    (3, 'Salı',      '10:00', '18:00'),
    (3, 'Cuma',      '10:00', '14:00');

-- Test Hastası (şifre: "test123" - gerçekte hash olur)
INSERT INTO Hastalar (Ad, Soyad, DogumTarihi, Cinsiyet, Telefon, Email, SifreHash) VALUES
    ('Test', 'Kullanıcı', '1990-01-15', 'Erkek', '555-100', 'test@test.com',
     '$2b$10$examplehashedpassword');

-- Test Randevusu
INSERT INTO Randevular (HastaID, DoktorID, RandevuTarihi, RandevuSaati, Durum) VALUES
    (1, 1, '2026-04-01', '10:00', 'Beklemede');
