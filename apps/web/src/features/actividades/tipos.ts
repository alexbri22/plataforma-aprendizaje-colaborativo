// El ciclo de vida real tiene seis estados (docs/diseno-desarrollo-nucleo.md
// §7.4): configuración, inscripción, formación, desarrollo, cierre y
// archivada. 'formacion' se pliega dentro de 'inscripcion' en este tipo
// porque es transicional y breve; ver fase.ts para cómo 'configuracion'
// también se agrupa visualmente con 'inscripcion' en el dashboard sin dejar
// de ser un valor distinto aquí.
export type FaseActividad = 'configuracion' | 'inscripcion' | 'desarrollo' | 'cierre' | 'archivada'

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
}

export interface InvitacionPendiente {
  id: string
  nombre: string
  objetivo: string
  invitadoPor: string
}
