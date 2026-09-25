import type { AccionActividad, FuncionSeguimiento } from '@plataforma/shared'

// Las seis fases del ciclo de vida (docs/diseno-desarrollo-nucleo.md §7.4).
export type FaseActividad =
  'configuracion' | 'inscripcion' | 'formacion_equipos' | 'desarrollo' | 'cierre' | 'archivada'

export type RolActividad = 'organizador' | 'co-organizador' | 'participante'

export interface Actividad {
  id: string
  nombre: string
  objetivo: string
  fase: FaseActividad
  rol: RolActividad
  numParticipantes: number
  /** Texto breve orientado a acción, ej. "Semana 3 de 6" o "Inscripción cierra el 2 de septiembre". */
  fechaClave: string
  /** Solo existe desde que se abre la inscripción (docs/diseno-desarrollo-nucleo.md §7.2). */
  claveIngreso?: string
  // Campos de docs/diseno-desarrollo-general.md §5.1 (relación 'actividades').
  // Opcionales en el tipo porque las fixtures anteriores a esta decisión no
  // los tienen todos; el formulario de creación sí los exige.
  informacionGeneral?: string
  fechaInicio?: string
  fechaTermino?: string
  fechaLimiteInscripcion?: string
  plazoCierreDias?: number
  numeroEquiposEsperado?: number
  // Solo GET /api/actividades/{id} los incluye, no el listado (docs/diseno-desarrollo-nucleo.md
  // §4.3 y §4.2): el conjunto de acciones que el actor puede ejecutar ahora
  // mismo. La pantalla nunca vuelve a evaluar rol ni fase por su cuenta,
  // solo consulta este arreglo.
  capacidades?: AccionActividad[]
  configuracion?: Partial<Record<FuncionSeguimiento, string>>
}

// Lo mínimo que devuelve GET /api/claves/{clave} para decidir si unirse
// (docs/diseno-desarrollo-nucleo.md §3.3): nada que permita distinguir esta
// actividad de otra ajena más allá de lo necesario para esa decisión.
export interface VistaPreviaActividad {
  nombre: string
  objetivo: string
  nombreOrganizador: string
}
