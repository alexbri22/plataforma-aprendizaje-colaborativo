-- CreateEnum
CREATE TYPE "tipo_elemento" AS ENUM ('meta', 'avance', 'recurso');

-- CreateTable
CREATE TABLE "elementos_espacio_equipo" (
    "id_elemento" TEXT NOT NULL,
    "id_equipo" TEXT NOT NULL,
    "tipo_elemento" "tipo_elemento" NOT NULL,
    "contenido" TEXT NOT NULL,
    "id_membresia_autor" TEXT NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "elementos_espacio_equipo_pkey" PRIMARY KEY ("id_elemento")
);

-- CreateIndex
CREATE INDEX "elementos_espacio_equipo_id_equipo_tipo_elemento_idx" ON "elementos_espacio_equipo"("id_equipo", "tipo_elemento");

-- AddForeignKey
ALTER TABLE "elementos_espacio_equipo" ADD CONSTRAINT "elementos_espacio_equipo_id_equipo_fkey" FOREIGN KEY ("id_equipo") REFERENCES "equipos"("id_equipo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "elementos_espacio_equipo" ADD CONSTRAINT "elementos_espacio_equipo_id_membresia_autor_fkey" FOREIGN KEY ("id_membresia_autor") REFERENCES "membresias"("id_membresia") ON DELETE CASCADE ON UPDATE CASCADE;
