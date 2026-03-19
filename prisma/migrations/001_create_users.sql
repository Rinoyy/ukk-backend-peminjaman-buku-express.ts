-- 001: Buat tabel User
CREATE TABLE `User` (
    `id`        INTEGER NOT NULL AUTO_INCREMENT,
    `username`  VARCHAR(191) NOT NULL,
    `nisn`      VARCHAR(191) NULL,
    `password`  VARCHAR(191) NOT NULL,
    `role`      VARCHAR(191) NOT NULL,  -- ADMIN | PETUGAS | SISWA
    `qrCode`    TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_nisn_key`(`nisn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
