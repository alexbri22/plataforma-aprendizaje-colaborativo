# Contenido público

Pantalla de inicio y recursos formativos accesibles sin sesión (ver sección
3.4 de `docs/diseno-desarrollo-general.md`, plano de cuenta Público).

**Estado:** `PantallaInicio` implementada como entry point real de
`apps/web` (ver `main.tsx`). Registro/ingreso y las páginas de recursos e
insignias que enlaza aún no existen — sus acciones son intencionalmente
inertes hasta que esas features se construyan.

Convención de la carpeta: componentes, queries (TanStack Query) y stores
(Zustand, adopción diferida) de esta feature viven aquí. Los componentes
visuales consumen `components/ui/` y los tokens de `DESIGN.md`; no se
estiliza desde cero dentro de la feature.
