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

### El lote está completo

Las 30 piezas existen, y una prueba lo fija: `faltantesDeArte()` debe venir
vacío. Si alguien borra o renombra un archivo, falla ahí y no en una insignia
que calladamente cae al emblema vectorial.

Los tres diagnósticos se quedan, aunque hoy no reporten nada: `faltantesDeArte`,
`ignoradosDeArte` (nombre inválido) y `duplicadosDeArte` (dos archivos por el
mismo emblema). No cuestan nada cuando están vacíos —sus secciones de la
pantalla de muestra ni se renderizan— y son la red para la siguiente vez que
alguien toque la carpeta.

`MarcoRango` e `IconoCategoria` tampoco se van: el marco se usa siempre, y el
emblema vectorial es el titular del estado sin rango, no solo el suplente.

Los marcos de `assets/marcos/` llegaron sin canal alfa —el cuadriculado gris
estaba pintado como píxeles opacos— y se les recuperó la transparencia por
detección del patrón. **El mismo riesgo aplica al arte nuevo:** verifica el alfa
antes de commitear, o las insignias saldrán con un tablero de fondo.

El encuadre de cada marco (`--marco-x`, `--marco-y`, `--marco-diametro` en
`MarcoRango.module.css`) sale de medir su abertura, con dos criterios distintos:
el **diámetro** es el del mayor círculo inscrito en la zona transparente, con
~10 % de respiro; el **centro** es el punto que deja el mismo hueco arriba que
abajo sobre el eje del emblema, que no coincide con el centro de ese círculo ni
con el centroide del área. Es lo que dimensiona y coloca al emblema, y por eso el
emblema no debe traer margen propio — si lo trae, se ve más chico que sus
hermanos.

## Lo que falta

- Otorgamiento: el ritual de cierre con su presupuesto por participante (33 %
  del equipo, techo de 5) y la frase de justificación, cuyo formato sigue sin
  decidirse (concepto, sección 6).
- Acumulado real contra la API, con TanStack Query. Hoy no hay endpoints ni
  cliente de datos en el proyecto.
- Vista de progreso del perfil y vista de grupo del organizador.
