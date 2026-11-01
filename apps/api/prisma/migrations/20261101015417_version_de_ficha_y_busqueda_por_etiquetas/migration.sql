-- AlterTable
ALTER TABLE "cursos" ADD COLUMN     "version_ficha" INTEGER NOT NULL DEFAULT 0;

-- Recalcula texto_busqueda con la etiqueta visible de cada elemento, la misma
-- regla de textoDeBusquedaCatalogo (packages/shared): con el identificador,
-- buscar "Procesamiento del grupo" no encontraba `procesamiento_grupal`. El
-- área no se traduce porque su identificador ya es su etiqueta sin acentos.
CREATE TEMPORARY TABLE etiquetas_elemento (id TEXT PRIMARY KEY, etiqueta TEXT NOT NULL);

INSERT INTO etiquetas_elemento (id, etiqueta) VALUES
  ('responsabilidades', 'Responsabilidades claras'),
  ('interdependencia_positiva', 'Interdependencia positiva'),
  ('responsabilidad_individual_grupal', 'Responsabilidad individual y grupal'),
  ('interaccion_promotora', 'Interacción promotora'),
  ('procesamiento_grupal', 'Procesamiento del grupo');

UPDATE "recursos_formativos" r
SET "texto_busqueda" = translate(
  lower(
    r."titulo" || ' ' || r."resumen" || ' ' || coalesce(r."area", '') || ' ' ||
    coalesce(
      (SELECT string_agg(e.etiqueta, ' ')
       FROM unnest(r."elementos") AS u(id)
       JOIN etiquetas_elemento e ON e.id = u.id),
      ''
    )
  ),
  'áéíóúüñ_',
  'aeiouun '
);

UPDATE "cursos" c
SET "texto_busqueda" = translate(
  lower(
    c."titulo" || ' ' || c."resumen" || ' ' || c."objetivo" || ' ' || coalesce(c."area", '') || ' ' ||
    coalesce(
      (SELECT string_agg(e.etiqueta, ' ')
       FROM unnest(c."elementos") AS u(id)
       JOIN etiquetas_elemento e ON e.id = u.id),
      ''
    )
  ),
  'áéíóúüñ_',
  'aeiouun '
);

DROP TABLE etiquetas_elemento;
