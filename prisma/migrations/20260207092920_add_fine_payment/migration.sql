/*
  Warnings:

  - You are about to drop the column `returnDate` on the `Borrowing` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Borrowing` DROP COLUMN `returnDate`,
    ADD COLUMN `actualReturnDate` DATETIME(3) NULL,
    ADD COLUMN `condition` VARCHAR(191) NULL,
    ADD COLUMN `damageFee` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `dueDate` DATETIME(3) NULL,
    ADD COLUMN `isPaid` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `lateFee` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `totalFine` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `Payment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `borrowingId` INTEGER NOT NULL,
    `amount` INTEGER NOT NULL,
    `amountPaid` INTEGER NOT NULL,
    `change` INTEGER NOT NULL,
    `paidAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paidById` INTEGER NOT NULL,

    UNIQUE INDEX `Payment_borrowingId_key`(`borrowingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_borrowingId_fkey` FOREIGN KEY (`borrowingId`) REFERENCES `Borrowing`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_paidById_fkey` FOREIGN KEY (`paidById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
