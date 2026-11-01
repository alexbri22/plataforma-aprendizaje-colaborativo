-- CreateEnum
CREATE TYPE "tipo_entidad_comentario" AS ENUM ('elemento_espacio_equipo', 'bitacora');

-- CreateTable
CREATE TABLE "bitacoras" (
    "id_entrada" TEXT NOT NULL,
    "id_membresia" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bitacoras_pkey" PRIMARY KEY ("id_entrada")
);

-- CreateTable
CREATE TABLE "comentarios" (
    "id_comentario" TEXT NOT NULL,
    "id_membresia_autor" TEXT NOT NULL,
    "tipo_entidad" "tipo_entidad_comentario" NOT NULL,
    "id_entidad" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comentarios_pkey" PRIMARY KEY ("id_comentario")
);

-- CreateIndex
CREATE INDEX "bitacoras_id_membresia_idx" ON "bitacoras"("id_membresia");

-- CreateIndex
CREATE INDEX "comentarios_tipo_entidad_id_entidad_idx" ON "comentarios"("tipo_entidad", "id_entidad");

-- AddForeignKey
ALTER TABLE "bitacoras" ADD CONSTRAINT "bitacoras_id_membresia_fkey" FOREIGN KEY ("id_membresia") REFERENCES "membresias"("id_membresia") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_id_membresia_autor_fkey" FOREIGN KEY ("id_membresia_autor") REFERENCES "membresias"("id_membresia") ON DELETE CASCADE ON UPDATE CASCADE;
