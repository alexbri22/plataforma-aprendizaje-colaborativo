-- CreateTable
CREATE TABLE "inscripciones_curso" (
    "id_inscripcion" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "id_curso" TEXT NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_finalizacion" TIMESTAMP(3),
    "fecha_ultima_actividad" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inscripciones_curso_pkey" PRIMARY KEY ("id_inscripcion")
);

-- CreateTable
CREATE TABLE "progreso_leccion" (
    "id_inscripcion" TEXT NOT NULL,
    "id_leccion" TEXT NOT NULL,
    "fecha_completada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progreso_leccion_pkey" PRIMARY KEY ("id_inscripcion","id_leccion")
);

-- CreateTable
CREATE TABLE "reflexiones_formativas" (
    "id_inscripcion" TEXT NOT NULL,
    "id_leccion" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reflexiones_formativas_pkey" PRIMARY KEY ("id_inscripcion","id_leccion")
);

-- CreateTable
CREATE TABLE "recursos_guardados" (
    "id_usuario" TEXT NOT NULL,
    "id_recurso" TEXT NOT NULL,
    "fecha_guardado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recursos_guardados_pkey" PRIMARY KEY ("id_usuario","id_recurso")
);

-- CreateIndex
CREATE INDEX "inscripciones_curso_id_curso_idx" ON "inscripciones_curso"("id_curso");

-- CreateIndex
CREATE UNIQUE INDEX "inscripciones_curso_id_usuario_id_curso_key" ON "inscripciones_curso"("id_usuario", "id_curso");

-- CreateIndex
CREATE INDEX "progreso_leccion_id_leccion_idx" ON "progreso_leccion"("id_leccion");

-- CreateIndex
CREATE INDEX "reflexiones_formativas_id_leccion_idx" ON "reflexiones_formativas"("id_leccion");

-- CreateIndex
CREATE INDEX "recursos_guardados_id_recurso_idx" ON "recursos_guardados"("id_recurso");

-- AddForeignKey
ALTER TABLE "inscripciones_curso" ADD CONSTRAINT "inscripciones_curso_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones_curso" ADD CONSTRAINT "inscripciones_curso_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "cursos"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progreso_leccion" ADD CONSTRAINT "progreso_leccion_id_inscripcion_fkey" FOREIGN KEY ("id_inscripcion") REFERENCES "inscripciones_curso"("id_inscripcion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progreso_leccion" ADD CONSTRAINT "progreso_leccion_id_leccion_fkey" FOREIGN KEY ("id_leccion") REFERENCES "lecciones_curso"("id_leccion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reflexiones_formativas" ADD CONSTRAINT "reflexiones_formativas_id_inscripcion_fkey" FOREIGN KEY ("id_inscripcion") REFERENCES "inscripciones_curso"("id_inscripcion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reflexiones_formativas" ADD CONSTRAINT "reflexiones_formativas_id_leccion_fkey" FOREIGN KEY ("id_leccion") REFERENCES "lecciones_curso"("id_leccion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recursos_guardados" ADD CONSTRAINT "recursos_guardados_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recursos_guardados" ADD CONSTRAINT "recursos_guardados_id_recurso_fkey" FOREIGN KEY ("id_recurso") REFERENCES "recursos_formativos"("id_recurso") ON DELETE CASCADE ON UPDATE CASCADE;
