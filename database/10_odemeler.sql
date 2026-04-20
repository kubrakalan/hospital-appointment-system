-- ============================================================
-- ÖDEME / FATURA TABLOSU
-- Her randevuya ait ödeme kaydı tutulur
-- ============================================================
CREATE TABLE Odemeler (
    OdemeID         INT             NOT NULL IDENTITY(1,1),
    RandevuID       INT             NOT NULL,
    Tutar           DECIMAL(10,2)   NOT NULL,
    Durum           NVARCHAR(20)    NOT NULL DEFAULT 'Bekliyor',  -- Bekliyor / Ödendi / İptal
    OdemeYontemi    NVARCHAR(30)    NOT NULL DEFAULT 'Nakit',     -- Nakit / Kredi Kartı / Sigorta / SGK
    Notlar          NVARCHAR(500)   NULL,
    OdemeTarihi     DATETIME        NULL,                          -- Ne zaman ödendi
    OlusturmaTarihi DATETIME        NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_Odemeler PRIMARY KEY (OdemeID),
    CONSTRAINT FK_Odemeler_Randevular
        FOREIGN KEY (RandevuID) REFERENCES Randevular(RandevuID),
    CONSTRAINT CK_Odemeler_Durum
        CHECK (Durum IN ('Bekliyor', 'Ödendi', 'İptal')),
    CONSTRAINT CK_Odemeler_Yontem
        CHECK (OdemeYontemi IN ('Nakit', 'Kredi Kartı', 'Sigorta', 'SGK'))
);
GO

-- OdemeTarihi otomatik set etmek için trigger
CREATE TRIGGER TR_Odemeler_OdemeTarihi
ON Odemeler
AFTER UPDATE
AS
BEGIN
    UPDATE Odemeler
    SET OdemeTarihi = GETDATE()
    FROM Odemeler o
    JOIN inserted i ON o.OdemeID = i.OdemeID
    WHERE i.Durum = 'Ödendi' AND o.OdemeTarihi IS NULL;
END;
GO
