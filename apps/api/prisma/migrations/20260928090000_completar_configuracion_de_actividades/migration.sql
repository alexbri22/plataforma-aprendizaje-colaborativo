-- Toda actividad tiene exactamente una fila de configuración por función
-- (docs/diseno-desarrollo-nucleo.md §7.1), pero solo crearActividad las
-- inserta: las actividades anteriores a la tabla `configuracion_funciones`
-- quedaron sin filas y GET /actividades/{id} les devuelve una configuración
-- incompleta, con valores que la pantalla inventa y nunca se guardaron.
--
-- Se rellena aquí, en una migración nueva, y no en la que creó la tabla: esa
-- ya está aplicada en otras bases y Prisma rechaza una migración modificada
-- después de aplicarse.
--
-- Los valores son los de CONFIGURACION_POR_DEFECTO (@plataforma/shared,
-- P-25 de nucleo §7.9) tal como están hoy; se copian y no se importan porque
-- una migración debe seguir haciendo lo mismo aunque esa constante cambie.
-- ON CONFLICT DO NOTHING conserva lo que quien organiza ya haya configurado.
INSERT INTO "configuracion_funciones" ("id_actividad", "funcion", "estado")
SELECT a."id_actividad", d."funcion"::"funcion_seguimiento", d."estado"
FROM "actividades" a
CROSS JOIN (
    VALUES
        ('formacion_equipos', 'autogestionado'),
        ('bitacora_individual', 'deshabilitada'),
        ('calificacion', 'deshabilitada'),
        ('autoevaluacion_individual', 'deshabilitada'),
        ('autoevaluacion_grupal', 'deshabilitada'),
        ('evaluacion_pares', 'deshabilitada'),
        ('espacio_equipo', '{"metas":"opcional","avances":"opcional","recursos":"opcional"}'),
        ('insignias', 'deshabilitado')
) AS d ("funcion", "estado")
ON CONFLICT ("id_actividad", "funcion") DO NOTHING;
