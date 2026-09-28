-- La propuesta del sistema deja de ser un estado de la función formacion_equipos:
-- es una acción disponible en la asignación manual. Las actividades que la tenían
-- pasan a manual, que es lo mismo con el botón de propuesta a mano.
UPDATE "configuracion_funciones"
SET "estado" = 'manual'
WHERE "funcion" = 'formacion_equipos' AND "estado" = 'propuesta_sistema';
