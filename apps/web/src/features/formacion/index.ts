/*
 * Módulo Formación (docs/diseno-desarrollo-formacion.md §9.4): catálogo,
 * visor de recursos y, más adelante, cursos y progreso. El panel de
 * administración consume sus hooks y su API; no llama al servidor por su
 * cuenta.
 */
export { PantallaRecursos } from './PantallaRecursos'
export { PantallaRecurso } from './PantallaRecurso'
export { Markdown } from './Markdown'
export { formatoTamano } from './formato'
export { ErrorFormacion, urlArchivo, urlArchivoAdmin } from './formacion.api'
export type { DatosRecurso, RecursoAdmin, RecursoPublico, ResumenRecurso } from './formacion.api'
export {
  useActualizarRecurso,
  useCrearRecurso,
  useEliminarRecurso,
  useQuitarArchivoRecurso,
  useRecursoAdmin,
  useRecursoPublico,
  useRecursosAdmin,
  useRecursosPublicos,
  useSubirArchivoRecurso,
} from './useRecursos'
