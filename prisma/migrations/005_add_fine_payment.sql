-- 005: Buat tabel Payment untuk pencatatan pembayaran denda
CREATE TABLE `Payment` (
    `id`          INTEGER NOT NULL AUTO_INCREMENT,
    `borrowingId` INTEGER NOT NULL,
    `amount`      INTEGER NOT NULL,   -- Total denda yang harus dibayar
    `amountPaid`  INTEGER NOT NULL,   -- Nominal yang dibayarkan siswa
    `change`      INTEGER NOT NULL,   -- Kembalian (amountPaid - amount)
    `paidAt`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paidById`    INTEGER NOT NULL,   -- Admin/Petugas yang memproses

    UNIQUE INDEX `Payment_borrowingId_key`(`borrowingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Payment`
    ADD CONSTRAINT `Payment_borrowingId_fkey`
    FOREIGN KEY (`borrowingId`) REFERENCES `Borrowing`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Payment`
    ADD CONSTRAINT `Payment_paidById_fkey`
    FOREIGN KEY (`paidById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
