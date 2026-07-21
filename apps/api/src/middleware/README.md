# middleware/

Capa de middleware de la cadena rutas → middleware → servicios → acceso a
datos (ver sección 2.2 de `docs/diseno-desarrollo.md`).

**Estado:** pendiente de implementación — Fase A/B.

- **Autenticación** — verifica sesión.
- **Autorización** — aplica la matriz de permisos por rol (sección 7). El
  cliente nunca es la barrera de autorización, solo oculta acciones no
  disponibles (ver `CLAUDE.md`).
- **Auditoría** — captura transversal de eventos hacia el historial (sección
  8), automática desde el primer commit de cada feature, no un recordatorio
  manual por endpoint.
