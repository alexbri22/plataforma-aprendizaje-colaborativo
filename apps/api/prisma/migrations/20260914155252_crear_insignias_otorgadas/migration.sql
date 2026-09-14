-- CreateEnum
CREATE TYPE "fuente_otorgamiento" AS ENUM ('par', 'organizador', 'sistema');

-- CreateTable
CREATE TABLE "insignias_otorgadas" (
    "id_otorgamiento" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "id_membresia_otorgante" TEXT,
    "id_membresia_receptor" TEXT NOT NULL,
    "fuente" "fuente_otorgamiento" NOT NULL,
    "puntos" DOUBLE PRECISION NOT NULL,
    "frase" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insignias_otorgadas_pkey" PRIMARY KEY ("id_otorgamiento")
);

-- CreateIndex
CREATE INDEX "insignias_otorgadas_id_membresia_receptor_idx" ON "insignias_otorgadas"("id_membresia_receptor");

-- CreateIndex
CREATE UNIQUE INDEX "insignias_otorgadas_categoria_id_membresia_otorgante_id_mem_key" ON "insignias_otorgadas"("categoria", "id_membresia_otorgante", "id_membresia_receptor");

-- AddForeignKey
ALTER TABLE "insignias_otorgadas" ADD CONSTRAINT "insignias_otorgadas_id_membresia_otorgante_fkey" FOREIGN KEY ("id_membresia_otorgante") REFERENCES "membresias"("id_membresia") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insignias_otorgadas" ADD CONSTRAINT "insignias_otorgadas_id_membresia_receptor_fkey" FOREIGN KEY ("id_membresia_receptor") REFERENCES "membresias"("id_membresia") ON DELETE CASCADE ON UPDATE CASCADE;
