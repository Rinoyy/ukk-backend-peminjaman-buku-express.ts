/*
  Warnings:

  - You are about to drop the column `qrCode` on the `Book` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `Book` table. All the data in the column will be lost.
  - You are about to drop the column `bookId` on the `Borrowing` table. All the data in the column will be lost.
  - Added the required column `bookCopyId` to the `Borrowing` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Borrowing` DROP FOREIGN KEY `Borrowing_bookId_fkey`;

-- DropIndex
DROP INDEX `Borrowing_bookId_fkey` ON `Borrowing`;

-- AlterTable
ALTER TABLE `Book` DROP COLUMN `qrCode`,
    DROP COLUMN `stock`;

-- AlterTable
ALTER TABLE `Borrowing` DROP COLUMN `bookId`,
    ADD COLUMN `bookCopyId` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `BookCopy` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookId` INTEGER NOT NULL,
    `copyNumber` INTEGER NOT NULL,
    `qrCode` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'AVAILABLE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BookCopy_bookId_copyNumber_key`(`bookId`, `copyNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BookCopy` ADD CONSTRAINT `BookCopy_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `Book`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Borrowing` ADD CONSTRAINT `Borrowing_bookCopyId_fkey` FOREIGN KEY (`bookCopyId`) REFERENCES `BookCopy`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
