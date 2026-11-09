import { Navigate, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Card, IconoCargando } from '../../components/ui'
import { AccionAdelantar } from './EtapasActividad'
import { formatearFecha } from './formato'
import { finDelCierre } from './guiaEtapa'
import { useActividad, useArchivarMutation } from './useActividades'
import type { Actividad } from './tipos'
import styles from './PantallaConfirmarCierre.module.css'

function estadoCierre(actividad: Actividad): string {
  const fin = finDelCierre(actividad)
  switch (actividad.fase) {
    case 'archivada':
      return 'Archivada: solo lectura para todos.'
    case 'cierre':
      return fin
        ? `Se archiva sola al terminar el ${formatearFecha(fin)}.`
        : 'Se archiva sola al vencer el plazo de cierre.'
    default:
      return 'Se podrá archivar cuando la actividad esté en cierre.'
  }
}

function Archivar({ actividad }: { actividad: Actividad }) {
  const archivar = useArchivarMutation(actividad.id)
  if (!actividad.capacidades?.includes('archivar')) return null
  return (
    <AccionAdelantar
      pregunta="¿Ya terminó todo? Puedes archivar la actividad antes de la fecha."
      textoBoton="Archivar ahora"
      textoConfirmacion="La actividad queda de solo lectura para todos y se cierra el reconocimiento entre compañeros: quien no haya reconocido ya no podrá hacerlo. No tiene vuelta atrás."
      textoBotonConfirmar="Sí, archivar"
      textoBotonCargando="Archivando…"
      mensajeErrorGenerico="No pudimos archivar la actividad. Intenta de nuevo."
      mutacion={archivar}
    />
  )
}

// Confirmar cierre (Cierre, solo quien organiza): Cierre → Archivada. Pasa
// sola al vencer el plazo de cierre; aquí se adelanta.
export function PantallaConfirmarCierre() {
  const { id = '' } = useParams<{ id: string }>()
  const actividadQuery = useActividad(id)
  const contexto = { idActividad: id, seccion: 'cierre' } as const
  const titulo = 'Confirmar cierre de actividad'

  if (actividadQuery.isPending) {
    return (
      <AppShell seccionActiva="actividades" titulo={titulo} contexto={contexto}>
        <div className={styles.cargando} role="status" aria-label="Cargando el cierre">
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }

  if (actividadQuery.isError || !actividadQuery.data) {
    return (
      <AppShell seccionActiva="actividades" titulo="Actividad no encontrada">
        <p className={styles.texto}>No encontramos esta actividad, o ya no formas parte de ella.</p>
      </AppShell>
    )
  }

  const actividad = actividadQuery.data
  if (actividad.rol === 'participante') {
    return <Navigate to={`/actividades/${id}/resumen`} replace />
  }

  return (
    <AppShell seccionActiva="actividades" titulo={titulo} contexto={contexto}>
      <div className={styles.contenido}>
        <Card className={styles.tarjeta}>
          <p className={styles.estado}>{estadoCierre(actividad)}</p>
          <Archivar actividad={actividad} />
        </Card>
      </div>
    </AppShell>
  )
}
