-- AlterTable
-- Privado por defecto, también para las cuentas existentes: nadie aceptó
-- mostrar su correo, así que no se asume que quiera hacerlo.
ALTER TABLE "usuarios" ADD COLUMN     "correo_publico" BOOLEAN NOT NULL DEFAULT false;
