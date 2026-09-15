# Perfil

Mi perfil y el perfil básico de otra persona
(`docs/diseno-desarrollo-nucleo.md` §6.3 y §6.6; concepto §6, "El perfil").

**Estado:** completo contra la API: foto, datos, contraseña, vitrina con
detalle por insignia, y perfil ajeno con nombre, foto y rangos.

## Qué hay aquí

| Pieza                     | Para qué                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| `PantallaPerfil`          | `/perfil`. Foto, datos, insignias con `DetalleInsignia` al elegir una, y contraseña.        |
| `PantallaPerfilDeUsuario` | `/usuarios/:id`. Nombre, foto y vitrina de solo lectura. El propio id redirige a `/perfil`. |
| `FormularioDatosPerfil`   | Nombre y apellidos. Recibe `inicial` y una `key` ligada a él: cambia el dato, se remonta.   |
| `FormularioContrasena`    | Actual, nueva y confirmación. Avisa que las demás sesiones se cierran.                      |
| `foto.ts`                 | `prepararFoto`: recorta, reduce a 256 px y codifica en WebP/JPEG antes de subir.            |
| `usePerfil.ts`            | Queries bajo `['usuarios', ...]` y mutaciones que actualizan también `CLAVE_SESION`.        |

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

## Quién ve qué

- **Yo** veo todo: frases con su actividad, avance hacia el siguiente nivel.
- **Otra persona con sesión** ve mi nombre, mi foto y mis rangos. Ni correo ni
  institución (§6.3), ni frases: eso es de quien recibe y de quien organizó.
- No hay directorio: al perfil ajeno se llega desde la lista de participantes
  (P-11 del general).
