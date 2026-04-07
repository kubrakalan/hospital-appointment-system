-- ============================================================
-- Tıbbi Bilgiler tablosu
-- Her randevu için doktor tarafından doldurulan serbest metin kaydı
-- ============================================================
USE HastaneDB;

CREATE TABLE TibbiBilgiler (
    TibbiBilgiID    INT           IDENTITY(1,1) PRIMARY KEY,
    RandevuID       INT           NOT NULL UNIQUE,   -- 1 randevu = 1 kayıt
    Tani            NVARCHAR(MAX) NULL,              -- Konulan tanı
    UygulananIslem  NVARCHAR(MAX) NULL,              -- Yapılan işlem / tedavi
    Recete          NVARCHAR(MAX) NULL,              -- Yazılan ilaçlar
    LabNotu         NVARCHAR(MAX) NULL,              -- Lab / tahlil notları (serbest metin)
    DoktorNotu      NVARCHAR(MAX) NULL,              -- Doktora özel not (hastaya gösterilmez)
    SonrakiKontrol  DATE          NULL,              -- Bir sonraki kontrol tarihi
    OlusturmaTarihi DATETIME      NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_TibbiBilgiler_Randevular
        FOREIGN KEY (RandevuID) REFERENCES Randevular(RandevuID)
        ON DELETE CASCADE
);
GO

-- Doktorun kendi randevularını sorgularken JOIN yapabilmesi için index
CREATE INDEX IX_TibbiBilgiler_RandevuID ON TibbiBilgiler(RandevuID);
GO
