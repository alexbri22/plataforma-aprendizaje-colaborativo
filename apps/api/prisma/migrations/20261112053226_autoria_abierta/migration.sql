-- CreateEnum
CREATE TYPE "origen_contenido" AS ENUM ('editorial', 'propuesta');

-- CreateEnum
CREATE TYPE "tipo_contenido" AS ENUM ('recurso', 'curso');

-- CreateEnum
CREATE TYPE "accion_revision" AS ENUM ('enviada', 'cancelada', 'aprobada', 'cambios_solicitados', 'rechazada', 'retirada', 'publicada_de_nuevo');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "estatus_recurso" ADD VALUE 'en_revision';
ALTER TYPE "estatus_recurso" ADD VALUE 'cambios_solicitados';
ALTER TYPE "estatus_recurso" ADD VALUE 'rechazado';

-- AlterTable
ALTER TABLE "cursos" ADD COLUMN     "decision_sin_ver" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fecha_envio" TIMESTAMP(3),
ADD COLUMN     "origen" "origen_contenido" NOT NULL DEFAULT 'editorial';

-- AlterTable
ALTER TABLE "recursos_formativos" ADD COLUMN     "decision_sin_ver" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fecha_envio" TIMESTAMP(3),
ADD COLUMN     "origen" "origen_contenido" NOT NULL DEFAULT 'editorial',
ADD COLUMN     "version_ficha" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "revisiones_contenido" (
    "id_revision" TEXT NOT NULL,
    "tipo_contenido" "tipo_contenido" NOT NULL,
    "id_contenido" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "id_usuario_actor" TEXT,
    "accion" "accion_revision" NOT NULL,
    "motivo" TEXT NOT NULL DEFAULT '',
    "criterios" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revisiones_contenido_pkey" PRIMARY KEY ("id_revision")
);

-- CreateIndex
CREATE INDEX "revisiones_contenido_tipo_contenido_id_contenido_fecha_idx" ON "revisiones_contenido"("tipo_contenido", "id_contenido", "fecha");

-- CreateIndex
CREATE INDEX "cursos_id_usuario_autor_origen_idx" ON "cursos"("id_usuario_autor", "origen");

-- CreateIndex
CREATE INDEX "recursos_formativos_id_usuario_autor_origen_idx" ON "recursos_formativos"("id_usuario_autor", "origen");

-- AddForeignKey
ALTER TABLE "revisiones_contenido" ADD CONSTRAINT "revisiones_contenido_id_usuario_actor_fkey" FOREIGN KEY ("id_usuario_actor") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- Los estados de revisión son solo de las propuestas: el contenido editorial
-- y las rutas se quedan en borrador, publicado o retirado. Prisma no expresa
-- CHECK en el esquema; viven solo aquí (docs/diseno-desarrollo-general.md
-- §4.4). Solo nombran los valores que ya existían, que pueden usarse en la
-- misma transacción que agrega los nuevos.
ALTER TABLE "recursos_formativos" ADD CONSTRAINT "recursos_formativos_estatus_origen_check"
  CHECK ("origen" = 'propuesta' OR "estatus" IN ('borrador', 'publicado', 'retirado'));
ALTER TABLE "cursos" ADD CONSTRAINT "cursos_estatus_origen_check"
  CHECK ("origen" = 'propuesta' OR "estatus" IN ('borrador', 'publicado', 'retirado'));
ALTER TABLE "rutas_formativas" ADD CONSTRAINT "rutas_formativas_estatus_check"
  CHECK ("estatus" IN ('borrador', 'publicado', 'retirado'));
