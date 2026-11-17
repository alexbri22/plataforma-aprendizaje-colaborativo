-- 1. La evaluación por pares deja de ser un aspecto del proceso
--    colaborativo: es la plantilla del tipo coevaluación en los aspectos que
--    lo admiten (docs/diseno-desarrollo-general.md §4.2, P-38). Sus aspectos
--    se eliminan con sus instrumentos, y el proceso vuelve a repartirse
--    entre sus cinco aspectos en partes iguales. No hay respuestas ni
--    puntajes que perder: esos módulos todavía no existen.
DELETE FROM "aspectos_calificacion" WHERE "clave" = 'evaluacion_pares';
UPDATE "aspectos_calificacion" a SET "peso" = 20
  FROM "componentes_calificacion" c
  WHERE a."id_componente" = c."id_componente" AND c."clave" = 'proceso';

-- 2. La bitácora habilitada elige formato (nucleo §9.3): guiada o libre.
--    Las actividades que la tenían habilitada siguen guiadas, que es como
--    se escribían sus entradas.
UPDATE "configuracion_funciones" SET "estado" = 'guiada'
  WHERE "funcion" = 'bitacora_individual' AND "estado" = 'habilitada';

-- AlterTable
ALTER TABLE "bitacoras" ADD COLUMN "contenido" TEXT,
ALTER COLUMN "respuestas" DROP NOT NULL;
