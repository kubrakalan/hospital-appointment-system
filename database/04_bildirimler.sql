-- ============================================================
-- TABLO: Bildirimler
-- Randevu durumu değişince hasta bu tablodan bildirim alır.
-- ============================================================

CREATE TABLE Bildirimler (
    BildirimID      INT           NOT NULL IDENTITY(1,1),
    KullaniciID     INT           NOT NULL,               -- Bildirimi alacak kullanıcı
    Mesaj           NVARCHAR(255) NOT NULL,
    Okundu          BIT           NOT NULL DEFAULT 0,
    OlusturmaTarihi DATETIME      NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_Bildirimler PRIMARY KEY (BildirimID),
    CONSTRAINT FK_Bildirimler_Kullanici FOREIGN KEY (KullaniciID)
        REFERENCES Kullaniciler(KullaniciID) ON DELETE CASCADE
);
