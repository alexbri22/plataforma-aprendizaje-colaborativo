import { esPuntajeValido } from '@plataforma/shared'
import { useState } from 'react'
import { Input } from '../../components/ui'
import {
  IndicadorCampo,
  MENSAJE_ERROR_GUARDADO,
  type EstadoCampo,
} from '../actividades/IndicadorCampo'
import styles from './CampoPeso.module.css'

interface CampoPuntajeProps {
  /** Para el lector de pantalla: la fila ya dice de qué es. */
  etiqueta: string
  valor: number | null
  /** Texto cuando no hay valor común, p. ej. un equipo con ajustes. */
  marcador?: string
  disabled?: boolean
  /** Guarda el valor nuevo; null lo retira. Lanza si falla. */
  onGuardar: (valor: number | null) => Promise<void>
}

// Un puntaje de 0 a 100 (nucleo §10.3), capturado en la fila donde se ve lo
// que se califica. Se guarda al salir del campo, como los porcentajes;
// vaciarlo lo retira y el instrumento vuelve a quedar pendiente.
export function CampoPuntaje({
  etiqueta,
  valor,
  marcador,
  disabled = false,
  onGuardar,
}: CampoPuntajeProps) {
  const [borrador, setBorrador] = useState<string | null>(null)
  const [estado, setEstado] = useState<EstadoCampo | undefined>()

  async function guardarSiCambio() {
    if (borrador === null) return
    const nuevo = borrador.trim() === '' ? null : Number(borrador)
    if (nuevo !== null && !esPuntajeValido(nuevo)) {
      setEstado({ status: 'error', mensaje: 'De 0 a 100, con hasta dos decimales.' })
      return
    }
    if (nuevo === valor) {
      setBorrador(null)
      return
    }
    setEstado({ status: 'guardando' })
    try {
      await onGuardar(nuevo)
      setBorrador(null)
      setEstado({ status: 'guardado' })
    } catch (error) {
      setEstado({
        status: 'error',
        mensaje: error instanceof Error ? error.message : MENSAJE_ERROR_GUARDADO,
      })
    }
  }

  return (
    <div className={styles.campo}>
      <div className={styles.entrada}>
        <Input
          label={etiqueta}
          ocultarEtiqueta
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step={0.01}
          placeholder={marcador ?? '—'}
          value={borrador ?? (valor === null ? '' : String(valor))}
          disabled={disabled}
          onChange={(e) => setBorrador(e.target.value)}
          onBlur={() => void guardarSiCambio()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void guardarSiCambio()
          }}
        />
      </div>
      <IndicadorCampo estado={estado} />
    </div>
  )
}
