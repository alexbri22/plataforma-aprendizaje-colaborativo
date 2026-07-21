# data/

Capa de acceso a datos de la cadena rutas → middleware → servicios → acceso
a datos (ver sección 2.2 de `docs/diseno-desarrollo.md`).

**Estado:** bloqueada — el motor de base de datos es una decisión pendiente
(sección 12). Solo la capa de servicios de cada módulo puede importar de
aquí; ningún módulo accede a los datos de otro directamente (regla de
frontera, sección 3.4).
