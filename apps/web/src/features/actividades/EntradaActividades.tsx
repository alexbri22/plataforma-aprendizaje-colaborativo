import { Navigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { IconoCargando } from '../../components/ui'
import { useActividades } from './useActividades'
import styles from './PantallaMisActividades.module.css'

// /actividades, a donde llevan el logo, Ingresar y Crear cuenta: abre la rama
// que la persona usa de verdad, en vez de mandar siempre a Organizo. Quien
// participa (o es nueva y casi siempre llega con una clave) va a Participo;
// solo quien organiza algo vigente va a Organizo.
export function EntradaActividades() {
  const actividadesQuery = useActividades()

  if (actividadesQuery.isPending) {
    return (
      <AppShell seccionActiva="actividades" titulo="Actividades">
        <div className={styles.cargando} role="status" aria-label="Cargando tus actividades">
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }

  const organizaAlgoVigente = (actividadesQuery.data ?? []).some(
    (actividad) => actividad.rol !== 'participante' && actividad.fase !== 'archivada',
  )
  return (
    <Navigate
      to={organizaAlgoVigente ? '/actividades/organizo' : '/actividades/participo'}
      replace
    />
  )
}
