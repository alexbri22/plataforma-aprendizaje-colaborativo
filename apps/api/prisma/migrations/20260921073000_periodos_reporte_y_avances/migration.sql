-- El reporte de trabajo deja de ser una función de seguimiento: pasa a ser el
-- elemento `avances` de `espacio_equipo`, con su calendario en
-- `periodos_reporte`. Se borran las filas de configuración que aún apuntan a
-- la función retirada; sin esto, quitar el valor del enum falla en cualquier
-- base con actividades ya creadas. El historial no se toca: sus eventos
-- guardan el nombre de la función como texto en `datos`.
DELETE FROM "configuracion_funciones" WHERE "funcion" = 'reporte_trabajo';

-- CreateEnum
CREATE TYPE "estado_periodo" AS ENUM ('activo', 'cancelado');

-- AlterEnum
BEGIN;
CREATE TYPE "funcion_seguimiento_new" AS ENUM ('formacion_equipos', 'bitacora_individual', 'calificacion', 'autoevaluacion_individual', 'autoevaluacion_grupal', 'evaluacion_pares', 'espacio_equipo', 'insignias');
ALTER TABLE "configuracion_funciones" ALTER COLUMN "funcion" TYPE "funcion_seguimiento_new" USING ("funcion"::text::"funcion_seguimiento_new");
ALTER TYPE "funcion_seguimiento" RENAME TO "funcion_seguimiento_old";
ALTER TYPE "funcion_seguimiento_new" RENAME TO "funcion_seguimiento";
DROP TYPE "public"."funcion_seguimiento_old";
COMMIT;

-- CreateTable
CREATE TABLE "periodos_reporte" (
    "id_periodo" TEXT NOT NULL,
    "id_actividad" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "estado" "estado_periodo" NOT NULL DEFAULT 'activo',

    CONSTRAINT "periodos_reporte_pkey" PRIMARY KEY ("id_periodo")
);

-- CreateIndex
CREATE UNIQUE INDEX "periodos_reporte_id_actividad_orden_key" ON "periodos_reporte"("id_actividad", "orden");

-- AddForeignKey
ALTER TABLE "periodos_reporte" ADD CONSTRAINT "periodos_reporte_id_actividad_fkey" FOREIGN KEY ("id_actividad") REFERENCES "actividades"("id_actividad") ON DELETE CASCADE ON UPDATE CASCADE;

