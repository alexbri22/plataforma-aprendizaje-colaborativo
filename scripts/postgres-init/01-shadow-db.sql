-- Base sombra que Prisma Migrate necesita para detectar deriva del esquema
-- (docs/diseno-desarrollo-nucleo.md §2.5). Vive en la misma instancia que la
-- base de desarrollo porque ambas son descartables y no requieren aislarse.
-- La extensión citext no se crea aquí: la declara el esquema de Prisma
-- (postgresqlExtensions) y la aplica la propia migración.
CREATE DATABASE plataforma_shadow OWNER plataforma;
