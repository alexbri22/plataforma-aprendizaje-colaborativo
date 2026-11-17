-- Calificación ponderada (docs/diseno-desarrollo-general.md §4.2, §6.2).
--
-- 1. Las autoevaluaciones dejan de ser funciones: son instrumentos de los
--    aspectos del proceso colaborativo. La calificación pierde los modos
--    directo y rúbrica. Ningún módulo había escrito datos de ellas.
DELETE FROM "configuracion_funciones"
  WHERE "funcion" IN ('autoevaluacion_individual', 'autoevaluacion_grupal');
UPDATE "configuracion_funciones" SET "estado" = 'habilitada'
  WHERE "funcion" = 'calificacion' AND "estado" IN ('directa', 'rubrica');

-- CreateEnum
CREATE TYPE "origen_instrumento" AS ENUM ('plantilla', 'enlace', 'manual');

-- AlterEnum
BEGIN;
CREATE TYPE "funcion_seguimiento_new" AS ENUM ('formacion_equipos', 'bitacora_individual', 'calificacion', 'evaluacion_pares', 'espacio_equipo', 'insignias');
ALTER TABLE "configuracion_funciones" ALTER COLUMN "funcion" TYPE "funcion_seguimiento_new" USING ("funcion"::text::"funcion_seguimiento_new");
ALTER TYPE "funcion_seguimiento" RENAME TO "funcion_seguimiento_old";
ALTER TYPE "funcion_seguimiento_new" RENAME TO "funcion_seguimiento";
DROP TYPE "public"."funcion_seguimiento_old";
COMMIT;

-- CreateTable
CREATE TABLE "componentes_calificacion" (
    "id_componente" TEXT NOT NULL,
    "id_actividad" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "peso" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "componentes_calificacion_pkey" PRIMARY KEY ("id_componente")
);

-- CreateTable
CREATE TABLE "aspectos_calificacion" (
    "id_aspecto" TEXT NOT NULL,
    "id_componente" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "peso" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "aspectos_calificacion_pkey" PRIMARY KEY ("id_aspecto")
);

-- CreateTable
CREATE TABLE "instrumentos" (
    "id_instrumento" TEXT NOT NULL,
    "id_aspecto" TEXT NOT NULL,
    "origen" "origen_instrumento" NOT NULL,
    "clave_plantilla" TEXT,
    "nombre" TEXT NOT NULL,
    "enlace" TEXT,
    "fecha_planificada" TIMESTAMP(3),
    "orden" INTEGER NOT NULL,

    CONSTRAINT "instrumentos_pkey" PRIMARY KEY ("id_instrumento")
);

-- CreateIndex
CREATE UNIQUE INDEX "componentes_calificacion_id_actividad_clave_key" ON "componentes_calificacion"("id_actividad", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "aspectos_calificacion_id_componente_clave_key" ON "aspectos_calificacion"("id_componente", "clave");

-- CreateIndex
CREATE INDEX "instrumentos_id_aspecto_idx" ON "instrumentos"("id_aspecto");

-- AddForeignKey
ALTER TABLE "componentes_calificacion" ADD CONSTRAINT "componentes_calificacion_id_actividad_fkey" FOREIGN KEY ("id_actividad") REFERENCES "actividades"("id_actividad") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aspectos_calificacion" ADD CONSTRAINT "aspectos_calificacion_id_componente_fkey" FOREIGN KEY ("id_componente") REFERENCES "componentes_calificacion"("id_componente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrumentos" ADD CONSTRAINT "instrumentos_id_aspecto_fkey" FOREIGN KEY ("id_aspecto") REFERENCES "aspectos_calificacion"("id_aspecto") ON DELETE CASCADE ON UPDATE CASCADE;


-- 2. Estructura por defecto para las actividades existentes. Es la misma que
--    estructuraPorDefecto() de packages/shared en el momento de esta
--    migración; las actividades nuevas la reciben del servicio al crearse.
INSERT INTO "componentes_calificacion" ("id_componente", "id_actividad", "clave", "nombre", "peso", "orden")
SELECT gen_random_uuid()::text, a."id_actividad", c.clave, c.nombre, c.peso, c.orden
FROM "actividades" a
CROSS JOIN (VALUES
  ('proyecto', 'Proyecto colaborativo', 40, 0),
  ('proceso', 'Proceso colaborativo', 40, 1),
  ('aprendizaje', 'Aprendizaje', 20, 2)
) AS c(clave, nombre, peso, orden);

INSERT INTO "aspectos_calificacion" ("id_aspecto", "id_componente", "clave", "nombre", "peso", "orden")
SELECT gen_random_uuid()::text, comp."id_componente", x.clave, x.nombre, x.peso, x.orden
FROM "componentes_calificacion" comp
JOIN (VALUES
  ('proyecto', 'proyecto', 'Proyecto', 100, 0),
  ('proceso', 'definicion_responsabilidades', 'Definición de responsabilidades', 17, 0),
  ('proceso', 'interdependencia_positiva', 'Interdependencia positiva', 17, 1),
  ('proceso', 'responsabilidad_individual_grupal', 'Responsabilidad individual y grupal', 17, 2),
  ('proceso', 'interaccion', 'Interacción', 17, 3),
  ('proceso', 'evaluacion_grupo_habilidades_sociales', 'Evaluación de grupo y habilidades sociales', 16, 4),
  ('proceso', 'evaluacion_pares', 'Evaluación por pares', 16, 5),
  ('aprendizaje', 'bitacora', 'Bitácora', 100, 0)
) AS x(componente, clave, nombre, peso, orden) ON x.componente = comp."clave";

INSERT INTO "instrumentos" ("id_instrumento", "id_aspecto", "origen", "clave_plantilla", "nombre", "orden")
SELECT gen_random_uuid()::text, asp."id_aspecto", x.origen::"origen_instrumento", x.plantilla, x.nombre, 0
FROM "aspectos_calificacion" asp
JOIN (VALUES
  ('proyecto', 'manual', NULL, 'Proyecto'),
  ('evaluacion_pares', 'plantilla', 'evaluacion_pares', 'Evaluación por pares'),
  ('bitacora', 'manual', NULL, 'Bitácora')
) AS x(aspecto, origen, plantilla, nombre) ON x.aspecto = asp."clave";
