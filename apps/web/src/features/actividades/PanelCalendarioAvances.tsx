import type { PeriodoReporte } from '@plataforma/shared'
import { useState } from 'react'
import { Badge, Button, Input, PanelLateral } from '../../components/ui'
import { ErrorActividad, type CambiosPeriodo } from './actividades.api'
import { IndicadorCampo, MENSAJE_ERROR_GUARDADO, type EstadoCampo } from './IndicadorCampo'
import { useActualizarPeriodoMutation } from './useActividades'
import styles from './PanelCalendarioAvances.module.css'

export interface FilaPeriodoProps {
  periodo: PeriodoReporte
  deshabilitado: boolean
  onGuardar: (idPeriodo: string, cambios: CambiosPeriodo) => void
  /** "Avance" por defecto; PanelCalendarioProcesoColaborativo pasa el nombre
   * de su propia tarea ("Periodo") para no hablar de "avances" fuera de
   * Proyecto colaborativo. */
  nombreSingular?: string
}

export function FilaPeriodo({
  periodo,
  deshabilitado,
  onGuardar,
  nombreSingular = 'Avance',
}: FilaPeriodoProps) {
  const [inicio, setInicio] = useState(periodo.fechaInicio)
  const [fin, setFin] = useState(periodo.fechaFin)

  const cancelado = periodo.estado === 'cancelado'
  const cambiado = inicio !== periodo.fechaInicio || fin !== periodo.fechaFin
  // Las fechas son YYYY-MM-DD, así que comparar como texto es comparar fechas.
  const rangoInvalido = inicio === '' || fin === '' || fin < inicio
  const nombreMinuscula = nombreSingular.toLocaleLowerCase('es')

  return (
    <li role="group" aria-label={`${nombreSingular} ${periodo.orden}`} className={styles.fila}>
      <div className={styles.encabezadoFila}>
        <span className={styles.nombre}>
          {nombreSingular} {periodo.orden}
        </span>
        {cancelado ? <Badge variant="neutral">Cancelado</Badge> : null}
      </div>

      <div className={styles.fechas}>
        <Input
          label="Inicio"
          type="date"
          value={inicio}
          onChange={(evento) => setInicio(evento.target.value)}
          disabled={cancelado || deshabilitado}
        />
        <Input
          label="Fin"
          type="date"
          value={fin}
          onChange={(evento) => setFin(evento.target.value)}
          error={cambiado && rangoInvalido ? 'Debe ser igual o posterior al inicio.' : undefined}
          disabled={cancelado || deshabilitado}
        />
      </div>

      <div className={styles.acciones}>
        <Button
          size="sm"
          aria-label={`Guardar fechas del ${nombreMinuscula} ${periodo.orden}`}
          disabled={!cambiado || rangoInvalido || cancelado || deshabilitado}
          onClick={() => onGuardar(periodo.id, { fechaInicio: inicio, fechaFin: fin })}
        >
          Guardar fechas
        </Button>
        <Button
          size="sm"
          variant="secondary"
          aria-label={`${cancelado ? 'Reactivar' : 'Cancelar'} ${nombreMinuscula} ${periodo.orden}`}
          disabled={deshabilitado}
          onClick={() => onGuardar(periodo.id, { estado: cancelado ? 'activo' : 'cancelado' })}
        >
          {cancelado ? `Reactivar ${nombreMinuscula}` : `Cancelar ${nombreMinuscula}`}
        </Button>
      </div>
    </li>
  )
}

export interface PanelCalendarioAvancesProps {
  idActividad: string
  periodos: PeriodoReporte[]
  abierto: boolean
  onCerrar: () => void
  puedeAjustar: boolean
}

// Ajuste "uno a uno" del calendario (docs/diseno-desarrollo-nucleo.md §9.2,
// P-28): mover las fechas de un avance o cancelarlo. Cancelar no borra: el
// avance sigue en la lista, conserva su número y se puede reactivar.
export function PanelCalendarioAvances({
  idActividad,
  periodos,
  abierto,
  onCerrar,
  puedeAjustar,
}: PanelCalendarioAvancesProps) {
  const mutacion = useActualizarPeriodoMutation(idActividad)
  const [estado, setEstado] = useState<EstadoCampo | undefined>()

  async function guardar(idPeriodo: string, cambios: CambiosPeriodo) {
    setEstado({ status: 'guardando' })
    try {
      await mutacion.mutateAsync({ idPeriodo, cambios })
      setEstado({ status: 'guardado' })
    } catch (error) {
      setEstado({
        status: 'error',
        mensaje: error instanceof ErrorActividad ? error.message : MENSAJE_ERROR_GUARDADO,
      })
    }
  }

  return (
    <PanelLateral
      abierto={abierto}
      titulo="Calendario de avances"
      descripcion="Ajusta las fechas de cada avance o cancela los que no se harán. Un avance cancelado sigue en la lista y puedes reactivarlo."
      onCerrar={onCerrar}
    >
      <div className={styles.estado} aria-live="polite">
        <IndicadorCampo estado={estado} />
      </div>

      <ul className={styles.lista}>
        {periodos.map((periodo) => (
          <FilaPeriodo
            key={`${periodo.id}:${periodo.fechaInicio}:${periodo.fechaFin}:${periodo.estado}`}
            periodo={periodo}
            deshabilitado={!puedeAjustar || mutacion.isPending}
            onGuardar={guardar}
          />
        ))}
      </ul>
    </PanelLateral>
  )
}
