# Administración

Panel del rol Administrador, superficie ops-facing y de alcance acotado
(`apps/web/PRODUCT.md`, "Users"; matriz de permisos en
`docs/diseno-desarrollo-general.md` §7.2). Consume los endpoints
administrativos que expone el módulo de Cuentas del backend
(`docs/diseno-desarrollo-nucleo.md` §6.5), porque el estado de la cuenta es
dominio del núcleo y este panel no escribe sobre sus tablas (§3.4 del general).

**Estado:** implementado el incremento de _ver cuentas + restablecer
contraseña_:

- `PantallaCuentas` — lista de todas las cuentas con su estado, tratada como
  superficie densa tipo Linear (`DESIGN.md` §5): tabla, `Badge` de estado,
  ninguna aparición de Apothecary Amber.
- `ModalRestablecerContrasena` — el administrador fija una nueva contraseña
  (mín. 8, misma regla que el registro). El servidor cierra las sesiones del
  usuario afectado. Es la vía de soporte de respaldo, no la principal: el
  autoservicio por correo depende de P-24 (`docs/diseno-desarrollo-nucleo.md`
  §6.7) y todavía no existe.
- `RutaAdmin` — guard **solo de UX**: consulta `GET /api/sesion` y evita
  mostrar el panel a quien no es administrador. La autorización real la impone
  el servidor con `exigirAdministrador` (§3.5 del general); el cliente nunca es
  la barrera.
- Acceso desde la navegación: `components/Encabezado.tsx` muestra el enlace
  **Cuentas** (`/admin/cuentas`) solo cuando la sesión es de administrador.
  Comparte la misma consulta de sesión (`queryKey: ['sesion']`) que `RutaAdmin`,
  así que no repite la petición. Igual que el guard, es solo UX.

## Cómo se crea el primer administrador

El registro público solo crea cuentas de tipo `usuario`
(`docs/diseno-desarrollo-general.md` §7.2), así que no hay forma de volverse
administrador desde la aplicación. El primer administrador se designa a mano
sobre una cuenta ya registrada, ejecutando desde `apps/api`:

```bash
npm run promover-admin -- correo@ejemplo.com
```

El script vive en `apps/api/scripts/promover-admin.mjs` (declarado en
`apps/api/package.json`). Usa `DATABASE_URL` de `apps/api/.env` y cambia
`tipoCuenta` a `administrador`; avisa si no existe una cuenta con ese correo.
Una vez promovida, esa persona ve el enlace **Cuentas** y puede promover a
otras desde… todavía no: por ahora la promoción es solo por este script.

**Fuera de este incremento:** activar/desactivar cuenta
(`PATCH /api/admin/usuarios/{id}`), gestión del contenido formativo y de los
umbrales de insignias.

Convención de la carpeta: componentes, queries (TanStack Query) y estado de
esta feature viven aquí. Los componentes visuales consumen `components/ui/` y
los tokens de `DESIGN.md`; no se estiliza desde cero dentro de la feature.
