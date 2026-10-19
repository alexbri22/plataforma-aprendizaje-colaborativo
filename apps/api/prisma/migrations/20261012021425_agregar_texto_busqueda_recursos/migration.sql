-- AlterTable
ALTER TABLE "recursos_formativos" ADD COLUMN     "texto_busqueda" TEXT NOT NULL DEFAULT '';

-- Rellena los recursos existentes con la misma normalización que aplica el
-- servicio (services/formacion/recursos.service.ts, textoDeBusqueda):
-- minúsculas, sin acentos y con los guiones bajos de los identificadores
-- como espacios.
UPDATE "recursos_formativos"
SET "texto_busqueda" = translate(
  lower(
    "titulo" || ' ' || "resumen" || ' ' || coalesce("area", '') || ' ' ||
    array_to_string("elementos", ' ')
  ),
  'áéíóúüñ_',
  'aeiouun '
);
