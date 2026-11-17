-- Respuestas a las plantillas de instrumento (docs/diseno-desarrollo-general.md
-- §4.4; nucleo §10.1): una fila por reactivo respondido.

-- CreateTable
CREATE TABLE "respuestas_instrumento" (
    "id_respuesta" TEXT NOT NULL,
    "id_instrumento" TEXT NOT NULL,
    "id_membresia_autor" TEXT NOT NULL,
    "clave_reactivo" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "respuestas_instrumento_pkey" PRIMARY KEY ("id_respuesta")
);

-- CreateIndex
CREATE INDEX "respuestas_instrumento_id_membresia_autor_idx" ON "respuestas_instrumento"("id_membresia_autor");

-- CreateIndex
CREATE UNIQUE INDEX "respuestas_instrumento_id_instrumento_id_membresia_autor_cl_key" ON "respuestas_instrumento"("id_instrumento", "id_membresia_autor", "clave_reactivo");

-- AddForeignKey
ALTER TABLE "respuestas_instrumento" ADD CONSTRAINT "respuestas_instrumento_id_instrumento_fkey" FOREIGN KEY ("id_instrumento") REFERENCES "instrumentos"("id_instrumento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestas_instrumento" ADD CONSTRAINT "respuestas_instrumento_id_membresia_autor_fkey" FOREIGN KEY ("id_membresia_autor") REFERENCES "membresias"("id_membresia") ON DELETE CASCADE ON UPDATE CASCADE;

