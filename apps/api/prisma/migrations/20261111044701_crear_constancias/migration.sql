-- CreateEnum
CREATE TYPE "TipoConstancia" AS ENUM ('curso', 'ruta');

-- AlterTable
ALTER TABLE "preferencias_formativas" ADD COLUMN     "constancias_publicas" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "constancias" (
    "id_constancia" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "tipo" "TipoConstancia" NOT NULL,
    "id_curso" TEXT,
    "id_ruta" TEXT,
    "titulo" TEXT NOT NULL,
    "elementos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "duracion_min" INTEGER NOT NULL,
    "titulos_cursos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fecha_finalizacion" TIMESTAMP(3) NOT NULL,
    "fecha_emision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "constancias_pkey" PRIMARY KEY ("id_constancia")
);

-- CreateIndex
CREATE UNIQUE INDEX "constancias_folio_key" ON "constancias"("folio");

-- CreateIndex
CREATE INDEX "constancias_id_usuario_fecha_finalizacion_idx" ON "constancias"("id_usuario", "fecha_finalizacion");

-- CreateIndex
CREATE UNIQUE INDEX "constancias_id_usuario_id_curso_key" ON "constancias"("id_usuario", "id_curso");

-- CreateIndex
CREATE UNIQUE INDEX "constancias_id_usuario_id_ruta_key" ON "constancias"("id_usuario", "id_ruta");

-- AddForeignKey
ALTER TABLE "constancias" ADD CONSTRAINT "constancias_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- Exactamente una referencia, la que corresponde al tipo. Prisma no expresa
-- CHECK en el esquema; vive solo aquí (docs/diseno-desarrollo-general.md §4.4).
ALTER TABLE "constancias" ADD CONSTRAINT "constancias_referencia_check" CHECK (
  ("tipo" = 'curso' AND "id_curso" IS NOT NULL AND "id_ruta" IS NULL)
  OR ("tipo" = 'ruta' AND "id_ruta" IS NOT NULL AND "id_curso" IS NULL)
);

-- Respaldo: quien ya terminó cursos o rutas antes de este cambio recibe sus
-- constancias aquí, con los mismos datos que emitiría el servicio
-- (services/formacion/constancias.service.ts). El folio se genera con una
-- función temporal, que desaparece con la sesión.
CREATE FUNCTION pg_temp.folio_constancia() RETURNS TEXT LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  alfabeto CONSTANT TEXT := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  s TEXT := '';
BEGIN
  FOR i IN 1..8 LOOP
    s := s || substr(alfabeto, 1 + floor(random() * 32)::INT, 1);
  END LOOP;
  RETURN 'CO3-' || substr(s, 1, 4) || '-' || substr(s, 5, 4);
END
$$;

-- Duración de un curso: la suma de sus lecciones; una lección de recurso sin
-- duración propia usa la del recurso (duracionDe en cursos.service.ts).
CREATE FUNCTION pg_temp.duracion_curso(curso TEXT) RETURNS INTEGER LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(COALESCE(l."duracion_min", r."duracion_min", 0)), 0)::INTEGER
  FROM "lecciones_curso" l
  LEFT JOIN "recursos_formativos" r ON r."id_recurso" = l."id_recurso"
  WHERE l."id_curso" = curso
$$;

INSERT INTO "constancias" (
  "id_constancia", "folio", "id_usuario", "tipo", "id_curso", "titulo",
  "elementos", "duracion_min", "fecha_finalizacion"
)
SELECT
  gen_random_uuid()::TEXT, pg_temp.folio_constancia(), i."id_usuario", 'curso', i."id_curso",
  c."titulo", c."elementos", pg_temp.duracion_curso(c."id_curso"), i."fecha_finalizacion"
FROM "inscripciones_curso" i
JOIN "cursos" c ON c."id_curso" = i."id_curso"
WHERE i."fecha_finalizacion" IS NOT NULL;

-- Una ruta publicada está terminada cuando lo están todos sus cursos
-- disponibles (publicados), y debe tener al menos uno. Los elementos van del
-- más frecuente al menos, y a igual frecuencia en el orden en que aparecen,
-- como en derivarRuta.
WITH disponibles AS (
  SELECT cr."id_ruta", cr."id_curso", cr."orden", c."titulo", c."elementos",
         pg_temp.duracion_curso(c."id_curso") AS duracion
  FROM "cursos_ruta" cr
  JOIN "cursos" c ON c."id_curso" = cr."id_curso" AND c."estatus" = 'publicado'
  JOIN "rutas_formativas" r ON r."id_ruta" = cr."id_ruta" AND r."estatus" = 'publicado'
),
terminadas AS (
  SELECT d."id_ruta", i."id_usuario", MAX(i."fecha_finalizacion") AS fecha
  FROM disponibles d
  JOIN "inscripciones_curso" i
    ON i."id_curso" = d."id_curso" AND i."fecha_finalizacion" IS NOT NULL
  GROUP BY d."id_ruta", i."id_usuario"
  HAVING COUNT(*) = (SELECT COUNT(*) FROM disponibles d2 WHERE d2."id_ruta" = d."id_ruta")
)
INSERT INTO "constancias" (
  "id_constancia", "folio", "id_usuario", "tipo", "id_ruta", "titulo",
  "elementos", "duracion_min", "titulos_cursos", "fecha_finalizacion"
)
SELECT
  gen_random_uuid()::TEXT, pg_temp.folio_constancia(), t."id_usuario", 'ruta', t."id_ruta", r."titulo",
  ARRAY(
    SELECT x.e FROM (
      SELECT u.e, COUNT(*) AS n, MIN(d."orden" * 10 + u.k) AS primero
      FROM disponibles d, unnest(d."elementos") WITH ORDINALITY AS u(e, k)
      WHERE d."id_ruta" = t."id_ruta"
      GROUP BY u.e
    ) x
    ORDER BY x.n DESC, x.primero
  ),
  (SELECT SUM(d.duracion)::INTEGER FROM disponibles d WHERE d."id_ruta" = t."id_ruta"),
  ARRAY(SELECT d."titulo" FROM disponibles d WHERE d."id_ruta" = t."id_ruta" ORDER BY d."orden"),
  t.fecha
FROM terminadas t
JOIN "rutas_formativas" r ON r."id_ruta" = t."id_ruta";

DROP FUNCTION pg_temp.duracion_curso(TEXT);
DROP FUNCTION pg_temp.folio_constancia();
