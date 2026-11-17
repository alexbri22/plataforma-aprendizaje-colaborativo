# Contenido público

Pantalla de inicio y recursos formativos accesibles sin sesión (ver sección
3.4 de `docs/diseno-desarrollo-general.md`, plano de cuenta Público).

**Estado:** `PantallaInicio` es la entrada de `apps/web`. Sus dos "Ver más"
llevan a `PantallaCaracteristicas` (`/caracteristicas`, pública) y a la página
de Recursos de Formación (`/recursos`). Ver la nota de las observaciones de
pantallas en `docs/diseno-desarrollo-formacion.md`.

Convención de la carpeta: componentes, queries (TanStack Query) y stores
(Zustand, adopción diferida) de esta feature viven aquí. Los componentes
visuales consumen `components/ui/` y los tokens de `DESIGN.md`; no se
estiliza desde cero dentro de la feature.
