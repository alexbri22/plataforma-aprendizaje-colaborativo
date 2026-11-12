import type { ElementoEspacioEquipo } from '@plataforma/shared'
import { useState } from 'react'
import { Button } from '../../components/ui'
import { CampoPuntaje } from './CampoPuntaje'
import { useCapturarPuntajeDeEquipoMutation, useProyectoPorEquipo } from './useCalificaciones'
import styles from './PuntajeDelEquipo.module.css'

interface PuntajeDelEquipoProps {
  idActividad: string
  idEquipo: string
  elemento: ElementoEspacioEquipo
  puedeCapturar: boolean
}

// El puntaje de un elemento del proyecto para todo el equipo (P-40), junto
// al trabajo que se califica. Se escribe a cada participante del equipo; si
// alguien tiene un ajuste individual, capturar aquí lo reemplaza y se pide
// confirmar.
export function PuntajeDelEquipo({
  idActividad,
  idEquipo,
  elemento,
  puedeCapturar,
}: PuntajeDelEquipoProps) {
  const proyecto = useProyectoPorEquipo(idActividad)
  const capturar = useCapturarPuntajeDeEquipoMutation(idActividad)
  const [pendiente, setPendiente] = useState<{
    confirmar: () => void
    cancelar: () => void
  } | null>(null)

  const equipo = proyecto.data?.find((e) => e.idEquipo === idEquipo)
  const actual = equipo?.elementos.find((e) => e.clave === elemento)
  if (!equipo || !actual) return null

  function guardar(valor: number | null): Promise<void> {
    const enviar = () =>
      capturar.mutateAsync({ idInstrumento: actual!.idInstrumento, idEquipo, valor })
    if (!actual!.ajustado) return enviar()
    return new Promise((resolver, rechazar) =>
      setPendiente({
        confirmar: () => {
          setPendiente(null)
          enviar().then(resolver, rechazar)
        },
        cancelar: () => {
          setPendiente(null)
          rechazar(new Error('Se conservaron los ajustes individuales.'))
        },
      }),
    )
  }

  return (
    <div className={styles.puntaje}>
      <span className={styles.etiqueta}>Puntaje del equipo</span>
      <CampoPuntaje
        key={`${actual.valor}:${actual.ajustado}`}
        etiqueta="Puntaje del equipo"
        valor={actual.valor}
        marcador="—"
        disabled={!puedeCapturar || equipo.integrantes === 0}
        onGuardar={guardar}
      />
      <span className={styles.ayuda}>
        {actual.ajustado
          ? 'Hay ajustes por persona; se ven en el desglose de cada quien.'
          : 'Se asigna a cada participante del equipo.'}
      </span>
      {pendiente ? (
        <div className={styles.confirmacion}>
          <span>Esto reemplaza los ajustes individuales.</span>
          <Button size="sm" onClick={pendiente.confirmar}>
            Reemplazar
          </Button>
          <Button size="sm" variant="secondary" onClick={pendiente.cancelar}>
            Mantener
          </Button>
        </div>
      ) : null}
    </div>
  )
}
