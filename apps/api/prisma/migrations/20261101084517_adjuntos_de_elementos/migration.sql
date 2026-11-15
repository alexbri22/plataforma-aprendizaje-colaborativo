-- AlterTable
ALTER TABLE "elementos_espacio_equipo" ADD COLUMN     "enlace" TEXT;

-- CreateTable
CREATE TABLE "archivos_elemento" (
    "id_elemento" TEXT NOT NULL,
    "contenido" BYTEA NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "subido_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivos_elemento_pkey" PRIMARY KEY ("id_elemento")
);

-- AddForeignKey
ALTER TABLE "archivos_elemento" ADD CONSTRAINT "archivos_elemento_id_elemento_fkey" FOREIGN KEY ("id_elemento") REFERENCES "elementos_espacio_equipo"("id_elemento") ON DELETE CASCADE ON UPDATE CASCADE;
