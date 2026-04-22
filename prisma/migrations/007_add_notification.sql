-- 007: Buat tabel Notification dan tambah kolom image pada Book
ALTER TABLE `Book` ADD COLUMN IF NOT EXISTS `image` VARCHAR(191) NULL;

CREATE TABLE `Notification` (
    `id`        INTEGER NOT NULL AUTO_INCREMENT,
    `userId`    INTEGER NOT NULL,
    `title`     VARCHAR(191) NOT NULL,
    `message`   TEXT NOT NULL,
    `type`      VARCHAR(191) NOT NULL,
    -- BORROW_APPROVED | BORROW_REJECTED | PICKUP_REMINDER | GENERAL
    `isRead`    BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Notification`
    ADD CONSTRAINT `Notification_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
