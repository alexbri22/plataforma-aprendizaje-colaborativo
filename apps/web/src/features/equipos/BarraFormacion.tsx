import { TAMANO_MINIMO_EQUIPO, type Equipo, type LimitesEquipo } from '@plataforma/shared'
import { useState } from 'react'
import { Badge, Button, IconoCargando } from '../../components/ui'
import { useCerrarFormacionMutation, useGenerarPropuestaMutation } from './useEquipos'
import styles from './BarraFormacion.module.css'

interface BarraFormacionProps {
  idActividad: string
  /** Nombre corto del estado de la función; nulo si no se conoce. */
  etiqueta: string | undefined
  limites: LimitesEquipo
  equipos: Equipo[]
  numSinEquipo: number
  puedeConfigurar: boolean
  puedePropuesta: boolean
  puedeCerrar: boolean
  onConfigurar: () => void
  onError: (mensaje: string | null) => void
}

// Cuántos equipos nuevos habrá que crear para que quepan quienes no tienen
// equipo, con el máximo de integrantes (P-27). Es el mismo cálculo que hace el
// servidor al cerrar, solo para avisarlo.
function equiposNuevosNecesarios(equipos: Equipo[], numSinEquipo: number, maximo: number | null) {
  if (maximo === null || numSinEquipo === 0) return 0
  const lugares = equipos.reduce(
    (total, e) => total + Math.max(0, maximo - e.integrantes.length),
    0,
  )
  return Math.ceil(Math.max(0, numSinEquipo - lugares) / maximo)
}

const mensajeDe = (error: unknown) =>
  error instanceof Error ? error.message : 'No pudimos completar la acción. Intenta de nuevo.'

type Confirmacion = 'cierre' | 'propuesta' | null

// Todo lo que se hace sobre la formación, en una sola barra y no en una tarjeta
// por botón: cómo se forman los equipos, cuántos quedan sin equipo y las
// acciones (configurar, generar la propuesta, cerrar). Las acciones son
// botones "ghost" para no confundirse con los del encabezado de la pantalla, y
// solo el cierre es primario. Lo irreversible pide confirmar en la misma
// barra. Cada acción aparece solo si el servidor la concede.
export function BarraFormacion({
  idActividad,
  etiqueta,
  limites,
  equipos,
  numSinEquipo,
  puedeConfigurar,
  puedePropuesta,
  puedeCerrar,
  onConfigurar,
  onError,
}: BarraFormacionProps) {
  const [confirmacion, setConfirmacion] = useState<Confirmacion>(null)
  const [generados, setGenerados] = useState<number | null>(null)
  const cerrar = useCerrarFormacionMutation(idActividad)
  const proponer = useGenerarPropuestaMutation(idActividad)
  const trabajando = cerrar.isPending || proponer.isPending

  const nuevos = equiposNuevosNecesarios(equipos, numSinEquipo, limites.maximo)
  const minimo = limites.minimo
  // Por debajo de TAMANO_MINIMO_EQUIPO (P-27 resuelta) el servidor rechaza
  // cerrar — de ahí el rojo en vez del ámbar del mínimo configurado. No se
  // deshabilita el botón por esto: un equipo chico puede completarse con el
  // reparto de quienes están sin equipo al cerrar (el mismo cálculo que hace
  // el servidor, no uno propio de este resumen), así que lo que hoy se ve
  // bajo el mínimo no siempre lo sigue estando después de cerrar.
  const bajoMinimoObligatorio = equipos.filter(
    (e) => e.integrantes.length < TAMANO_MINIMO_EQUIPO,
  ).length
  const bajoMinimoConfigurado =
    minimo === null
      ? 0
      : equipos.filter(
          (e) => e.integrantes.length < minimo && e.integrantes.length >= TAMANO_MINIMO_EQUIPO,
        ).length

  function generarPropuesta() {
    onError(null)
    proponer.mutate(undefined, {
      onSuccess: (propuesta) => {
        setConfirmacion(null)
        setGenerados(propuesta.numeroEquipos)
      },
      onError: (e) => {
        setConfirmacion(null)
        onError(mensajeDe(e))
      },
    })
  }

  function cerrarFormacion() {
    onError(null)
    cerrar.mutate(undefined, {
      onError: (e) => {
        setConfirmacion(null)
        onError(mensajeDe(e))
      },
    })
  }

  const resumen = puedeCerrar ? (
    <>
      {numSinEquipo > 0 ? (
        <Badge variant="warning">{numSinEquipo} sin equipo</Badge>
      ) : equipos.length > 0 ? (
        <Badge variant="success">Todos con equipo</Badge>
      ) : null}
      {nuevos > 0 ? (
        <Badge variant="neutral">
          {nuevos === 1 ? '+1 equipo nuevo' : `+${nuevos} equipos nuevos`}
        </Badge>
      ) : null}
      {bajoMinimoObligatorio > 0 ? (
        <Badge variant="danger">
          {bajoMinimoObligatorio === 1 ? '1 equipo' : `${bajoMinimoObligatorio} equipos`} con menos
          de {TAMANO_MINIMO_EQUIPO}
        </Badge>
      ) : null}
      {bajoMinimoConfigurado > 0 ? (
        <Badge variant="warning">
          {bajoMinimoConfigurado === 1 ? '1 equipo' : `${bajoMinimoConfigurado} equipos`} bajo el
          mínimo
        </Badge>
      ) : null}
    </>
  ) : null

  const cargando = (texto: string) => (
    <>
      <IconoCargando />
      {texto}
    </>
  )

  if (confirmacion === 'cierre') {
    return (
      <div className={styles.barra}>
        <div className={styles.grupo}>
          <span className={styles.pregunta}>¿Cerrar la formación?</span>
          {resumen}
        </div>
        <div className={styles.grupo}>
          <Button size="sm" disabled={trabajando} onClick={cerrarFormacion}>
            {cerrar.isPending ? cargando('Cerrando…') : 'Confirmar cierre'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={trabajando}
            onClick={() => setConfirmacion(null)}
          >
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  if (confirmacion === 'propuesta') {
    return (
      <div className={styles.barra}>
        <span className={styles.pregunta}>
          Reemplaza{' '}
          {equipos.length === 1 ? 'el equipo actual' : `los ${equipos.length} equipos actuales`}.
        </span>
        <div className={styles.grupo}>
          <Button size="sm" disabled={trabajando} onClick={generarPropuesta}>
            {proponer.isPending ? cargando('Generando…') : 'Reemplazar'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={trabajando}
            onClick={() => setConfirmacion(null)}
          >
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.barra}>
      <div className={styles.grupo}>
        {etiqueta ? <Badge variant="primary">{etiqueta}</Badge> : null}
        {limites.maximo !== null ? <Badge variant="neutral">Máx. {limites.maximo}</Badge> : null}
        {limites.minimo !== null ? <Badge variant="neutral">Mín. {limites.minimo}</Badge> : null}
        {resumen}
        {generados !== null ? (
          <span className={styles.estado} role="status">
            Propuesta generada: {generados} {generados === 1 ? 'equipo' : 'equipos'}.
          </span>
        ) : null}
      </div>
      <div className={styles.grupo}>
        {puedeConfigurar ? (
          <Button variant="ghost" size="sm" onClick={onConfigurar}>
            Configurar
          </Button>
        ) : null}
        {puedePropuesta ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={trabajando}
            onClick={equipos.length > 0 ? () => setConfirmacion('propuesta') : generarPropuesta}
          >
            {proponer.isPending
              ? cargando('Generando…')
              : equipos.length > 0
                ? 'Generar otra propuesta'
                : 'Generar propuesta'}
          </Button>
        ) : null}
        {puedeCerrar ? (
          <Button
            size="sm"
            disabled={equipos.length === 0 || trabajando}
            onClick={() => setConfirmacion('cierre')}
          >
            Cerrar la formación
          </Button>
        ) : null}
      </div>
    </div>
  )
}
