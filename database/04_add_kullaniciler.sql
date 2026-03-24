-- ============================================================
-- KULLANICI ROLLERI - Hasta / Doktor / Admin ayrımı
-- 01_create_tables.sql'den SONRA çalıştır
-- ============================================================

-- Kullanıcı girişi ve rol yönetimi için tablo
CREATE TABLE Kullaniciler (
    KullaniciID  INT           NOT NULL IDENTITY(1,1),
    Email        NVARCHAR(100) NOT NULL,
    SifreHash    NVARCHAR(255) NOT NULL,               -- Şifre düz metin saklanmaz!
    Rol          NVARCHAR(10)  NOT NULL,               -- 'Hasta', 'Doktor', 'Admin'
    IlgiliID     INT           NULL,                   -- HastaID veya DoktorID bağlantısı
    OlusturmaTarihi DATETIME   NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_Kullaniciler PRIMARY KEY (KullaniciID),
    CONSTRAINT UQ_Kullaniciler_Email UNIQUE (Email),
    CONSTRAINT CK_Kullaniciler_Rol CHECK (Rol IN ('Hasta', 'Doktor', 'Admin'))
);

-- Hastalar tablosundan SifreHash kaldır (artık Kullaniciler tablosunda)
ALTER TABLE Hastalar DROP COLUMN SifreHash;
