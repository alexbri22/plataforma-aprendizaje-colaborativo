import { useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { AvisoError, Card, IconoCargando } from '../../components/ui'
import { useActividad } from '../actividades'
import { DesgloseCalificacion } from './DesgloseCalificacion'
import { useDesglose } from './useCalificaciones'
import styles from './PantallaCalificaciones.module.css'

// Mis resultados (nucleo §10.6): la calificación propia con su desglose,
// solo desde el cierre (P-18 del general), con lo pendiente en 0. Antes, el
// servidor la rechaza y esta pantalla solo avisa cuándo estará. Lo que
// dijeron los pares se ve en su aspecto, en Proceso colaborativo.
export function PantallaMisResultados() {
  const { id = '' } = useParams<{ id: string }>()
  const actividad = useActividad(id)
  const fase = actividad.data?.fase
  const visible =
    actividad.data?.configuracion?.calificacion === 'habilitada' &&
    (fase === 'cierre' || fase === 'archivada')
  const desglose = useDesglose(id, actividad.data?.idMiMembresia ?? '', visible)
  const marco = {
    seccionActiva: 'actividades' as const,
    contexto: { idActividad: id, seccion: 'resultados' } as const,
    titulo: 'Mis resultados',
  }

  if (actividad.isPending || (visible && desglose.isPending)) {
    return (
      <AppShell {...marco}>
        <div className={styles.cargando}>
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }
  if (actividad.isError || !actividad.data) {
    return (
      <AppShell {...marco}>
        <AvisoError mensaje="No encontramos esta actividad, o ya no formas parte de ella." />
      </AppShell>
    )
  }

  return (
    <AppShell {...marco}>
      <Card className={styles.tarjeta}>
        {actividad.data.configuracion?.calificacion !== 'habilitada' ? (
          <p className={styles.apagado}>Esta actividad no tiene calificación.</p>
        ) : !visible ? (
          <p className={styles.apagado}>Tu calificación se verá en el cierre.</p>
        ) : desglose.isError || !desglose.data ? (
          <AvisoError mensaje={desglose.error?.message ?? 'No pudimos cargar tu calificación.'} />
        ) : (
          <DesgloseCalificacion idActividad={id} desglose={desglose.data} puedeCapturar={false} />
        )}
      </Card>
    </AppShell>
  )
}
