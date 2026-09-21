# Insignias

Catálogo, otorgamiento, acumulados, niveles y rangos (ver sección 3.4 de
`docs/diseno-desarrollo-general.md`). El modelo del sistema de recompensas está
en la sección 6 de `docs/concepto-producto.md`.

**Estado:** otorgamiento, consulta y acumulado contra la API real
(`apps/api/src/services/insignias/`). Dos deviaciones documentadas en
`docs/diseno-desarrollo-general.md` §4.4: mientras no exista `equipos`, los
compañeros son toda la actividad; y la ventana del ritual se calcula con fechas
porque la transición a `cierre` no existe todavía.

## Qué hay aquí

| Pieza                                   | Para qué                                                                                     |
| --------------------------------------- | -------------------------------------------------------------------------------------------- |
| `arteInsignias`                         | Resuelve el emblema PNG de una categoría y nivel. Tolera los que aún no se han subido.       |
| `MarcoRango`                            | El marco del nivel. Envuelve cualquier contenido; agnóstico de qué enmarca.                  |
| `IconoCategoria`                        | Emblema vectorial de una categoría. Suplente del PNG, y titular del estado sin rango.        |
| `InsigniaCategoria`                     | Marco más emblema. Es la unidad reusable del sistema.                                        |
| `VitrinaInsignias`                      | Las seis insignias de un usuario, para el perfil.                                            |
| `RitualReconocimiento`                  | El reparto de reconocimientos del cierre. Recibe los compañeros y devuelve los borradores.   |
| `insignias.api` / `useReconocimientos`  | Cliente HTTP y queries de TanStack, con claves bajo `['actividades', id]`.                   |
| `PantallaReconocer`                     | `/actividades/:id/reconocer`. El ritual conectado; sirve a participantes y a quien organiza. |
| `PantallaMisReconocimientos`            | `/actividades/:id/insignias`. Lo recibido en la actividad (tras el cierre) y el acumulado.   |
| `PantallaParticipantes`                 | `/actividades/:id/participantes`. Lista; quien organiza enlaza al detalle de cada uno.       |
| `PantallaReconocimientosDeParticipante` | `/actividades/:id/participantes/:idMembresia`. Lo recibido con autoría, solo organiza.       |
| `PantallaMuestraInsignias`              | Ruta `/insignias`. Muestra del arte para revisión, no producto.                              |

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

## El ritual de cierre

`RitualReconocimiento` reparte el presupuesto entre los compañeros del propio
equipo. Tres reglas que vale la pena no perder:

- **El presupuesto lo dicta el servidor**, que conoce el equipo y el rol. El
  cliente no lo recalcula: la regla cambiará al existir equipos y dos fuentes
  para un mismo hecho terminan contradiciéndose. `null` es sin límite —quien
  organiza— y su reconocimiento vale doble.
- **Cuenta personas, no insignias.** Con presupuesto 2 eliges a dos compañeros, y
  a cada uno puedes darle de una a seis insignias, cada una con su frase; lo
  único que no se puede es repetir la misma categoría en la misma persona. A
  quien ya reconociste puedes seguir sumándole insignias aunque el presupuesto se
  haya agotado: no gasta turno nuevo.
- **La frase es guiada con salida a texto libre.** `FRASES_SUGERIDAS` ofrece tres
  por categoría y siempre se puede escribir la propia. Escribir desde cero seis
  veces produce frases de relleno, que valen menos para quien las recibe que una
  prellenada que sí describe lo que hizo.

El anonimato se anuncia antes de empezar, no al terminar: cambia lo que la gente
se atreve a escribir.

`fechaLimite` es obligatoria y no opcional. El botón dice **Guardar**, no
Enviar, porque los reconocimientos se aplican al cerrar la actividad y hasta
entonces se pueden cambiar; sin la fecha, "Guardar" no diría hasta cuándo se
puede volver, que es justo lo que hace útil el cambio. Cuando exista el módulo
de Actividades, sale del cierre de la actividad.

## Quién ve qué

- **Quien lo recibe** ve sus insignias y frases solo cuando el cierre termina,
  y nunca quién se las dio. Revelarlo durante la ventana invita a responder en
  especie, que es justo lo que el anonimato evita.
- **Quien organiza** ve lo de cada participante con autoría y en cualquier
  momento: moderar es parte del cierre, no viene después.
- **Los demás participantes** no ven nada de nadie. La API responde 403; el
  cliente solo oculta el enlace.

## Lo que falta

- Acotar los compañeros al equipo cuando exista `equipos`, y leer la fase de la
  actividad en vez de calcular la ventana con fechas.
- La validación ligera del organizador (alertas de reciprocidad y frases
  vacías) y el descarte de reconocimientos.
- El perfil global, que hoy es la sección "Tu acumulado" de
  `PantallaMisReconocimientos`.
