import { useActividad } from '../../features/actividades'
import { useEquipo } from '../../features/equipos/useEquipos'
import { useRitual } from '../../features/insignias'
import { construirNavActividad, type ContextoNav, type NavActividad } from './construirNavActividad'

export interface EstadoNavActividad {
  /** Mientras no se sabe a qué rama cuelga la actividad. */
  cargando: boolean
  nav: NavActividad | null
  idActividad: string | null
  idEquipo: string | null
  idMiMembresia?: string
}

// Junta lo que la barra de la actividad necesita con las mismas claves de
// query que ya usan las pantallas (actividad, equipo, ritual): al navegar
// entre secciones todo sale de la caché y la barra no parpadea.
export function useNavActividad(contexto: ContextoNav | undefined): EstadoNavActividad {
  const idEquipoContexto = contexto && 'idEquipo' in contexto ? contexto.idEquipo : ''
  const idActividadContexto = contexto && 'idActividad' in contexto ? contexto.idActividad : ''

  // Desde un equipo, la actividad sale del equipo. El equipo propio
  // (idMiEquipo) se pide aparte para nombrar "Mi equipo: X", salvo que sea
  // el mismo que se está viendo.
  const equipoContexto = useEquipo(idEquipoContexto, { enabled: Boolean(idEquipoContexto) })
  const idActividad = idActividadContexto || equipoContexto.data?.idActividad || ''
  const actividadQuery = useActividad(idActividad, { enabled: Boolean(idActividad) })
  const actividad = actividadQuery.data

  const idMiEquipo = actividad?.idMiEquipo ?? ''
  const necesitaMiEquipo = Boolean(idMiEquipo) && idMiEquipo !== idEquipoContexto
  const miEquipoQuery = useEquipo(idMiEquipo, { enabled: necesitaMiEquipo })

  const ritualQuery = useRitual(idActividad, { enabled: Boolean(idActividad) })

  if (!contexto) {
    return { cargando: false, nav: null, idActividad: null, idEquipo: null }
  }

  const equipo = idEquipoContexto ? equipoContexto.data : undefined
  const miEquipo = necesitaMiEquipo ? miEquipoQuery.data : equipo
  const nav = actividad
    ? construirNavActividad({
        actividad,
        equipo,
        miEquipo,
        ritual: ritualQuery.data?.contexto,
        contexto,
      })
    : null

  return {
    // Un query deshabilitado también queda "pending": solo un error corta la espera.
    cargando: !actividad && !actividadQuery.isError && !equipoContexto.isError,
    nav,
    idActividad: idActividad || null,
    idEquipo: idEquipoContexto || null,
    idMiMembresia: actividad?.idMiMembresia,
  }
}
