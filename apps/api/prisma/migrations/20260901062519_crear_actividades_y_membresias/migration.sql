-- CreateEnum
CREATE TYPE "estado_actividad" AS ENUM ('configuracion', 'inscripcion', 'formacion_equipos', 'desarrollo', 'cierre', 'archivada');

-- CreateEnum
CREATE TYPE "rol_membresia" AS ENUM ('organizador', 'co_organizador', 'participante');

-- CreateEnum
CREATE TYPE "estado_membresia" AS ENUM ('activa', 'desactivada');

-- CreateTable
CREATE TABLE "actividades" (
    "id_actividad" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "objetivo" TEXT NOT NULL,
    "informacion_general" TEXT NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_termino" TIMESTAMP(3) NOT NULL,
    "fecha_limite_inscripcion" TIMESTAMP(3) NOT NULL,
    "plazo_cierre_dias" INTEGER NOT NULL,
    "numero_equipos_esperado" INTEGER NOT NULL,
    "estado" "estado_actividad" NOT NULL DEFAULT 'inscripcion',
    "clave_ingreso" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actividades_pkey" PRIMARY KEY ("id_actividad")
);

-- CreateTable
CREATE TABLE "membresias" (
    "id_membresia" TEXT NOT NULL,
    "id_actividad" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "rol" "rol_membresia" NOT NULL,
    "estado" "estado_membresia" NOT NULL DEFAULT 'activa',
    "fecha_union" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membresias_pkey" PRIMARY KEY ("id_membresia")
);

-- CreateIndex
CREATE UNIQUE INDEX "actividades_clave_ingreso_key" ON "actividades"("clave_ingreso");

-- CreateIndex
CREATE UNIQUE INDEX "membresias_id_actividad_id_usuario_key" ON "membresias"("id_actividad", "id_usuario");

-- AddForeignKey
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_id_actividad_fkey" FOREIGN KEY ("id_actividad") REFERENCES "actividades"("id_actividad") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;
