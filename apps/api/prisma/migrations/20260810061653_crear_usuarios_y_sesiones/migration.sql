-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateEnum
CREATE TYPE "nivel_estudios" AS ENUM ('primaria', 'secundaria', 'preparatoria_o_bachillerato', 'licenciatura', 'posgrado', 'otro');

-- CreateEnum
CREATE TYPE "tipo_cuenta" AS ENUM ('usuario', 'administrador');

-- CreateEnum
CREATE TYPE "estado_cuenta" AS ENUM ('activa', 'desactivada');

-- CreateTable
CREATE TABLE "usuarios" (
    "id_usuario" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido_paterno" TEXT NOT NULL,
    "apellido_materno" TEXT NOT NULL,
    "nivel_estudios" "nivel_estudios" NOT NULL,
    "institucion_educativa" TEXT NOT NULL,
    "correo" CITEXT NOT NULL,
    "contrasena" TEXT NOT NULL,
    "tipo_cuenta" "tipo_cuenta" NOT NULL DEFAULT 'usuario',
    "estado_cuenta" "estado_cuenta" NOT NULL DEFAULT 'activa',
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "sesiones" (
    "id_sesion" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultima_actividad" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id_sesion")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE INDEX "sesiones_id_usuario_idx" ON "sesiones"("id_usuario");

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;
