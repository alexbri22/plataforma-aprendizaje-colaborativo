-- Tipo de instrumento (docs/diseno-desarrollo-general.md §4.4): qué es el
-- instrumento, aparte del formato en que se aplica (origen). La única
-- instancia con tipo que existía es la evaluación por pares, una coevaluación.
ALTER TABLE "instrumentos" ADD COLUMN "tipo" TEXT;
UPDATE "instrumentos" SET "tipo" = 'coevaluacion' WHERE "clave_plantilla" = 'evaluacion_pares';
