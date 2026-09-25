/*
 * Contrato de la API de equipos (nucleo §8.6): forma de las respuestas y
 * límites de los campos que validan por igual el servidor y el formulario.
 *
 * Fuentes: docs/diseno-desarrollo-general.md §4.4, §5.2, §6.1, §7.3.
 *          docs/diseno-desarrollo-nucleo.md §8.
 */

export const LONGITUD_MAXIMA_NOMBRE_EQUIPO = 60
export const LONGITUD_MAXIMA_TEXTO_EQUIPO = 500

/** Rol de quien integra un equipo. Organizador y co-organizador pueden
 * integrarlo pero no están obligados (general §7.3, decisión de producto). */
export type RolIntegrante = 'organizador' | 'co-organizador' | 'participante'

export interface IntegranteEquipo {
  idMembresia: string
  nombre: string
  rol: RolIntegrante
}

export interface Equipo {
  id: string
  nombre: string
  /** La llena el propio equipo (general §5.2); nula mientras no lo haga. */
  descripcionActividad: string | null
  formaDeTrabajo: string | null
  integrantes: IntegranteEquipo[]
}

/** Persona activa, con rol participante, que aún no tiene equipo. */
export interface ParticipanteSinEquipo {
  idMembresia: string
  nombre: string
}

/** GET /api/actividades/{id}/equipos: los equipos en orden de creación y
 * quiénes quedan sin equipo. Todo miembro ve ambas cosas (P-04). */
export interface ListaEquipos {
  equipos: Equipo[]
  sinEquipo: ParticipanteSinEquipo[]
}
