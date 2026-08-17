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
| `arteInsignias`            | Resuelve el emblema PNG de una categoría y nivel. Tolera los que aún no se han subido.      |
| `MarcoRango`               | El marco del nivel. Envuelve cualquier contenido; agnóstico de qué enmarca.                 |
| `IconoCategoria`           | Emblema vectorial de una categoría. Suplente del PNG, y titular del estado sin rango.       |
| `InsigniaCategoria`        | Marco más emblema. Es la unidad reusable del sistema.                                       |
| `VitrinaInsignias`         | Las seis insignias de un usuario, para el perfil.                                           |
| `PantallaMuestraInsignias` | Ruta `/insignias`. Muestra para revisión, no producto — se elimina cuando el perfil exista. |

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

Una insignia son dos capas: el **marco** del nivel (`assets/marcos/`, cinco
archivos) y el **emblema** de la categoría en ese nivel
(`assets/insignias/<categoria>/<nivel>.png`, 30 archivos). El estado sin rango no
lleva emblema propio: usa el hueco punteado del marco y el emblema vectorial en
gris. La convención de nombres y los requisitos de los archivos están en
[`assets/insignias/README.md`](assets/insignias/README.md).

El mapa se arma con `import.meta.glob` y no con imports estáticos, por dos
razones: 30 imports escritos a mano se desincronizan del disco en cuanto alguien
renombra un archivo, y un import estático de un archivo inexistente rompe el
build. Aquí lo que falta simplemente no está en el mapa.

### Mientras falta arte

Una combinación sin emblema PNG conserva su marco y cae al emblema vectorial de
`IconoCategoria`. Puedes subir los archivos por tandas sin romper nada;
`faltantesDeArte()` enumera lo pendiente y la pantalla de muestra lo lista, junto
con dos diagnósticos: archivos que no se cargan por nombre inválido
(`ignoradosDeArte`) y pares que compiten por el mismo emblema
(`duplicadosDeArte`).

Cuando estén los 30, no se borra nada: el marco se usa siempre y el emblema
vectorial sigue siendo el del estado sin rango. Lo único que desaparece es su
papel de suplente, junto con las tres secciones de diagnóstico de la muestra.

Los marcos de `assets/marcos/` llegaron sin canal alfa —el cuadriculado gris
estaba pintado como píxeles opacos— y se les recuperó la transparencia por
detección del patrón. **El mismo riesgo aplica al arte nuevo:** verifica el alfa
antes de commitear, o las insignias saldrán con un tablero de fondo.

El encuadre de cada marco (`--marco-x`, `--marco-y`, `--marco-diametro` en
`MarcoRango.module.css`) sale de medir su abertura: el mayor círculo inscrito en
la zona transparente. Es lo que dimensiona al emblema, y por eso el emblema no
debe traer margen propio — si lo trae, se ve más chico que sus hermanos.

## Lo que falta

- Otorgamiento: el ritual de cierre con su presupuesto por participante (33 %
  del equipo, techo de 5) y la frase de justificación, cuyo formato sigue sin
  decidirse (concepto, sección 6).
- Acumulado real contra la API, con TanStack Query. Hoy no hay endpoints ni
  cliente de datos en el proyecto.
- Vista de progreso del perfil y vista de grupo del organizador.
