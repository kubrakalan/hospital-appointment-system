-- ============================================================
-- HASTANE RANDEVU SİSTEMİ - VERİTABANI TABLOLARI
-- ============================================================
-- Çalıştırma sırası: 1 → 2 → 3 → 4 → 5 → 6
-- FK bağımlılıkları nedeniyle sırayla çalıştır!
-- ============================================================

-- CREATE DATABASE HastaneDB;
-- GO
-- USE HastaneDB;
-- GO


-- ============================================================
-- TABLO 1: Kullanıcılar (tüm kullanıcılar buraya giriyor)
-- Hasta da, doktor da, admin de önce buraya kaydolur.
-- Giriş yapıldığında rol buradan okunur → hangi panele yönleneceği belirlenir.
-- ============================================================
CREATE TABLE Kullaniciler (
    KullaniciID     INT           NOT NULL IDENTITY(1,1),
    Email           NVARCHAR(100) NOT NULL,
    SifreHash       NVARCHAR(255) NOT NULL,               -- Şifre düz metin saklanmaz!
    Rol             NVARCHAR(10)  NOT NULL,               -- 'Hasta' / 'Doktor' / 'Admin'
    Ad              NVARCHAR(50)  NOT NULL,
    Soyad           NVARCHAR(50)  NOT NULL,
    OlusturmaTarihi DATETIME      NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_Kullaniciler PRIMARY KEY (KullaniciID),
    CONSTRAINT UQ_Kullaniciler_Email UNIQUE (Email),
    CONSTRAINT CK_Kullaniciler_Rol CHECK (Rol IN ('Hasta', 'Doktor', 'Admin'))
);


-- ============================================================
-- TABLO 2: Uzmanlık Alanları
-- (Doktorlar tablosundan önce oluşturulmalı)
-- ============================================================
CREATE TABLE Uzmanliklar (
    UzmanlikID  INT           NOT NULL IDENTITY(1,1),
    UzmanlikAdi NVARCHAR(100) NOT NULL,

    CONSTRAINT PK_Uzmanliklar PRIMARY KEY (UzmanlikID)
);


-- ============================================================
-- TABLO 3: Hastalar (hastalara özgü ek bilgiler)
-- Her hastanın Kullaniciler tablosunda bir kaydı olmak zorunda.
-- ============================================================
CREATE TABLE Hastalar (
    HastaID         INT          NOT NULL IDENTITY(1,1),
    KullaniciID     INT          NOT NULL,               -- Kullaniciler tablosuna bağlı
    TCKimlik        NVARCHAR(11) NULL,
    DogumTarihi     DATE         NULL,
    Cinsiyet        NVARCHAR(10) NULL,                   -- 'Erkek' veya 'Kadın'
    Telefon         NVARCHAR(20) NULL,

    CONSTRAINT PK_Hastalar PRIMARY KEY (HastaID),
    CONSTRAINT FK_Hastalar_Kullaniciler
        FOREIGN KEY (KullaniciID) REFERENCES Kullaniciler(KullaniciID),
    CONSTRAINT UQ_Hastalar_KullaniciID UNIQUE (KullaniciID) -- 1 kullanıcı = 1 hasta profili
);


-- ============================================================
-- TABLO 4: Doktorlar (doktorlara özgü ek bilgiler)
-- Her doktorun Kullaniciler tablosunda bir kaydı olmak zorunda.
-- ============================================================
CREATE TABLE Doktorlar (
    DoktorID    INT          NOT NULL IDENTITY(1,1),
    KullaniciID INT          NOT NULL,                   -- Kullaniciler tablosuna bağlı
    UzmanlikID  INT          NOT NULL,                   -- Hangi uzmanlık alanında?
    Telefon     NVARCHAR(20) NULL,

    CONSTRAINT PK_Doktorlar PRIMARY KEY (DoktorID),
    CONSTRAINT FK_Doktorlar_Kullaniciler
        FOREIGN KEY (KullaniciID) REFERENCES Kullaniciler(KullaniciID),
    CONSTRAINT FK_Doktorlar_Uzmanliklar
        FOREIGN KEY (UzmanlikID) REFERENCES Uzmanliklar(UzmanlikID),
    CONSTRAINT UQ_Doktorlar_KullaniciID UNIQUE (KullaniciID) -- 1 kullanıcı = 1 doktor profili
);


-- ============================================================
-- TABLO 5: Doktor Çalışma Saatleri
-- Hangi doktor, hangi gün, saat kaçtan kaça çalışıyor?
-- ============================================================
CREATE TABLE DoktorCalisma (
    CalismaID     INT          NOT NULL IDENTITY(1,1),
    DoktorID      INT          NOT NULL,
    Gun           NVARCHAR(15) NOT NULL,                 -- 'Pazartesi', 'Salı' vb.
    BaslangicSaat TIME         NOT NULL,                 -- 09:00
    BitisSaat     TIME         NOT NULL,                 -- 17:00

    CONSTRAINT PK_DoktorCalisma PRIMARY KEY (CalismaID),
    CONSTRAINT FK_DoktorCalisma_Doktorlar
        FOREIGN KEY (DoktorID) REFERENCES Doktorlar(DoktorID)
);


-- ============================================================
-- TABLO 6: Randevular
-- ============================================================
CREATE TABLE Randevular (
    RandevuID       INT           NOT NULL IDENTITY(1,1),
    HastaID         INT           NOT NULL,              -- Hangi hasta?
    DoktorID        INT           NOT NULL,              -- Hangi doktor?
    RandevuTarihi   DATE          NOT NULL,              -- Hangi gün?
    RandevuSaati    TIME          NOT NULL,              -- Saat kaçta?
    Durum           NVARCHAR(20)  NOT NULL DEFAULT 'Beklemede',
                                                         -- Beklemede / Onaylandı / İptal / Tamamlandı
    Notlar          NVARCHAR(500) NULL,
    OlusturmaTarihi DATETIME      NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_Randevular PRIMARY KEY (RandevuID),
    CONSTRAINT FK_Randevular_Hastalar
        FOREIGN KEY (HastaID) REFERENCES Hastalar(HastaID),
    CONSTRAINT FK_Randevular_Doktorlar
        FOREIGN KEY (DoktorID) REFERENCES Doktorlar(DoktorID),

    -- Aynı doktor, aynı gün, aynı saatte 2 randevu olamaz
    CONSTRAINT UQ_Randevu_Cakisma UNIQUE (DoktorID, RandevuTarihi, RandevuSaati)
);
