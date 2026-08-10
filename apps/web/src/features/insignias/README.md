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
| `IconoCategoria`           | Medallón SVG de una de las seis categorías, sin marco. Se pinta con `currentColor`.         |
| `MarcoRango`               | Envuelve cualquier contenido en el marco de un nivel. Agnóstico de qué enmarca.             |
| `InsigniaCategoria`        | Una categoría con el marco de su rango. Es la unidad reusable del sistema.                  |
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

## Los marcos

`assets/marcos/*.png`, uno por nivel. Los originales que entregó el equipo no
tenían canal alfa: el cuadriculado gris estaba pintado como píxeles opacos. Los
de aquí son esos mismos, con la transparencia recuperada por detección del
patrón, reescalados a 320 px de alto y comprimidos con `pngquant` — de 4.2 MB a
156 KB en total. **Si alguien vuelve a exportarlos, hay que verificar el canal
alfa antes de commitearlos**, o las insignias saldrán con un tablero de fondo.

Las medidas de encuadre de `MarcoRango.module.css` (`--marco-x`, `--marco-y`,
`--marco-diametro`) salen de medir la abertura de cada PNG: el mayor círculo
inscrito en su zona transparente. Difieren entre niveles porque las aberturas
difieren — la del oro es ovalada, la del diamante va desplazada hacia abajo por
la corona. Si se reemplaza un PNG, hay que volver a medir.

## Lo que falta

- Otorgamiento: el ritual de cierre con su presupuesto por participante (33 %
  del equipo, techo de 5) y la frase de justificación, cuyo formato sigue sin
  decidirse (concepto, sección 6).
- Acumulado real contra la API, con TanStack Query. Hoy no hay endpoints ni
  cliente de datos en el proyecto.
- Vista de progreso del perfil y vista de grupo del organizador.
