-- CreateTable
CREATE TABLE "fotos_de_perfil" (
    "id_usuario" TEXT NOT NULL,
    "contenido" BYTEA NOT NULL,
    "tipo" TEXT NOT NULL,
    "actualizada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fotos_de_perfil_pkey" PRIMARY KEY ("id_usuario")
);

-- AddForeignKey
ALTER TABLE "fotos_de_perfil" ADD CONSTRAINT "fotos_de_perfil_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;
