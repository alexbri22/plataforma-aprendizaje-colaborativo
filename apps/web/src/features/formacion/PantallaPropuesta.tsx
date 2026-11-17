import { EditorCurso } from './editor/EditorCurso'
import { EditorRecurso } from './editor/EditorRecurso'

/** Proponer o editar mi recurso (/propuestas/recursos/nuevo y /:id). */
export function PantallaPropuestaRecurso() {
  return <EditorRecurso modo="autor" />
}

/** Proponer o editar mi curso (/propuestas/cursos/nuevo y /:id). */
export function PantallaPropuestaCurso() {
  return <EditorCurso modo="autor" />
}
