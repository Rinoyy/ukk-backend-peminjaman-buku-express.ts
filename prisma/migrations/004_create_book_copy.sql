-- 004: Buat tabel BookCopy (eksemplar fisik buku)
CREATE TABLE `BookCopy` (
    `id`         INTEGER NOT NULL AUTO_INCREMENT,
    `bookId`     INTEGER NOT NULL,
    `copyNumber` INTEGER NOT NULL,
    `qrCode`     TEXT NULL,
    `status`     VARCHAR(191) NOT NULL DEFAULT 'AVAILABLE',
    -- AVAILABLE | RESERVED | BORROWED | DAMAGED | LOST
    `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`  DATETIME(3) NOT NULL,

    UNIQUE INDEX `BookCopy_bookId_copyNumber_key`(`bookId`, `copyNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `BookCopy`
    ADD CONSTRAINT `BookCopy_bookId_fkey`
    FOREIGN KEY (`bookId`) REFERENCES `Book`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Borrowing`
    ADD CONSTRAINT `Borrowing_bookCopyId_fkey`
    FOREIGN KEY (`bookCopyId`) REFERENCES `BookCopy`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
