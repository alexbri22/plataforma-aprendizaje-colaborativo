import {
  NOMBRE_PLANTILLA,
  formatosPara,
  plantillaPara,
  type AspectoDePonderacion,
  type InstrumentoDePonderacion,
  type OrigenInstrumento,
} from '@plataforma/shared'
import { useState } from 'react'
import { Badge, Input, PanelLateral, Select } from '../../components/ui'
import {
  IndicadorCampo,
  MENSAJE_ERROR_GUARDADO,
  type EstadoCampo,
} from '../actividades/IndicadorCampo'
import { ErrorPonderacion, type CambiosInstrumento } from './ponderacion.api'
import { useActualizarInstrumentoMutation } from './usePonderacion'
import styles from './PanelCalendarioInstrumentos.module.css'

// Manual no se elige: es solo del proyecto y la bitácora.
const ETIQUETA_FORMATO: Record<OrigenInstrumento, string> = {
  plantilla: 'Plantilla del sistema',
  enlace: 'Actividad externa',
  manual: 'Captura manual',
}

interface FilaInstanciaProps {
  claveAspecto: string
  instrumento: InstrumentoDePonderacion
  deshabilitado: boolean
  onGuardar: (idInstrumento: string, cambios: CambiosInstrumento) => Promise<void>
}

// Una instancia: su fecha, el formato en que se aplica (la plantilla, si
// existe para su tipo en este aspecto, o una actividad externa) y, si es
// externa, su enlace, que es obligatorio: sin él no hay a dónde ir. Cada
// campo se guarda al cambiar o al salir de él.
function FilaInstancia({
  claveAspecto,
  instrumento,
  deshabilitado,
  onGuardar,
}: FilaInstanciaProps) {
  const [enlace, setEnlace] = useState(instrumento.enlace ?? '')
  const formatos = instrumento.tipo ? formatosPara(claveAspecto, instrumento.tipo) : []
  const plantilla =
    instrumento.tipo && instrumento.origen === 'plantilla'
      ? plantillaPara(claveAspecto, instrumento.tipo)
      : null

  return (
    <li role="group" aria-label={instrumento.nombre} className={styles.fila}>
      <span className={styles.nombre}>
        {instrumento.nombre}
        {instrumento.origen === 'enlace' && !instrumento.enlace ? (
          <Badge variant="warning">Falta el enlace</Badge>
        ) : null}
      </span>
      <div className={styles.campos}>
        <Input
          label="Fecha"
          type="date"
          value={instrumento.fechaPlanificada ?? ''}
          disabled={deshabilitado}
          onChange={(e) =>
            void onGuardar(instrumento.id, { fechaPlanificada: e.target.value || null })
          }
        />
        <Select
          label="Formato"
          ayuda={
            instrumento.conRespuestas
              ? 'Ya tiene respuestas'
              : plantilla
                ? NOMBRE_PLANTILLA[plantilla]
                : undefined
          }
          value={instrumento.origen}
          disabled={deshabilitado || formatos.length < 2 || instrumento.conRespuestas}
          onChange={(e) =>
            void onGuardar(instrumento.id, { formato: e.target.value as OrigenInstrumento })
          }
        >
          {formatos.map((formato) => (
            <option key={formato} value={formato}>
              {ETIQUETA_FORMATO[formato]}
            </option>
          ))}
        </Select>
      </div>
      {instrumento.origen === 'enlace' ? (
        <Input
          label="Enlace de la actividad"
          ayuda="Quien participa lo abre para hacerla fuera de Co3 y después marca aquí que la hizo."
          type="url"
          placeholder="https://"
          value={enlace}
          disabled={deshabilitado}
          onChange={(e) => setEnlace(e.target.value)}
          onBlur={() => {
            if (enlace.trim() !== (instrumento.enlace ?? '')) {
              void onGuardar(instrumento.id, { enlace: enlace.trim() || null })
            }
          }}
        />
      ) : null}
    </li>
  )
}

interface PanelCalendarioInstrumentosProps {
  idActividad: string
  aspecto: AspectoDePonderacion
  puedeAjustar: boolean
  onCerrar: () => void
}

// Calendario de un aspecto del proceso (nucleo §10.1): una fila por instancia,
// como el calendario de Avances. Las fechas todavía no tienen efecto (P-41).
export function PanelCalendarioInstrumentos({
  idActividad,
  aspecto,
  puedeAjustar,
  onCerrar,
}: PanelCalendarioInstrumentosProps) {
  const mutacion = useActualizarInstrumentoMutation(idActividad)
  const [estado, setEstado] = useState<EstadoCampo | undefined>()

  async function guardar(idInstrumento: string, cambios: CambiosInstrumento) {
    setEstado({ status: 'guardando' })
    try {
      await mutacion.mutateAsync({ idInstrumento, cambios })
      setEstado({ status: 'guardado' })
    } catch (error) {
      setEstado({
        status: 'error',
        mensaje: error instanceof ErrorPonderacion ? error.message : MENSAJE_ERROR_GUARDADO,
      })
    }
  }

  return (
    <PanelLateral abierto titulo={`Calendario · ${aspecto.nombre}`} onCerrar={onCerrar}>
      <div className={styles.estado} aria-live="polite">
        <IndicadorCampo estado={estado} />
      </div>
      <ul className={styles.lista}>
        {aspecto.instrumentos.map((instrumento) => (
          <FilaInstancia
            // Una instancia que cambia en el servidor se vuelve a montar con
            // su valor nuevo, en lugar de copiarlo a estado con un efecto.
            key={`${instrumento.id}:${instrumento.origen}:${instrumento.enlace ?? ''}`}
            claveAspecto={aspecto.clave}
            instrumento={instrumento}
            deshabilitado={!puedeAjustar || mutacion.isPending}
            onGuardar={guardar}
          />
        ))}
      </ul>
    </PanelLateral>
  )
}
