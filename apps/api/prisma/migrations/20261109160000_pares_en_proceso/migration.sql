-- La evaluación por pares deja de ser una función de seguimiento: es un
-- aspecto más del proceso colaborativo (docs/diseno-desarrollo-general.md
-- §6.2, P-38), que se aplica si tiene instrumento. Donde la función estaba
-- deshabilitada, su aspecto se queda sin instrumento; donde estaba
-- habilitada, conserva la coevaluación con plantilla que ya tenía.
DELETE FROM "instrumentos" i
  USING "aspectos_calificacion" a, "componentes_calificacion" c
  WHERE i."id_aspecto" = a."id_aspecto"
    AND a."id_componente" = c."id_componente"
    AND a."clave" = 'evaluacion_pares'
    AND NOT EXISTS (
      SELECT 1 FROM "configuracion_funciones" f
      WHERE f."id_actividad" = c."id_actividad"
        AND f."funcion" = 'evaluacion_pares'
        AND f."estado" <> 'deshabilitada'
    );

DELETE FROM "configuracion_funciones" WHERE "funcion" = 'evaluacion_pares';

-- AlterEnum
BEGIN;
CREATE TYPE "funcion_seguimiento_new" AS ENUM ('formacion_equipos', 'bitacora_individual', 'calificacion', 'espacio_equipo', 'insignias');
ALTER TABLE "configuracion_funciones" ALTER COLUMN "funcion" TYPE "funcion_seguimiento_new" USING ("funcion"::text::"funcion_seguimiento_new");
ALTER TYPE "funcion_seguimiento" RENAME TO "funcion_seguimiento_old";
ALTER TYPE "funcion_seguimiento_new" RENAME TO "funcion_seguimiento";
DROP TYPE "public"."funcion_seguimiento_old";
COMMIT;
