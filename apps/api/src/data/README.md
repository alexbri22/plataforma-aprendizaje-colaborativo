# data/

Capa de acceso a datos de la cadena rutas → middleware → servicios → acceso
a datos (ver sección 2.2 de `docs/diseno-desarrollo-general.md`).

**Estado:** pendiente de implementación. El manejador es PostgreSQL y el
acceso se resuelve con Prisma (sección 2.2 del general; detalle de la capa
en `docs/diseno-desarrollo-nucleo.md`, sección 2.5). Solo la capa de
servicios de cada módulo puede importar de aquí; ningún módulo accede a los
datos de otro directamente (regla de frontera, sección 3.4 del general).
