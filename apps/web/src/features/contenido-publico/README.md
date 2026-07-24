# Contenido público

Pantalla de inicio y recursos formativos accesibles sin sesión — el contenido
de la sección 7 de `docs/concepto-producto.md` ("Qué es colaborar" / "Cómo
colaborar"), mostrado bajo los nombres de marca "Qué es Co3" y "Colaborar
para aprender" ("Co3" es el nombre de la app). Único punto de entrada del
visitante **Público**: desde aquí solo se llega a contenido introductorio y a
registro/inicio de sesión (sección 2.6 del mismo documento); ninguna otra
función de la plataforma es alcanzable sin cuenta.

**Estado:** pantalla de inicio (`PantallaInicio`) implementada con contenido
estático y es el entry point actual de `apps/web` (`main.tsx` la monta
directamente — reemplazó el esqueleto de Fase 0). Ingresar/Registrarse/
Insignias/Recursos todavía no navegan a nada — quedan pendientes de la
feature `cuentas` y de un router real, ninguno construido aún. El botón "Ver
recursos" de cada sección es el mismo tipo de stub: apunta a donde
eventualmente vivirá la lista real de recursos (texto, PDF, video, enlace)
que carga el Administrador; por ahora el copy es la descripción fija del
concepto.

Convención de la carpeta: componentes, queries (TanStack Query) y stores
(Zustand, adopción diferida — sección 2.1) de esta feature viven aquí. Los
componentes visuales consumen `components/ui/` y los tokens de `DESIGN.md`;
no se estiliza desde cero dentro de la feature.
