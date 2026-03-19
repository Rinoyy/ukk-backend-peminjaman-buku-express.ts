-- 003: Buat tabel Category dan Visit
CREATE TABLE `Category` (
    `id`          INTEGER NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`   DATETIME(3) NOT NULL,

    UNIQUE INDEX `Category_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Visit` (
    `id`           INTEGER NOT NULL AUTO_INCREMENT,
    `userId`       INTEGER NOT NULL,
    `visitDate`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `checkoutDate` DATETIME(3) NULL,
    `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Book`
    ADD CONSTRAINT `Book_categoryId_fkey`
    FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Visit`
    ADD CONSTRAINT `Visit_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
