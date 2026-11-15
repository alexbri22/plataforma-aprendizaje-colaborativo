import { EditorCurso } from '../formacion'

// El editor vive en Formación (features/formacion/editor) porque lo comparten
// el panel y quien propone un curso (nota del incremento 6). Aquí solo se abre
// en modo administrador.
export function PantallaEditarCurso() {
  return <EditorCurso modo="admin" />
}
