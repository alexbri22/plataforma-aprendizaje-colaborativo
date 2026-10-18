-- CreateEnum
CREATE TYPE "seccion_formativa" AS ENUM ('que_es_colaborar', 'como_colaborar');

-- CreateEnum
CREATE TYPE "tipo_recurso" AS ENUM ('texto', 'pdf', 'video', 'enlace', 'plantilla');

-- CreateEnum
CREATE TYPE "estatus_recurso" AS ENUM ('borrador', 'publicado', 'retirado');

-- CreateTable
CREATE TABLE "recursos_formativos" (
    "id_recurso" TEXT NOT NULL,
    "seccion" "seccion_formativa" NOT NULL,
    "titulo" TEXT NOT NULL,
    "resumen" TEXT NOT NULL DEFAULT '',
    "tipo_recurso" "tipo_recurso" NOT NULL,
    "contenido" TEXT NOT NULL DEFAULT '',
    "transcripcion" TEXT NOT NULL DEFAULT '',
    "area" TEXT,
    "elementos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "duracion_min" INTEGER,
    "fuente" TEXT NOT NULL DEFAULT '',
    "licencia" TEXT NOT NULL DEFAULT '',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estatus" "estatus_recurso" NOT NULL DEFAULT 'borrador',
    "id_usuario_autor" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recursos_formativos_pkey" PRIMARY KEY ("id_recurso")
);

-- CreateTable
CREATE TABLE "archivos_recurso" (
    "id_recurso" TEXT NOT NULL,
    "contenido" BYTEA NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivos_recurso_pkey" PRIMARY KEY ("id_recurso")
);

-- CreateIndex
CREATE INDEX "recursos_formativos_estatus_orden_idx" ON "recursos_formativos"("estatus", "orden");

-- AddForeignKey
ALTER TABLE "recursos_formativos" ADD CONSTRAINT "recursos_formativos_id_usuario_autor_fkey" FOREIGN KEY ("id_usuario_autor") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos_recurso" ADD CONSTRAINT "archivos_recurso_id_recurso_fkey" FOREIGN KEY ("id_recurso") REFERENCES "recursos_formativos"("id_recurso") ON DELETE CASCADE ON UPDATE CASCADE;
