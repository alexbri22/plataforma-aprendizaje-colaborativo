import {
  parsearEstadoEspacioEquipo,
  type ElementoEspacioEquipo,
  bitacoraHabilitada,
} from '@plataforma/shared'
import type { Actividad } from './tipos'

// Orden fijo del espacio de equipo, independiente del orden en que
// ELEMENTOS_ESPACIO_EQUIPO los declara.
export const SECCIONES_ESPACIO_EQUIPO: readonly ElementoEspacioEquipo[] = [
  'metas',
  'planeacion',
  'avances',
  'recursos',
  'producto',
]

// Un valor ilegible se trata como habilitado: lo conservador para no ocultar
// una sección por un dato corrupto (mismo criterio que cambiosDeFuncion.ts
// en el servidor).
export function estaHabilitada(actividad: Actividad, seccion: ElementoEspacioEquipo): boolean {
  const serializado = actividad.configuracion?.espacio_equipo
  if (!serializado) return true
  const estado = parsearEstadoEspacioEquipo(serializado)
  return estado === null || estado[seccion] !== 'deshabilitado'
}

export function bitacoraPropiaHabilitada(actividad: Actividad): boolean {
  return (
    actividad.rol === 'participante' &&
    bitacoraHabilitada(actividad.configuracion?.bitacora_individual)
  )
}

/** A qué pantalla del equipo entrar: la primera sección habilitada, o la
 * bitácora propia si el espacio de equipo no tiene ninguna. null si no hay
 * nada a dónde entrar. */
export function primeraSeccionHabilitada(
  actividad: Actividad,
): ElementoEspacioEquipo | 'bitacora' | null {
  const seccion = SECCIONES_ESPACIO_EQUIPO.find((s) => estaHabilitada(actividad, s))
  if (seccion) return seccion
  return bitacoraPropiaHabilitada(actividad) ? 'bitacora' : null
}
