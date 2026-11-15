-- CreateTable
CREATE TABLE "pistas_vistas" (
    "id_usuario" TEXT NOT NULL,
    "id_pista" TEXT NOT NULL,
    "vista_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pistas_vistas_pkey" PRIMARY KEY ("id_usuario","id_pista")
);

-- AddForeignKey
ALTER TABLE "pistas_vistas" ADD CONSTRAINT "pistas_vistas_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- Quien ya usa la plataforma (tiene al menos una membresía) no necesita la
-- bienvenida de primera vez: se marca como vista. Las ayudas de cada
-- pantalla sí le aparecen una vez, porque son nuevas para todos.
INSERT INTO "pistas_vistas" ("id_usuario", "id_pista")
SELECT DISTINCT "id_usuario", 'bienvenida' FROM "membresias";
