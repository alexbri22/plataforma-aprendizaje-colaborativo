-- CreateTable
CREATE TABLE "preferencias_formativas" (
    "id_usuario" TEXT NOT NULL,
    "elementos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preferencias_formativas_pkey" PRIMARY KEY ("id_usuario")
);

-- AddForeignKey
ALTER TABLE "preferencias_formativas" ADD CONSTRAINT "preferencias_formativas_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;
