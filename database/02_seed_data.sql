-- ============================================================
-- ÖRNEK VERİLER (Test için)
-- 01_create_tables.sql'den SONRA çalıştır
-- ============================================================


-- ============================================================
-- Uzmanlık Alanları
-- ============================================================
INSERT INTO Uzmanliklar (UzmanlikAdi) VALUES
    ('Kardiyoloji'),
    ('Ortopedi'),
    ('Nöroloji'),
    ('Göz Hastalıkları'),
    ('Kulak Burun Boğaz'),
    ('Dahiliye'),
    ('Çocuk Sağlığı'),
    ('Dermatoloji');


-- ============================================================
-- Kullanıcılar (Admin + Doktorlar + Hastalar)
-- SifreHash değerleri gerçekte bcrypt ile üretilir.
-- Buradaki değerler sadece test içindir, şifre: "test123"
-- ============================================================
INSERT INTO Kullaniciler (Email, SifreHash, Rol, Ad, Soyad) VALUES
    -- Admin
    ('admin@hastane.com',          '$2b$10$testhashadmin',   'Admin',  'Sistem',  'Yöneticisi'),

    -- Doktorlar
    ('ahmet.yilmaz@hastane.com',   '$2b$10$testhash1',       'Doktor', 'Ahmet',   'Yılmaz'),
    ('ayse.kaya@hastane.com',      '$2b$10$testhash2',       'Doktor', 'Ayşe',    'Kaya'),
    ('mehmet.demir@hastane.com',   '$2b$10$testhash3',       'Doktor', 'Mehmet',  'Demir'),
    ('fatma.celik@hastane.com',    '$2b$10$testhash4',       'Doktor', 'Fatma',   'Çelik'),
    ('ali.sahin@hastane.com',      '$2b$10$testhash5',       'Doktor', 'Ali',     'Şahin'),

    -- Hastalar
    ('test.hasta@test.com',        '$2b$10$testhashuntil',   'Hasta',  'Test',    'Kullanıcı'),
    ('zeynep.oz@test.com',         '$2b$10$testhash7',       'Hasta',  'Zeynep',  'Öz');


-- ============================================================
-- Doktor Profilleri
-- KullaniciID 2-6 → doktor kullanıcılar (yukarıdaki INSERT sırasına göre)
-- ============================================================
INSERT INTO Doktorlar (KullaniciID, UzmanlikID, Telefon) VALUES
    (2, 1, '555-001'),   -- Ahmet Yılmaz → Kardiyoloji
    (3, 2, '555-002'),   -- Ayşe Kaya    → Ortopedi
    (4, 3, '555-003'),   -- Mehmet Demir → Nöroloji
    (5, 4, '555-004'),   -- Fatma Çelik  → Göz Hastalıkları
    (6, 6, '555-005');   -- Ali Şahin    → Dahiliye


-- ============================================================
-- Hasta Profilleri
-- KullaniciID 7-8 → hasta kullanıcılar
-- ============================================================
INSERT INTO Hastalar (KullaniciID, DogumTarihi, Cinsiyet, Telefon) VALUES
    (7, '1990-01-15', 'Erkek', '555-100'),  -- Test Kullanıcı
    (8, '1995-06-20', 'Kadın', '555-101');  -- Zeynep Öz


-- ============================================================
-- Doktor Çalışma Saatleri
-- ============================================================
INSERT INTO DoktorCalisma (DoktorID, Gun, BaslangicSaat, BitisSaat) VALUES
    -- Dr. Ahmet Yılmaz (DoktorID: 1)
    (1, 'Pazartesi', '09:00', '17:00'),
    (1, 'Çarşamba',  '09:00', '17:00'),
    (1, 'Cuma',      '09:00', '13:00'),

    -- Dr. Ayşe Kaya (DoktorID: 2)
    (2, 'Salı',      '08:00', '16:00'),
    (2, 'Perşembe',  '08:00', '16:00'),

    -- Dr. Mehmet Demir (DoktorID: 3)
    (3, 'Pazartesi', '10:00', '18:00'),
    (3, 'Salı',      '10:00', '18:00'),
    (3, 'Cuma',      '10:00', '14:00');


-- ============================================================
-- Test Randevusu
-- ============================================================
INSERT INTO Randevular (HastaID, DoktorID, RandevuTarihi, RandevuSaati, Durum) VALUES
    (1, 1, '2026-04-01', '10:00', 'Beklemede');
