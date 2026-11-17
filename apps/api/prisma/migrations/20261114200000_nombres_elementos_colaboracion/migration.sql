-- Solo datos: los elementos de colaboración cambian de nombre (observaciones
-- del 12 de noviembre) y se agrega "Habilidades sociales". Las claves no
-- cambian, pero texto_busqueda guarda la etiqueta visible (misma regla que
-- textoDeBusquedaCatalogo en packages/shared), así que se recalcula para que
-- buscar "Evaluación de grupo" encuentre lo marcado como procesamiento_grupal.
-- WITH ORDINALITY conserva el orden en que se eligieron, como el código.

-- Espejo de normalizarBusqueda (packages/shared), en el mismo orden: separa
-- cada letra de su acento (NFD), quita todas las marcas U+0300–U+036F (no
-- solo las de áéíóúüñ: también una "o" seguida de un acento combinado, "ç",
-- "à"…), pasa a minúsculas y cambia "_" por espacio. Quitar los acentos antes
-- de lower() hace que las mayúsculas acentuadas no dependan de la colación.
CREATE FUNCTION pg_temp.normalizar_busqueda(texto TEXT) RETURNS TEXT AS $$
  SELECT replace(
    lower(regexp_replace(normalize(texto, NFD), '[̀-ͯ]', '', 'g')),
    '_',
    ' '
  )
$$ LANGUAGE sql IMMUTABLE;

CREATE TEMPORARY TABLE etiquetas_elemento (id TEXT PRIMARY KEY, etiqueta TEXT NOT NULL);

INSERT INTO etiquetas_elemento (id, etiqueta) VALUES
  ('responsabilidades', 'Definición de responsabilidades'),
  ('interdependencia_positiva', 'Interdependencia positiva'),
  ('responsabilidad_individual_grupal', 'Responsabilidad individual y grupal'),
  ('interaccion_promotora', 'Interacción'),
  ('procesamiento_grupal', 'Evaluación de grupo'),
  ('habilidades_sociales', 'Habilidades sociales');

UPDATE "recursos_formativos" r
SET "texto_busqueda" = pg_temp.normalizar_busqueda(
  r."titulo" || ' ' || r."resumen" || ' ' || coalesce(r."area", '') || ' ' ||
  coalesce(
    (SELECT string_agg(e.etiqueta, ' ' ORDER BY u.n)
     FROM unnest(r."elementos") WITH ORDINALITY AS u(id, n)
     JOIN etiquetas_elemento e ON e.id = u.id),
    ''
  )
);

UPDATE "cursos" c
SET "texto_busqueda" = pg_temp.normalizar_busqueda(
  c."titulo" || ' ' || c."resumen" || ' ' || c."objetivo" || ' ' || coalesce(c."area", '') || ' ' ||
  coalesce(
    (SELECT string_agg(e.etiqueta, ' ' ORDER BY u.n)
     FROM unnest(c."elementos") WITH ORDINALITY AS u(id, n)
     JOIN etiquetas_elemento e ON e.id = u.id),
    ''
  )
);

DROP TABLE etiquetas_elemento;
DROP FUNCTION pg_temp.normalizar_busqueda(TEXT);
