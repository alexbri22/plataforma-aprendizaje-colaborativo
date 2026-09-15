# Cuentas

Registro, sesión, perfil básico y rangos visibles (ver sección 3.4 de
`docs/diseno-desarrollo-general.md`).

**Estado:** `PantallaIngresar` y `PantallaRegistrarse` contra `/api/sesion` y
`/api/usuarios`. `api.ts` expone además el cliente del perfil
(`obtenerPerfilPropio`, `actualizarDatosPerfil`, `cambiarContrasena`,
`subirFoto`, `quitarFoto`, `obtenerPerfilDeUsuario`) que consume la feature
`perfil`; las pantallas del perfil viven allá y no aquí para que el `AppShell`,
que depende de esta feature, no dependa de nada que a su vez lo use. Pendientes
de Fase A: verificación de correo y recuperación de contraseña
(`docs/diseno-desarrollo-nucleo.md`, sección 11.2).

`Usuario` trae `fotoUrl` ya absoluta: el API la devuelve relativa a sí mismo y
`api.ts` la completa una sola vez, para que ningún componente tenga que saber
dónde vive el API.

Convención de la carpeta: componentes, queries (TanStack Query) y stores
(Zustand, adopción diferida — sección 2.1) de esta feature viven aquí. Los
componentes visuales consumen `components/ui/` y los tokens de `DESIGN.md`;
no se estiliza desde cero dentro de la feature.
