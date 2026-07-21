# Historial

Consulta del historial de auditoría, con visibilidad diferenciada por rol
(el organizador ve todo; el participante ve eventos no sensibles y solo sus
propias calificaciones e insignias — ver sección 7). La captura es
transversal y vive en `apps/api` como middleware (sección 3.4), no aquí.

**Estado:** pendiente de implementación — Fase A (`docs/diseno-desarrollo.md`,
sección 10).

Convención de la carpeta: componentes, queries (TanStack Query) y stores
(Zustand, adopción diferida — sección 2.1) de esta feature viven aquí. Los
componentes visuales consumen `components/ui/` y los tokens de `DESIGN.md`;
no se estiliza desde cero dentro de la feature.
