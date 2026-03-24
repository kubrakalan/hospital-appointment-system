-- ============================================================
-- HASTANE RANDEVU SİSTEMİ - VERİTABANI TABLOLARI
-- ============================================================
-- Çalıştırma sırası önemli! FK bağımlılıkları nedeniyle
-- bu sırayla çalıştır: 1→2→3→4→5
-- ============================================================

-- Veritabanını oluştur (ilk kez çalıştırırken)
-- CREATE DATABASE HastaneDB;
-- GO
-- USE HastaneDB;
-- GO

-- ============================================================
-- TABLO 1: Uzmanlık Alanları
-- (Doktorlardan önce oluşturulmalı çünkü Doktorlar buna bağlı)
-- ============================================================
CREATE TABLE Uzmanliklar (
    UzmanlikID   INT           NOT NULL IDENTITY(1,1),  -- Otomatik artan numara (1,2,3...)
    UzmanlikAdi  NVARCHAR(100) NOT NULL,                -- Kardiyoloji, Ortopedi vb.

    CONSTRAINT PK_Uzmanliklar PRIMARY KEY (UzmanlikID)  -- Bu tablonun kimlik alanı
);

-- ============================================================
-- TABLO 2: Doktorlar
-- ============================================================
CREATE TABLE Doktorlar (
    DoktorID     INT           NOT NULL IDENTITY(1,1),
    Ad           NVARCHAR(50)  NOT NULL,
    Soyad        NVARCHAR(50)  NOT NULL,
    UzmanlikID   INT           NOT NULL,               -- Hangi uzmanlık alanında?
    Telefon      NVARCHAR(20)  NULL,
    Email        NVARCHAR(100) NULL,
    OlusturmaTarihi DATETIME   NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_Doktorlar PRIMARY KEY (DoktorID),
    CONSTRAINT FK_Doktorlar_Uzmanliklar                -- Uzmanliklar tablosuna bağlı
        FOREIGN KEY (UzmanlikID) REFERENCES Uzmanliklar(UzmanlikID)
);


-- ============================================================
-- TABLO 3: Hastalar (Sisteme kayıt olan kullanıcılar)
-- ============================================================
CREATE TABLE Hastalar (
    HastaID      INT           NOT NULL IDENTITY(1,1),
    Ad           NVARCHAR(50)  NOT NULL,
    Soyad        NVARCHAR(50)  NOT NULL,
    TCKimlik     NVARCHAR(11)  NULL,                   -- Opsiyonel
    DogumTarihi  DATE          NULL,
    Cinsiyet     NVARCHAR(10)  NULL,                   -- 'Erkek' veya 'Kadın'
    Telefon      NVARCHAR(20)  NULL,
    Email        NVARCHAR(100) NOT NULL,               -- Giriş için kullanılacak
    SifreHash    NVARCHAR(255) NOT NULL,               -- Şifre düz metin saklanmaz!
    OlusturmaTarihi DATETIME   NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_Hastalar PRIMARY KEY (HastaID),
    CONSTRAINT UQ_Hastalar_Email UNIQUE (Email)        -- Aynı email 2 kez kayıt olamaz
);

-- ============================================================
-- TABLO 4: Doktor Çalışma Saatleri
-- Hangi doktor, hangi gün, saat kaçtan kaça çalışıyor?
-- ============================================================
CREATE TABLE DoktorCalisma (
    CalismaID     INT          NOT NULL IDENTITY(1,1),
    DoktorID      INT          NOT NULL,
    Gun           NVARCHAR(15) NOT NULL,               -- 'Pazartesi', 'Salı' vb.
    BaslangicSaat TIME         NOT NULL,               -- 09:00
    BitisSaat     TIME         NOT NULL,               -- 17:00

    CONSTRAINT PK_DoktorCalisma PRIMARY KEY (CalismaID),
    CONSTRAINT FK_DoktorCalisma_Doktorlar
        FOREIGN KEY (DoktorID) REFERENCES Doktorlar(DoktorID)
);

-- ============================================================
-- TABLO 5: Randevular
-- (Hasta + Doktor + Tarih/Saat birleşimi)
-- ============================================================
CREATE TABLE Randevular (
    RandevuID    INT           NOT NULL IDENTITY(1,1),
    HastaID      INT           NOT NULL,               -- Hangi hasta?
    DoktorID     INT           NOT NULL,               -- Hangi doktor?
    RandevuTarihi DATE         NOT NULL,               -- Hangi gün?
    RandevuSaati TIME          NOT NULL,               -- Saat kaçta?
    Durum        NVARCHAR(20)  NOT NULL DEFAULT 'Beklemede',
                                                       -- Beklemede / Onaylandı /
                                                       -- İptal / Tamamlandı
    Notlar       NVARCHAR(500) NULL,                   -- Hasta veya doktor notu
    OlusturmaTarihi DATETIME   NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_Randevular PRIMARY KEY (RandevuID),
    CONSTRAINT FK_Randevular_Hastalar
        FOREIGN KEY (HastaID) REFERENCES Hastalar(HastaID),
    CONSTRAINT FK_Randevular_Doktorlar
        FOREIGN KEY (DoktorID) REFERENCES Doktorlar(DoktorID),

    -- Aynı doktor, aynı gün, aynı saatte 2 randevu olamaz
    CONSTRAINT UQ_Randevu_Cakisma UNIQUE (DoktorID, RandevuTarihi, RandevuSaati)
);
