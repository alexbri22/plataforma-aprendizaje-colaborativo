# Cuentas

Registro, sesión, perfil básico y rangos visibles (ver sección 3.4 de
`docs/diseno-desarrollo-general.md`).

**Estado:** `PantallaIngresar` y `PantallaRegistrarse` implementadas
(validación de campos, estados de carga/error, `api.ts` contra
`/api/sesion` y `/api/usuarios` — ver docs/diseno-desarrollo-nucleo.md §6.5).
Esos endpoints todavía no existen en `apps/api`, así que por ahora ambas
pantallas terminan en el aviso de "sin conexión". Perfil básico y rangos visibles siguen pendientes
— Fase A (`docs/diseno-desarrollo-general.md`, sección 9.2; desglose de
incrementos en `docs/diseno-desarrollo-nucleo.md`, sección 11.2).

Convención de la carpeta: componentes, queries (TanStack Query) y stores
(Zustand, adopción diferida — sección 2.1) de esta feature viven aquí. Los
componentes visuales consumen `components/ui/` y los tokens de `DESIGN.md`;
no se estiliza desde cero dentro de la feature.
