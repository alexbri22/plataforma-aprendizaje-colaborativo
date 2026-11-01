import { Button } from '../../components/ui'
import { useRitual } from './useReconocimientos'

export interface AccionesReconocimientoProps {
  idActividad: string
}

/**
 * Accesos a las insignias de una actividad, solo cuando tienen sentido
 * (docs/diseno-desarrollo-insignias.md §3.5). "Reconocer al equipo" aparece
 * mientras el ritual está abierto; "Mis reconocimientos", durante el cierre y
 * después, que es cuando lo recibido se revela.
 *
 * La decisión es del servidor: `abierto` y `aplicados` vienen del contexto del
 * ritual, que ya combina el estado de la actividad con sus fechas. Aquí no se
 * vuelve a calcular la ventana. Mientras carga o si falla no se muestra nada,
 * para que un botón no aparezca y desaparezca.
 */
export function AccionesReconocimiento({ idActividad }: AccionesReconocimientoProps) {
  const ritual = useRitual(idActividad)
  if (!ritual.data) return null

  const { abierto, aplicados } = ritual.data.contexto

  return (
    <>
      {abierto ? (
        <Button variant="ghost" size="sm" to={`/actividades/${idActividad}/reconocer`}>
          Reconocer al equipo
        </Button>
      ) : null}
      {abierto || aplicados ? (
        <Button variant="ghost" size="sm" to={`/actividades/${idActividad}/insignias`}>
          Mis reconocimientos
        </Button>
      ) : null}
    </>
  )
}
