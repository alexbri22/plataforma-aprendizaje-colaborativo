-- CreateEnum
CREATE TYPE "estado_solicitud_nombre" AS ENUM ('pendiente', 'rechazada');

-- CreateTable
CREATE TABLE "solicitudes_cambio_nombre" (
    "id_solicitud" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido_paterno" TEXT NOT NULL,
    "apellido_materno" TEXT NOT NULL,
    "estado" "estado_solicitud_nombre" NOT NULL DEFAULT 'pendiente',
    "motivo_rechazo" TEXT,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resuelta_en" TIMESTAMP(3),

    CONSTRAINT "solicitudes_cambio_nombre_pkey" PRIMARY KEY ("id_solicitud")
);

-- CreateIndex
CREATE UNIQUE INDEX "solicitudes_cambio_nombre_id_usuario_key" ON "solicitudes_cambio_nombre"("id_usuario");

-- CreateIndex
CREATE INDEX "solicitudes_cambio_nombre_estado_creada_en_idx" ON "solicitudes_cambio_nombre"("estado", "creada_en");

-- AddForeignKey
ALTER TABLE "solicitudes_cambio_nombre" ADD CONSTRAINT "solicitudes_cambio_nombre_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;
