-- Puntajes capturados (docs/diseno-desarrollo-general.md §4.4; nucleo §10.3):
-- uno por persona e instrumento que no se puntúa solo.

-- CreateTable
CREATE TABLE "puntajes_capturados" (
    "id_puntaje" TEXT NOT NULL,
    "id_instrumento" TEXT NOT NULL,
    "id_membresia" TEXT NOT NULL,
    "valor" DECIMAL(5,2) NOT NULL,
    "id_membresia_calificador" TEXT NOT NULL,
    "fecha_asignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "puntajes_capturados_pkey" PRIMARY KEY ("id_puntaje")
);

-- CreateIndex
CREATE INDEX "puntajes_capturados_id_membresia_idx" ON "puntajes_capturados"("id_membresia");

-- CreateIndex
CREATE UNIQUE INDEX "puntajes_capturados_id_instrumento_id_membresia_key" ON "puntajes_capturados"("id_instrumento", "id_membresia");

-- AddForeignKey
ALTER TABLE "puntajes_capturados" ADD CONSTRAINT "puntajes_capturados_id_instrumento_fkey" FOREIGN KEY ("id_instrumento") REFERENCES "instrumentos"("id_instrumento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puntajes_capturados" ADD CONSTRAINT "puntajes_capturados_id_membresia_fkey" FOREIGN KEY ("id_membresia") REFERENCES "membresias"("id_membresia") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puntajes_capturados" ADD CONSTRAINT "puntajes_capturados_id_membresia_calificador_fkey" FOREIGN KEY ("id_membresia_calificador") REFERENCES "membresias"("id_membresia") ON DELETE CASCADE ON UPDATE CASCADE;

