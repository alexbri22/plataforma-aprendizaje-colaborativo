-- Cada elemento del proyecto colaborativo (y la bitácora) tiene su propio
-- calendario de revisiones, no solo los avances. Los periodos existentes
-- eran todos de avances.
ALTER TABLE "periodos_reporte" ADD COLUMN "elemento" TEXT NOT NULL DEFAULT 'avances';
ALTER TABLE "periodos_reporte" ALTER COLUMN "elemento" DROP DEFAULT;

DROP INDEX "periodos_reporte_id_actividad_orden_key";
CREATE UNIQUE INDEX "periodos_reporte_id_actividad_elemento_orden_key" ON "periodos_reporte"("id_actividad", "elemento", "orden");

-- La bitácora pasa de Aprendizaje al Proyecto colaborativo, con sus puntajes;
-- en las actividades existentes entra con peso 0 para no cambiar ninguna
-- calificación. Aprendizaje queda como la valoración de quien organiza: un
-- solo puntaje por participante, a su criterio.
UPDATE "aspectos_calificacion" AS a
SET "id_componente" = p."id_componente",
    "peso" = 0,
    "orden" = (SELECT COALESCE(MAX(x."orden"), -1) + 1 FROM "aspectos_calificacion" x WHERE x."id_componente" = p."id_componente")
FROM "componentes_calificacion" AS c, "componentes_calificacion" AS p
WHERE a."id_componente" = c."id_componente"
  AND c."clave" = 'aprendizaje'
  AND a."clave" = 'bitacora'
  AND p."id_actividad" = c."id_actividad"
  AND p."clave" = 'proyecto';

INSERT INTO "aspectos_calificacion" ("id_aspecto", "id_componente", "clave", "nombre", "peso", "orden")
SELECT gen_random_uuid()::text, c."id_componente", 'valoracion', 'Aprendizaje', 100, 0
FROM "componentes_calificacion" c
WHERE c."clave" = 'aprendizaje'
  AND NOT EXISTS (SELECT 1 FROM "aspectos_calificacion" a WHERE a."id_componente" = c."id_componente" AND a."clave" = 'valoracion');

INSERT INTO "instrumentos" ("id_instrumento", "id_aspecto", "tipo", "origen", "nombre", "orden")
SELECT gen_random_uuid()::text, a."id_aspecto", NULL, 'manual', 'Aprendizaje', 0
FROM "aspectos_calificacion" a
WHERE a."clave" = 'valoracion'
  AND NOT EXISTS (SELECT 1 FROM "instrumentos" i WHERE i."id_aspecto" = a."id_aspecto");
