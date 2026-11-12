import { useState } from 'react'
import { Input } from '../../components/ui'
import {
  IndicadorCampo,
  MENSAJE_ERROR_GUARDADO,
  type EstadoCampo,
} from '../actividades/IndicadorCampo'
import { ErrorPonderacion } from './ponderacion.api'
import { useGuardarPesoMutation } from './usePonderacion'
import styles from './CampoPeso.module.css'

interface CampoPesoProps {
  idActividad: string
  parte: 'componente' | 'aspecto'
  id: string
  /** Nombre de la parte, para el lector de pantalla: la fila ya lo muestra. */
  nombre: string
  peso: number
  /** Apagada por su función: vale 0 y no se edita (aspectoDeshabilitado). */
  apagado: boolean
  puedeEditar: boolean
}

// El porcentaje de una parte de la calificación (general §4.2), editable en la
// fila donde ya está esa parte. Se guarda al salir del campo, como el resto de
// la planificación; la suma de su nivel la avisa quien lo contiene.
export function CampoPeso({
  idActividad,
  parte,
  id,
  nombre,
  peso,
  apagado,
  puedeEditar,
}: CampoPesoProps) {
  const guardar = useGuardarPesoMutation(idActividad)
  const [borrador, setBorrador] = useState<string | null>(null)
  const [estado, setEstado] = useState<EstadoCampo | undefined>()

  async function guardarSiCambio() {
    if (borrador === null) return
    const valor = Number(borrador)
    if (borrador.trim() === '' || !Number.isInteger(valor) || valor < 0 || valor > 100) {
      setEstado({ status: 'error', mensaje: 'Un entero de 0 a 100.' })
      return
    }
    if (valor === peso) {
      setBorrador(null)
      return
    }
    setEstado({ status: 'guardando' })
    try {
      await guardar.mutateAsync({ parte, id, peso: valor })
      setBorrador(null)
      setEstado({ status: 'guardado' })
    } catch (error) {
      setEstado({
        status: 'error',
        mensaje: error instanceof ErrorPonderacion ? error.message : MENSAJE_ERROR_GUARDADO,
      })
    }
  }

  return (
    <div className={styles.campo}>
      <div className={styles.entrada}>
        <Input
          label={`Porcentaje de ${nombre}`}
          ocultarEtiqueta
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          step={1}
          value={apagado ? '0' : (borrador ?? String(peso))}
          disabled={apagado || !puedeEditar}
          endAdornment="%"
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
