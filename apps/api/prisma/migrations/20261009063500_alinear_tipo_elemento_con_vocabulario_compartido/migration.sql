-- El diccionario de datos del general (§5.2) describe tipo_elemento en
-- singular (meta/avance/recurso), pero @plataforma/shared ya tiene un
-- catálogo para "cuál de los tres" con otro nombre: ELEMENTOS_ESPACIO_EQUIPO
-- (las claves de configuracion_funciones.estado para espacio_equipo), en
-- plural (metas/avances/recursos). Nucleo §2.2 pide un solo vocabulario de
-- nombres entre servidor y cliente; se alinea tipo_elemento al que ya existe,
-- en vez de mantener dos. RENAME VALUE y no DROP/CREATE: la tabla es nueva
-- en esta misma rama y no tiene filas, pero renombrar es además la operación
-- correcta en general (conserva cualquier fila existente).
ALTER TYPE "tipo_elemento" RENAME VALUE 'meta' TO 'metas';
ALTER TYPE "tipo_elemento" RENAME VALUE 'avance' TO 'avances';
ALTER TYPE "tipo_elemento" RENAME VALUE 'recurso' TO 'recursos';
