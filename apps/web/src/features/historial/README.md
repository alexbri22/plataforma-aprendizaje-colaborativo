# Historial

Consulta del historial de auditoría, con visibilidad diferenciada por rol
(el organizador ve todo; el participante ve eventos no sensibles y solo sus
propias calificaciones e insignias — ver sección 7 de
`docs/diseno-desarrollo-general.md`). La captura es transversal y vive en
`apps/api` como middleware (sección 3.4 del general; mecanismo detallado en
`docs/diseno-desarrollo-nucleo.md`, sección 5), no aquí.

**Estado:** consulta cronológica mínima implementada (`PantallaHistorial`),
como parte del incremento "Espacio de equipo y cierre de fase" de Fase A
(`docs/diseno-desarrollo-nucleo.md`, sección 11.2). Sin filtros ni
agregación de ediciones consecutivas todavía — eso es Fase B, incremento
"Cierre y consulta" (sección 11.3). La visibilidad por rol ya se aplica en
el servidor (organizador: todo; participante: aportación y estructura).

Convención de la carpeta: componentes, queries (TanStack Query) y stores
(Zustand, adopción diferida — sección 2.1) de esta feature viven aquí. Los
componentes visuales consumen `components/ui/` y los tokens de `DESIGN.md`;
no se estiliza desde cero dentro de la feature.
