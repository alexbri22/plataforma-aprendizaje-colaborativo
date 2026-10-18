import type { PeriodoReporte } from '@plataforma/shared'
import { PanelLateral } from '../../components/ui'
import type { CambiosPeriodo } from './actividades.api'
import { FilaPeriodo } from './PanelCalendarioAvances'
import styles from './PanelCalendarioAvances.module.css'

export interface PanelCalendarioProcesoColaborativoProps {
  titulo: string
  periodos: PeriodoReporte[]
  abierto: boolean
  onCerrar: () => void
  onCambiarPeriodo: (idPeriodo: string, cambios: CambiosPeriodo) => void
}

// Mismo ajuste "uno a uno" que PanelCalendarioAvances (mover fechas o
// cancelar un periodo), pero sobre el calendario de una tarea de Proceso
// colaborativo: vive solo en SeccionProcesoColaborativo, no en el servidor.
export function PanelCalendarioProcesoColaborativo({
  titulo,
  periodos,
  abierto,
  onCerrar,
  onCambiarPeriodo,
}: PanelCalendarioProcesoColaborativoProps) {
  return (
    <PanelLateral
      abierto={abierto}
      titulo={`Calendario — ${titulo}`}
      descripcion="Ajusta las fechas de cada periodo o cancela los que no se harán."
      onCerrar={onCerrar}
    >
      <ul className={styles.lista}>
        {periodos.map((periodo) => (
          <FilaPeriodo
            key={`${periodo.id}:${periodo.fechaInicio}:${periodo.fechaFin}:${periodo.estado}`}
            periodo={periodo}
            deshabilitado={false}
            nombreSingular="Periodo"
            onGuardar={onCambiarPeriodo}
          />
        ))}
      </ul>
    </PanelLateral>
  )
}
