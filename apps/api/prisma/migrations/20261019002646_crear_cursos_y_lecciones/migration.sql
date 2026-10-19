-- CreateEnum
CREATE TYPE "nivel_curso" AS ENUM ('inicial', 'intermedio', 'avanzado');

-- CreateEnum
CREATE TYPE "tipo_leccion" AS ENUM ('recurso', 'lectura', 'practica', 'reflexion');

-- CreateTable
CREATE TABLE "cursos" (
    "id_curso" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "resumen" TEXT NOT NULL DEFAULT '',
    "objetivo" TEXT NOT NULL DEFAULT '',
    "area" TEXT,
    "elementos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nivel" "nivel_curso",
    "practica_final" TEXT NOT NULL DEFAULT '',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estatus" "estatus_recurso" NOT NULL DEFAULT 'borrador',
    "texto_busqueda" TEXT NOT NULL DEFAULT '',
    "id_usuario_autor" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cursos_pkey" PRIMARY KEY ("id_curso")
);

-- CreateTable
CREATE TABLE "lecciones_curso" (
    "id_leccion" TEXT NOT NULL,
    "id_curso" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL DEFAULT '',
    "tipo" "tipo_leccion" NOT NULL,
    "id_recurso" TEXT,
    "contenido" TEXT NOT NULL DEFAULT '',
    "obligatoria" BOOLEAN NOT NULL DEFAULT true,
    "duracion_min" INTEGER,

    CONSTRAINT "lecciones_curso_pkey" PRIMARY KEY ("id_leccion")
);

-- CreateIndex
CREATE INDEX "cursos_estatus_orden_idx" ON "cursos"("estatus", "orden");

-- CreateIndex
CREATE INDEX "lecciones_curso_id_recurso_idx" ON "lecciones_curso"("id_recurso");

-- CreateIndex
CREATE UNIQUE INDEX "lecciones_curso_id_curso_orden_key" ON "lecciones_curso"("id_curso", "orden");

-- AddForeignKey
ALTER TABLE "cursos" ADD CONSTRAINT "cursos_id_usuario_autor_fkey" FOREIGN KEY ("id_usuario_autor") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecciones_curso" ADD CONSTRAINT "lecciones_curso_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "cursos"("id_curso") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecciones_curso" ADD CONSTRAINT "lecciones_curso_id_recurso_fkey" FOREIGN KEY ("id_recurso") REFERENCES "recursos_formativos"("id_recurso") ON DELETE RESTRICT ON UPDATE CASCADE;
