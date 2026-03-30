-- ============================================================
-- Hastalar tablosuna yeni sağlık ve acil iletişim alanları ekle
-- ============================================================
USE HastaneDB;

ALTER TABLE Hastalar
    ADD KanGrubu          NVARCHAR(5)   NULL,   -- 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'
        KronikHastaliklar NVARCHAR(500) NULL,   -- 'Diyabet, Tansiyon' gibi
        Alerjiler         NVARCHAR(500) NULL,   -- 'Penisilin, Polen' gibi
        SurekliIlaclar    NVARCHAR(500) NULL,   -- 'Metformin 500mg' gibi
        AcilKisiAd        NVARCHAR(100) NULL,   -- Acil durumda aranacak kişi
        AcilKisiTelefon   NVARCHAR(20)  NULL,   -- Acil kişi telefonu
        Adres             NVARCHAR(500) NULL;   -- Ev adresi
