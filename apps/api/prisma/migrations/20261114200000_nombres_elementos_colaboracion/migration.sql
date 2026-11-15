-- Solo datos: los elementos de colaboración cambian de nombre (observaciones
-- del 12 de noviembre) y se agrega "Habilidades sociales". Las claves no
-- cambian, pero texto_busqueda guarda la etiqueta visible (misma regla que
-- textoDeBusquedaCatalogo en packages/shared), así que se recalcula para que
-- buscar "Evaluación de grupo" encuentre lo marcado como procesamiento_grupal.
-- WITH ORDINALITY conserva el orden en que se eligieron, como el código.
CREATE TEMPORARY TABLE etiquetas_elemento (id TEXT PRIMARY KEY, etiqueta TEXT NOT NULL);

INSERT INTO etiquetas_elemento (id, etiqueta) VALUES
  ('responsabilidades', 'Definición de responsabilidades'),
  ('interdependencia_positiva', 'Interdependencia positiva'),
  ('responsabilidad_individual_grupal', 'Responsabilidad individual y grupal'),
  ('interaccion_promotora', 'Interacción'),
  ('procesamiento_grupal', 'Evaluación de grupo'),
  ('habilidades_sociales', 'Habilidades sociales');

UPDATE "recursos_formativos" r
SET "texto_busqueda" = translate(
  lower(
    r."titulo" || ' ' || r."resumen" || ' ' || coalesce(r."area", '') || ' ' ||
    coalesce(
      (SELECT string_agg(e.etiqueta, ' ' ORDER BY u.n)
       FROM unnest(r."elementos") WITH ORDINALITY AS u(id, n)
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
      (SELECT string_agg(e.etiqueta, ' ' ORDER BY u.n)
       FROM unnest(c."elementos") WITH ORDINALITY AS u(id, n)
       JOIN etiquetas_elemento e ON e.id = u.id),
      ''
    )
  ),
  'áéíóúüñ_',
  'aeiouun '
);

DROP TABLE etiquetas_elemento;
