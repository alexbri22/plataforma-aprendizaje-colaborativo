-- Bitácora guiada (docs/diseno-desarrollo-nucleo.md §9.3): una respuesta por
-- clave de pregunta en lugar de un texto libre. No había entradas reales al
-- hacer el cambio, solo datos de desarrollo: las existentes se convierten
-- con su texto como respuesta a la primera pregunta, para no dejar
-- huérfanos sus comentarios.
ALTER TABLE "bitacoras" ADD COLUMN "respuestas" JSONB;
UPDATE "bitacoras" SET "respuestas" = jsonb_build_object('conocimientos_adquiridos', "contenido");
ALTER TABLE "bitacoras" ALTER COLUMN "respuestas" SET NOT NULL;
ALTER TABLE "bitacoras" DROP COLUMN "contenido";
