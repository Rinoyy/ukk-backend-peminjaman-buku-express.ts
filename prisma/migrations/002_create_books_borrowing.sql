-- 002: Buat tabel Book dan Borrowing awal
CREATE TABLE `Book` (
    `id`          INTEGER NOT NULL AUTO_INCREMENT,
    `title`       VARCHAR(191) NOT NULL,
    `author`      VARCHAR(191) NOT NULL,
    `categoryId`  INTEGER NULL,
    `description` TEXT NULL,
    `image`       VARCHAR(191) NULL,
    `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`   DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Borrowing` (
    `id`               INTEGER NOT NULL AUTO_INCREMENT,
    `userId`           INTEGER NOT NULL,
    `bookCopyId`       INTEGER NOT NULL,
    `status`           VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    -- PENDING | BORROWED | RETURN_PENDING | RETURNED | REJECTED | CANCELLED
    `borrowDate`       DATETIME(3) NULL,
    `dueDate`          DATETIME(3) NULL,
    `actualReturnDate` DATETIME(3) NULL,
    `condition`        VARCHAR(191) NULL,    -- GOOD | DAMAGED | LOST
    `rejectReason`     VARCHAR(191) NULL,
    `lateFee`          INTEGER NOT NULL DEFAULT 0,
    `damageFee`        INTEGER NOT NULL DEFAULT 0,
    `totalFine`        INTEGER NOT NULL DEFAULT 0,
    `isPickedUp`       BOOLEAN NOT NULL DEFAULT false,
    `isPaid`           BOOLEAN NOT NULL DEFAULT false,
    `createdAt`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`        DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Borrowing`
    ADD CONSTRAINT `Borrowing_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
