import { useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { AvisoError, Card, IconoCargando } from '../../components/ui'
import { useActividad } from '../actividades'
import { DesgloseCalificacion } from './DesgloseCalificacion'
import { useDesglose } from './useCalificaciones'
import styles from './PantallaCalificaciones.module.css'

// El desglose de un participante para quien organiza (nucleo §10.6), con la
// captura en contexto: actividades externas, ajuste individual del proyecto
// y bitácora.
export function PantallaDesgloseParticipante() {
  const { id = '', idMembresia = '' } = useParams<{ id: string; idMembresia: string }>()
  const actividad = useActividad(id)
  const desglose = useDesglose(id, idMembresia)
  const marco = {
    seccionActiva: 'actividades' as const,
    contexto: { idActividad: id, seccion: 'calificaciones' } as const,
    volverA: `/actividades/${id}/calificaciones`,
    volverEtiqueta: 'Calificaciones',
  }

  if (actividad.isPending || desglose.isPending) {
    return (
      <AppShell {...marco} titulo="Calificación">
        <div className={styles.cargando}>
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }
  if (actividad.isError || desglose.isError || !actividad.data) {
    return (
      <AppShell {...marco} titulo="Calificación">
        <AvisoError mensaje={desglose.error?.message ?? 'No encontramos esta calificación.'} />
      </AppShell>
    )
  }

  if (actividad.data.fase !== 'cierre' && actividad.data.fase !== 'archivada') {
    return (
      <AppShell {...marco} titulo="Calificación">
        <Card>
          <p className={styles.apagado}>Las calificaciones se ven en el cierre.</p>
        </Card>
      </AppShell>
    )
  }

  return (
    <AppShell {...marco} titulo={desglose.data.nombre}>
      <Card className={styles.tarjeta}>
        {desglose.data.equipo ? (
          <p className={styles.apagado}>Equipo {desglose.data.equipo.nombre}</p>
        ) : null}
        <DesgloseCalificacion
          idActividad={id}
          desglose={desglose.data}
          puedeCapturar={actividad.data.capacidades?.includes('capturar_puntaje') ?? false}
        />
      </Card>
    </AppShell>
  )
}
