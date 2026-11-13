-- CreateTable
CREATE TABLE "rutas_formativas" (
    "id_ruta" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "finalidad" TEXT NOT NULL DEFAULT '',
    "descripcion" TEXT NOT NULL DEFAULT '',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estatus" "estatus_recurso" NOT NULL DEFAULT 'borrador',
    "destacada" BOOLEAN NOT NULL DEFAULT false,
    "texto_busqueda" TEXT NOT NULL DEFAULT '',
    "version_ficha" INTEGER NOT NULL DEFAULT 0,
    "id_usuario_autor" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rutas_formativas_pkey" PRIMARY KEY ("id_ruta")
);

-- CreateTable
CREATE TABLE "cursos_ruta" (
    "id_ruta" TEXT NOT NULL,
    "id_curso" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "cursos_ruta_pkey" PRIMARY KEY ("id_ruta","id_curso")
);

-- CreateIndex
CREATE INDEX "rutas_formativas_estatus_orden_idx" ON "rutas_formativas"("estatus", "orden");

-- CreateIndex
CREATE INDEX "cursos_ruta_id_curso_idx" ON "cursos_ruta"("id_curso");

-- CreateIndex
CREATE UNIQUE INDEX "cursos_ruta_id_ruta_orden_key" ON "cursos_ruta"("id_ruta", "orden");

-- AddForeignKey
ALTER TABLE "rutas_formativas" ADD CONSTRAINT "rutas_formativas_id_usuario_autor_fkey" FOREIGN KEY ("id_usuario_autor") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos_ruta" ADD CONSTRAINT "cursos_ruta_id_ruta_fkey" FOREIGN KEY ("id_ruta") REFERENCES "rutas_formativas"("id_ruta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos_ruta" ADD CONSTRAINT "cursos_ruta_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "cursos"("id_curso") ON DELETE RESTRICT ON UPDATE CASCADE;
