# Seguimiento

Reportes de trabajo, bitácora individual y espacio de equipo (ver sección 3.4
de `docs/diseno-desarrollo-general.md`).

**Estado:** el contenido del espacio de equipo (metas, avances y recursos,
`PantallaEspacioEquipo`) está implementado — incremento "Espacio de equipo y
cierre de fase" de Fase A (`docs/diseno-desarrollo-nucleo.md`, sección 11.2).
Un elemento `avance` es contenido libre, igual que `meta` y `recurso`, sin
vínculo al calendario de periodos (que vive en Configuración desde antes).

Reportes de trabajo en sus tres modos activos y bitácora individual siguen
pendientes — Fase B (`docs/diseno-desarrollo-general.md`, sección 9.3;
desglose de incrementos en `docs/diseno-desarrollo-nucleo.md`, sección 11.3).
Los campos del reporte estructurado dependen del documento de requerimientos
(sección 4 del general).

Convención de la carpeta: componentes, queries (TanStack Query) y stores
(Zustand, adopción diferida — sección 2.1) de esta feature viven aquí. Los
componentes visuales consumen `components/ui/` y los tokens de `DESIGN.md`;
no se estiliza desde cero dentro de la feature.
