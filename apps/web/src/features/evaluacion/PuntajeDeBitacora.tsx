import { ASPECTO_BITACORA, CLAVES_COMPONENTE } from '@plataforma/shared'
import { CampoPuntaje } from './CampoPuntaje'
import { useCapturarPuntajeMutation, useDesglose } from './useCalificaciones'
import styles from './PuntajeDelEquipo.module.css'

interface PuntajeDeBitacoraProps {
  idActividad: string
  /** De quién es la bitácora. */
  idMembresia: string
  puedeCapturar: boolean
}

// El puntaje de la bitácora de un participante, junto a sus entradas: se
// captura donde se lee, durante el desarrollo, sin ver el acumulado (las
// calificaciones se ven en el cierre).
export function PuntajeDeBitacora({
  idActividad,
  idMembresia,
  puedeCapturar,
}: PuntajeDeBitacoraProps) {
  const desglose = useDesglose(idActividad, idMembresia)
  const capturar = useCapturarPuntajeMutation(idActividad)
  const instrumento = desglose.data?.componentes
    .find((c) => c.clave === CLAVES_COMPONENTE.proyecto)
    ?.aspectos.find((a) => a.clave === ASPECTO_BITACORA)?.instrumentos[0]
  if (!instrumento || instrumento.puntaje.estado === 'no_aplica') return null

  return (
    <div className={styles.puntaje}>
      <span className={styles.etiqueta}>Puntaje de la bitácora</span>
      <CampoPuntaje
        key={instrumento.puntaje.estado === 'valor' ? instrumento.puntaje.valor : 'sin'}
        etiqueta="Puntaje de la bitácora"
        valor={instrumento.puntaje.estado === 'valor' ? instrumento.puntaje.valor : null}
        marcador="—"
        disabled={!puedeCapturar}
        onGuardar={(valor) =>
          capturar.mutateAsync({ idInstrumento: instrumento.id, idMembresia, valor })
        }
      />
    </div>
  )
}
