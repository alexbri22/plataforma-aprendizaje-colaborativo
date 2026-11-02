# Perfil

Mi perfil y el perfil básico de otra persona
(`docs/diseno-desarrollo-nucleo.md` §6.3 y §6.6; concepto §6, "El perfil").

**Estado:** completo contra la API: foto, datos, contraseña, vitrina con
detalle por insignia, y perfil ajeno con datos básicos, foto y rangos.

## Qué hay aquí

| Pieza                     | Para qué                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `PantallaPerfil`          | `/perfil`, desde el nombre del menú. Cabecera; Datos generales (datos y contraseña); Insignias.               |
| `PantallaPerfilDeUsuario` | `/usuarios/:id`. Cabecera con foto y datos básicos, e Insignias de solo lectura. El propio id va a `/perfil`. |
| `FormularioDatosPerfil`   | Nombre y apellidos. Recibe `inicial` y una `key` ligada a él: cambia el dato, se remonta.                     |
| `AvisoSolicitudNombre`    | Solicitud de cambio de nombre pendiente (cancelable), aprobada o rechazada (con motivo).                      |
| `FormularioContrasena`    | Actual, nueva y confirmación. Avisa que las demás sesiones se cierran.                                        |
| `foto.ts`                 | `prepararFoto`: recorta, reduce a 256 px y codifica en WebP/JPEG antes de subir.                              |
| `usePerfil.ts`            | Queries bajo `['usuarios', ...]` y mutaciones que actualizan también `CLAVE_SESION`.                          |

## Por qué es una feature aparte

Compone `cuentas` (datos, contraseña, foto) e `insignias` (vitrina, frases,
progreso). No vive en `cuentas` porque el `AppShell` importa de `cuentas` para
pintar la sesión, y una pantalla de `cuentas` que use el `AppShell` cierra un
ciclo que en Vitest se manifiesta como "No QueryClient set" cuando se mockea
el módulo.

## La foto

La reducción se hace en el navegador y no en el servidor: el API corre como
función sin sistema de archivos ni decodificador de imágenes, así que recibe
la foto ya lista y solo comprueba tipo, firma y tamaño. Los límites
(`TIPOS_FOTO_PERFIL`, `LADO_FOTO_PERFIL`, `MAX_BYTES_FOTO_PERFIL`) están en
`packages/shared` para que ambos lados digan lo mismo.

`prepararFoto` no se prueba en jsdom porque depende de `createImageBitmap` y
del canvas, que jsdom no implementa; lo que sí se prueba es la pantalla con la
subida mockeada y, del lado del API, el rechazo de tipos y firmas.

## El cambio de nombre

Una cuenta de usuario no cambia su nombre: lo solicita, y cambia cuando un
administrador aprueba (§6.3). "Guardar datos" envía la solicitud, el
formulario vuelve al nombre vigente y el aviso de arriba confirma que llegó al
administrador. Mientras está pendiente, `usePerfilPropio` relee el perfil cada
pocos segundos: la aprobación o el rechazo aparecen sin recargar, y al aprobarse
copia el nombre nuevo a la sesión para que el menú también cambie. La `key` del
formulario es solo el nombre vigente, así que cancelar o descartar el aviso no
borra lo que se esté escribiendo. Un administrador guarda su nombre
directamente (`directo`).

## Quién ve qué

- **Yo** veo todo: frases con su actividad, avance hacia el siguiente nivel.
- **Otra persona con sesión** ve mis datos básicos (nombre, estudios e
  institución), mi foto y mis rangos (§6.3). El correo solo si lo hice público
  con el interruptor de "Tus datos"; es privado por defecto. No ve frases ni
  avance: eso es de quien recibe y de quien organizó.
- **Quien administra** ve además mi correo aunque sea privado.
- No hay directorio: al perfil ajeno se llega desde la lista de participantes
  (P-11 del general).
