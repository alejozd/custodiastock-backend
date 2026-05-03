-- CreateTable
CREATE TABLE `Usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `rol` ENUM('OPERATOR', 'ADMIN') NOT NULL DEFAULT 'OPERATOR',
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `eliminadoEn` DATETIME(3) NULL,

    UNIQUE INDEX `Usuario_username_key`(`username`),
    UNIQUE INDEX `Usuario_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Producto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `eliminadoEn` DATETIME(3) NULL,

    UNIQUE INDEX `Producto_reference_key`(`reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Entrega` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numeroDocumento` VARCHAR(20) NOT NULL,
    `entregadorId` INTEGER NOT NULL,
    `receptorId` INTEGER NOT NULL,
    `firma` LONGTEXT NOT NULL,
    `estado` ENUM('ACTIVE', 'CANCELED') NOT NULL DEFAULT 'ACTIVE',
    `anuladoEn` DATETIME(3) NULL,
    `anuladoPorId` INTEGER NULL,
    `motivoAnulacion` VARCHAR(191) NULL,
    `fechaEntrega` DATETIME(3) NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `eliminadoEn` DATETIME(3) NULL,

    UNIQUE INDEX `Entrega_numeroDocumento_key`(`numeroDocumento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetalleEntrega` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `entregaId` INTEGER NOT NULL,
    `productoId` INTEGER NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `eliminadoEn` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Entrada` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numeroDocumento` VARCHAR(20) NOT NULL,
    `documentoOrigen` VARCHAR(50) NULL,
    `usuarioId` INTEGER NOT NULL,
    `estado` ENUM('ACTIVE', 'CANCELED') NOT NULL DEFAULT 'ACTIVE',
    `anuladoEn` DATETIME(3) NULL,
    `anuladoPorId` INTEGER NULL,
    `motivoAnulacion` VARCHAR(191) NULL,
    `fechaEntrada` DATETIME(3) NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `eliminadoEn` DATETIME(3) NULL,

    UNIQUE INDEX `Entrada_numeroDocumento_key`(`numeroDocumento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetalleEntrada` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `entradaId` INTEGER NOT NULL,
    `productoId` INTEGER NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `eliminadoEn` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Secuencia` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `prefijo` VARCHAR(191) NOT NULL DEFAULT '',
    `siguienteNumero` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `Secuencia_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `License` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nit` VARCHAR(191) NOT NULL,
    `installationHash` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING_ACTIVATION', 'ACTIVE', 'BLOCKED') NOT NULL DEFAULT 'PENDING_ACTIVATION',
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

-- AddForeignKey
ALTER TABLE `Entrega` ADD CONSTRAINT `Entrega_entregadorId_fkey` FOREIGN KEY (`entregadorId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Entrega` ADD CONSTRAINT `Entrega_receptorId_fkey` FOREIGN KEY (`receptorId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Entrega` ADD CONSTRAINT `Entrega_anuladoPorId_fkey` FOREIGN KEY (`anuladoPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetalleEntrega` ADD CONSTRAINT `DetalleEntrega_entregaId_fkey` FOREIGN KEY (`entregaId`) REFERENCES `Entrega`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetalleEntrega` ADD CONSTRAINT `DetalleEntrega_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Entrada` ADD CONSTRAINT `Entrada_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Entrada` ADD CONSTRAINT `Entrada_anuladoPorId_fkey` FOREIGN KEY (`anuladoPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetalleEntrada` ADD CONSTRAINT `DetalleEntrada_entradaId_fkey` FOREIGN KEY (`entradaId`) REFERENCES `Entrada`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetalleEntrada` ADD CONSTRAINT `DetalleEntrada_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
