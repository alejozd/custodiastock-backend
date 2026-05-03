/*
  Warnings:

  - You are about to drop the column `codigo` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `Usuario` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[numeroDocumento]` on the table `Entrega` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[reference]` on the table `Producto` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `Usuario` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `numeroDocumento` to the `Entrega` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reference` to the `Producto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fullName` to the `Usuario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `Usuario` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `Producto_codigo_key` ON `Producto`;

-- AlterTable
ALTER TABLE `DetalleEntrega` ADD COLUMN `eliminadoEn` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Entrega` ADD COLUMN `anuladoEn` DATETIME(3) NULL,
    ADD COLUMN `anuladoPorId` INTEGER NULL,
    ADD COLUMN `eliminadoEn` DATETIME(3) NULL,
    ADD COLUMN `estado` ENUM('ACTIVE', 'CANCELED') NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN `fechaEntrega` DATETIME(3) NULL,
    ADD COLUMN `motivoAnulacion` VARCHAR(191) NULL,
    ADD COLUMN `numeroDocumento` VARCHAR(20) NOT NULL;

-- AlterTable
ALTER TABLE `Producto` DROP COLUMN `codigo`,
    ADD COLUMN `activo` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `eliminadoEn` DATETIME(3) NULL,
    ADD COLUMN `reference` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Usuario` DROP COLUMN `nombre`,
    ADD COLUMN `activo` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `eliminadoEn` DATETIME(3) NULL,
    ADD COLUMN `fullName` VARCHAR(191) NOT NULL,
    ADD COLUMN `rol` ENUM('OPERATOR', 'ADMIN') NOT NULL DEFAULT 'OPERATOR',
    ADD COLUMN `username` VARCHAR(191) NOT NULL,
    MODIFY `email` VARCHAR(191) NULL;

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

-- CreateIndex
CREATE UNIQUE INDEX `Entrega_numeroDocumento_key` ON `Entrega`(`numeroDocumento`);

-- CreateIndex
CREATE UNIQUE INDEX `Producto_reference_key` ON `Producto`(`reference`);

-- CreateIndex
CREATE UNIQUE INDEX `Usuario_username_key` ON `Usuario`(`username`);

-- AddForeignKey
ALTER TABLE `Entrega` ADD CONSTRAINT `Entrega_anuladoPorId_fkey` FOREIGN KEY (`anuladoPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Entrada` ADD CONSTRAINT `Entrada_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Entrada` ADD CONSTRAINT `Entrada_anuladoPorId_fkey` FOREIGN KEY (`anuladoPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetalleEntrada` ADD CONSTRAINT `DetalleEntrada_entradaId_fkey` FOREIGN KEY (`entradaId`) REFERENCES `Entrada`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetalleEntrada` ADD CONSTRAINT `DetalleEntrada_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
