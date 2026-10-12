-- Equipos e integrantes (general §4.4 y §5.2). `orden` es una secuencia de
-- creación para desempatar el reparto equilibrado (nucleo §8.3).

-- CreateTable
CREATE TABLE "equipos" (
    "id_equipo" TEXT NOT NULL,
    "id_actividad" TEXT NOT NULL,
    "nombre" CITEXT NOT NULL,
    "descripcion_actividad" TEXT,
    "forma_de_trabajo" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orden" SERIAL NOT NULL,

    CONSTRAINT "equipos_pkey" PRIMARY KEY ("id_equipo")
);

-- CreateTable
CREATE TABLE "integrantes_equipo" (
    "id_equipo" TEXT NOT NULL,
    "id_membresia" TEXT NOT NULL,

    CONSTRAINT "integrantes_equipo_pkey" PRIMARY KEY ("id_equipo","id_membresia")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipos_id_actividad_nombre_key" ON "equipos"("id_actividad", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "integrantes_equipo_id_membresia_key" ON "integrantes_equipo"("id_membresia");

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_id_actividad_fkey" FOREIGN KEY ("id_actividad") REFERENCES "actividades"("id_actividad") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrantes_equipo" ADD CONSTRAINT "integrantes_equipo_id_equipo_fkey" FOREIGN KEY ("id_equipo") REFERENCES "equipos"("id_equipo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrantes_equipo" ADD CONSTRAINT "integrantes_equipo_id_membresia_fkey" FOREIGN KEY ("id_membresia") REFERENCES "membresias"("id_membresia") ON DELETE CASCADE ON UPDATE CASCADE;

