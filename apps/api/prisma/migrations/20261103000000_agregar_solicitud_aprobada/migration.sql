-- AlterEnum
-- Una solicitud aprobada se conserva para avisarle a la persona; antes se
-- borraba al aprobarla (docs/diseno-desarrollo-nucleo.md §6.3).
ALTER TYPE "estado_solicitud_nombre" ADD VALUE 'aprobada' BEFORE 'rechazada';
