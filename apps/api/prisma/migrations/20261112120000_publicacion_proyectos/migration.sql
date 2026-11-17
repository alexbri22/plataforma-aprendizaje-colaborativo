-- Publicación de proyectos: el entregable final de cada equipo, en el cierre
-- (una por equipo), visible para toda la actividad.
CREATE TABLE "publicaciones_proyecto" (
    "id_publicacion" TEXT NOT NULL,
    "id_equipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "enlace" TEXT,
    "id_membresia_autor" TEXT NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publicaciones_proyecto_pkey" PRIMARY KEY ("id_publicacion")
);

CREATE UNIQUE INDEX "publicaciones_proyecto_id_equipo_key" ON "publicaciones_proyecto"("id_equipo");

ALTER TABLE "publicaciones_proyecto" ADD CONSTRAINT "publicaciones_proyecto_id_equipo_fkey" FOREIGN KEY ("id_equipo") REFERENCES "equipos"("id_equipo") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publicaciones_proyecto" ADD CONSTRAINT "publicaciones_proyecto_id_membresia_autor_fkey" FOREIGN KEY ("id_membresia_autor") REFERENCES "membresias"("id_membresia") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "archivos_publicacion" (
    "id_publicacion" TEXT NOT NULL,
    "contenido" BYTEA NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "subido_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivos_publicacion_pkey" PRIMARY KEY ("id_publicacion")
);

ALTER TABLE "archivos_publicacion" ADD CONSTRAINT "archivos_publicacion_id_publicacion_fkey" FOREIGN KEY ("id_publicacion") REFERENCES "publicaciones_proyecto"("id_publicacion") ON DELETE CASCADE ON UPDATE CASCADE;
