# Insignias

Catálogo, otorgamiento, acumulados, niveles y rangos (ver sección 3.4 de
`docs/diseno-desarrollo-general.md`). El modelo del sistema de recompensas está
en la sección 6 de `docs/concepto-producto.md`.

**Estado:** implementada la capa de presentación. El otorgamiento y el acumulado
real están pendientes: dependen de actividades y membresías, que son Fase A del
núcleo y todavía no existen. Hoy los componentes reciben los puntos por props.

## Qué hay aquí

| Pieza                      | Para qué                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| `arteInsignias`            | Resuelve el PNG de una categoría y nivel. Tolera los que aún no se han subido.              |
| `InsigniaCategoria`        | Una categoría con el arte de su rango. Es la unidad reusable del sistema.                   |
| `VitrinaInsignias`         | Las seis insignias de un usuario, para el perfil.                                           |
| `PantallaMuestraInsignias` | Ruta `/insignias`. Muestra para revisión, no producto — se elimina cuando el perfil exista. |
| `IconoCategoria`           | **Provisional.** Medallón SVG, solo como respaldo mientras falte arte.                      |
| `MarcoRango`               | **Provisional.** Marco por nivel, solo como respaldo mientras falte arte.                   |

Se importa desde `index.ts`, nunca de un archivo suelto:

```tsx
import { VitrinaInsignias } from '../insignias'
;<VitrinaInsignias puntos={{ liderazgo: 21, ideas: 4 }} />
```

El nivel **no se recibe por props**: se deriva de los puntos con
`nivelParaPuntos` de `@plataforma/shared`. Dos props para el mismo hecho es una
invitación a que se contradigan, y el estado derivado se calcula al usarlo
(sección 3.6 del general).

## El arte

Un PNG por combinación de categoría y nivel, con el marco y el dibujo horneados
en la misma imagen: `assets/insignias/<categoria>/<nivel>.png`, 36 en total
contando el estado `sin-rango`. La convención de nombres y los requisitos de los
archivos están en [`assets/insignias/README.md`](assets/insignias/README.md).

El mapa se arma con `import.meta.glob` y no con imports estáticos, por dos
razones: 36 imports escritos a mano se desincronizan del disco en cuanto alguien
renombra un archivo, y un import estático de un archivo inexistente rompe el
build. Aquí lo que falta simplemente no está en el mapa.

### Migración en curso

Mientras el lote esté incompleto, cada combinación sin archivo cae a un
**respaldo provisional**: el marco de la primera versión (`assets/marcos/`) con
el medallón SVG de `IconoCategoria` encima. Puedes subir los PNG por tandas sin
romper nada; `faltantesDeArte()` enumera lo que sigue pendiente y la pantalla de
muestra lo lista.

Cuando estén los 36, se borran en un solo cambio:

- `assets/marcos/` y `MarcoRango.tsx` con su CSS
- `IconoCategoria.tsx`
- la rama de respaldo de `InsigniaCategoria.tsx` y las clases `.medallon` y
  `.sinRango` de su CSS
- `faltantesDeArte`, su prueba y la sección "Arte pendiente" de la muestra

Los marcos de `assets/marcos/` llegaron sin canal alfa —el cuadriculado gris
estaba pintado como píxeles opacos— y se les recuperó la transparencia por
detección del patrón. **El mismo riesgo aplica al arte nuevo:** verifica el alfa
antes de commitear, o las insignias saldrán con un tablero de fondo.

## Lo que falta

- Otorgamiento: el ritual de cierre con su presupuesto por participante (33 %
  del equipo, techo de 5) y la frase de justificación, cuyo formato sigue sin
  decidirse (concepto, sección 6).
- Acumulado real contra la API, con TanStack Query. Hoy no hay endpoints ni
  cliente de datos en el proyecto.
- Vista de progreso del perfil y vista de grupo del organizador.
