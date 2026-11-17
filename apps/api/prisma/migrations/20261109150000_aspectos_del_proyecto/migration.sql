-- Aspectos del proyecto colaborativo (P-40, docs/diseno-desarrollo-general.md
-- §4.2): los elementos del espacio de equipo, cada uno con su porcentaje del
-- proyecto, en lugar de un único aspecto "Proyecto". Todavía no hay puntajes
-- capturados, así que reemplazarlo no pierde nada.
DELETE FROM "aspectos_calificacion" asp
USING "componentes_calificacion" comp
WHERE asp."id_componente" = comp."id_componente"
  AND comp."clave" = 'proyecto'
  AND asp."clave" = 'proyecto';

INSERT INTO "aspectos_calificacion" ("id_aspecto", "id_componente", "clave", "nombre", "peso", "orden")
SELECT gen_random_uuid()::text, comp."id_componente", x.clave, x.nombre, 20, x.orden
FROM "componentes_calificacion" comp
CROSS JOIN (VALUES
  ('metas', 'Metas', 0),
  ('planeacion', 'Planeación', 1),
  ('avances', 'Avances', 2),
  ('recursos', 'Materiales', 3),
  ('producto', 'Producto', 4)
) AS x(clave, nombre, orden)
WHERE comp."clave" = 'proyecto';

INSERT INTO "instrumentos" ("id_instrumento", "id_aspecto", "origen", "nombre", "orden")
SELECT gen_random_uuid()::text, asp."id_aspecto", 'manual', asp."nombre", 0
FROM "aspectos_calificacion" asp
JOIN "componentes_calificacion" comp ON comp."id_componente" = asp."id_componente"
WHERE comp."clave" = 'proyecto';
