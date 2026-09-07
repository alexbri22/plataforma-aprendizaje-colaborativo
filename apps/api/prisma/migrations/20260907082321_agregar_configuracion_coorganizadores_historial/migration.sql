-- CreateEnum
CREATE TYPE "funcion_seguimiento" AS ENUM ('formacion_equipos', 'reporte_trabajo', 'bitacora_individual', 'calificacion', 'autoevaluacion_individual', 'autoevaluacion_grupal', 'evaluacion_pares', 'espacio_equipo', 'insignias');

-- CreateEnum
CREATE TYPE "permiso_coorganizador" AS ENUM ('configurar_actividad', 'gestionar_inscripcion', 'gestionar_equipos', 'calificar_y_comentar', 'leer_bitacoras', 'otorgar_insignias', 'desactivar_participantes', 'consultar_historial_completo', 'gestionar_coorganizadores', 'iniciar_cierre_y_archivar');

-- CreateEnum
CREATE TYPE "tipo_actor_historial" AS ENUM ('usuario', 'sistema');

-- CreateEnum
CREATE TYPE "categoria_evento" AS ENUM ('aportacion', 'estructura', 'evaluacion');

-- CreateTable
CREATE TABLE "permisos_coorganizador" (
    "id_membresia" TEXT NOT NULL,
    "permiso" "permiso_coorganizador" NOT NULL,

    CONSTRAINT "permisos_coorganizador_pkey" PRIMARY KEY ("id_membresia","permiso")
);

-- CreateTable
CREATE TABLE "configuracion_funciones" (
    "id_actividad" TEXT NOT NULL,
    "funcion" "funcion_seguimiento" NOT NULL,
    "estado" TEXT NOT NULL,

    CONSTRAINT "configuracion_funciones_pkey" PRIMARY KEY ("id_actividad","funcion")
);

-- CreateTable
CREATE TABLE "historial" (
    "id_evento" TEXT NOT NULL,
    "id_actividad" TEXT NOT NULL,
    "tipo_actor" "tipo_actor_historial" NOT NULL,
    "id_usuario_actor" TEXT,
    "tipo_evento" TEXT NOT NULL,
    "tipo_entidad" TEXT NOT NULL,
    "id_entidad" TEXT NOT NULL,
    "datos" JSONB NOT NULL,
    "categoria" "categoria_evento" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_pkey" PRIMARY KEY ("id_evento")
);

-- CreateIndex
CREATE INDEX "historial_id_actividad_fecha_idx" ON "historial"("id_actividad", "fecha");

-- AddForeignKey
ALTER TABLE "permisos_coorganizador" ADD CONSTRAINT "permisos_coorganizador_id_membresia_fkey" FOREIGN KEY ("id_membresia") REFERENCES "membresias"("id_membresia") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion_funciones" ADD CONSTRAINT "configuracion_funciones_id_actividad_fkey" FOREIGN KEY ("id_actividad") REFERENCES "actividades"("id_actividad") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial" ADD CONSTRAINT "historial_id_actividad_fkey" FOREIGN KEY ("id_actividad") REFERENCES "actividades"("id_actividad") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial" ADD CONSTRAINT "historial_id_usuario_actor_fkey" FOREIGN KEY ("id_usuario_actor") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
