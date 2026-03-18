-- Add nisn column to User table
ALTER TABLE `User` ADD COLUMN `nisn` VARCHAR(191) NULL;
ALTER TABLE `User` ADD UNIQUE INDEX `User_nisn_key`(`nisn`);

-- Create StudentNISN table
CREATE TABLE `StudentNISN` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nisn` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `StudentNISN_nisn_key`(`nisn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
