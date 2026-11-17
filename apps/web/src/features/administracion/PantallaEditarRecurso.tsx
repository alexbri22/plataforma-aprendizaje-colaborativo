import { EditorRecurso } from '../formacion'

// El editor vive en Formación (features/formacion/editor) porque lo comparten
// el panel y quien propone un recurso (nota del incremento 6). Aquí solo se
// abre en modo administrador.
export function PantallaEditarRecurso() {
  return <EditorRecurso modo="admin" />
}
