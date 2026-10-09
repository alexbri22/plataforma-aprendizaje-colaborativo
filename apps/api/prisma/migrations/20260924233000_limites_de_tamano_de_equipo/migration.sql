-- Ajuste de formacion_equipos: tamaño mínimo y máximo de un equipo (P-27). Nulos
-- significan sin límite; los aplica la capa de servicios de Equipos.

-- AlterTable
ALTER TABLE "actividades" ADD COLUMN     "tamano_maximo_equipo" INTEGER,
ADD COLUMN     "tamano_minimo_equipo" INTEGER;

