-- CreateEnum
CREATE TABLE `License` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nit` VARCHAR(191) NOT NULL,
    `installationHash` VARCHAR(191) NOT NULL,
    `status` ENUM('DEMO', 'ACTIVE', 'BLOCKED', 'EXPIRED') NOT NULL DEFAULT 'DEMO',
    `licenseType` ENUM('DEMO', 'ANNUAL', 'PERMANENT') NOT NULL DEFAULT 'DEMO',
    `activationDate` DATETIME(3) NULL,
    `expirationDate` DATETIME(3) NULL,
    `lastValidation` DATETIME(3) NULL,
    `offlineGraceUntil` DATETIME(3) NULL,
    `licenseToken` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `License_installationHash_key`(`installationHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
