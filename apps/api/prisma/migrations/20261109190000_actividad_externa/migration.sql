-- La captura manual deja de ser un formato que se elige (nucleo §10.1): una
-- instancia del proceso colaborativo es plantilla o actividad externa con
-- enlace. Las que estaban en manual pasan a enlace, todavía sin enlace.
-- Proyecto y bitácora conservan manual: nadie elige su formato.
UPDATE "instrumentos" i SET "origen" = 'enlace'
  FROM "aspectos_calificacion" a, "componentes_calificacion" c
  WHERE i."id_aspecto" = a."id_aspecto" AND a."id_componente" = c."id_componente"
    AND c."clave" = 'proceso' AND i."origen" = 'manual';

-- Entregas de las actividades externas.
-- CreateTable
CREATE TABLE "entregas_instrumento" (
    "id_entrega" TEXT NOT NULL,
    "id_instrumento" TEXT NOT NULL,
    "id_membresia" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "enlace" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entregas_instrumento_pkey" PRIMARY KEY ("id_entrega")
);

-- CreateTable
CREATE TABLE "archivos_entrega" (
    "id_entrega" TEXT NOT NULL,
    "contenido" BYTEA NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "subido_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivos_entrega_pkey" PRIMARY KEY ("id_entrega")
);

-- CreateIndex
CREATE INDEX "entregas_instrumento_id_membresia_idx" ON "entregas_instrumento"("id_membresia");

-- CreateIndex
CREATE UNIQUE INDEX "entregas_instrumento_id_instrumento_id_membresia_key" ON "entregas_instrumento"("id_instrumento", "id_membresia");

-- AddForeignKey
ALTER TABLE "entregas_instrumento" ADD CONSTRAINT "entregas_instrumento_id_instrumento_fkey" FOREIGN KEY ("id_instrumento") REFERENCES "instrumentos"("id_instrumento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas_instrumento" ADD CONSTRAINT "entregas_instrumento_id_membresia_fkey" FOREIGN KEY ("id_membresia") REFERENCES "membresias"("id_membresia") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos_entrega" ADD CONSTRAINT "archivos_entrega_id_entrega_fkey" FOREIGN KEY ("id_entrega") REFERENCES "entregas_instrumento"("id_entrega") ON DELETE CASCADE ON UPDATE CASCADE;

