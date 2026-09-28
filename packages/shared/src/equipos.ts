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

/** Ajuste de la función `formacion_equipos` (nucleo §8.8, P-27). Nulo, sin
 * límite. El máximo lo aplica el servidor a todos; el mínimo solo advierte. */
export interface LimitesEquipo {
  minimo: number | null
  maximo: number | null
}

export const LIMITE_MAXIMO_TAMANO_EQUIPO = 100

/** GET /api/actividades/{id}/equipos: los equipos en orden de creación y
 * quiénes quedan sin equipo. Todo miembro ve ambas cosas (P-04). */
export interface ListaEquipos {
  /** Membresía de quien consulta: la pantalla la necesita para saber cuál es
   * su equipo (unirse, salir, editar el suyo). */
  idMiMembresia: string
  limites: LimitesEquipo
  equipos: Equipo[]
  sinEquipo: ParticipanteSinEquipo[]
}

/** POST /api/actividades/{id}/equipos/propuesta: la propuesta ya materializada
 * como equipos normales en formación (nucleo §8.2), con la semilla que la
 * hace reproducible. `numeroEquipos` puede ser menor que
 * `numeroEquiposEsperado` si hay menos participantes que equipos esperados. */
export interface PropuestaEquipos extends ListaEquipos {
  semilla: number
  numeroEquipos: number
  numeroEquiposEsperado: number
}

/** Rango de la semilla: un entero sin signo de 32 bits, lo que admite el
 * generador determinista del reparto. */
export const SEMILLA_MAXIMA = 4294967295
