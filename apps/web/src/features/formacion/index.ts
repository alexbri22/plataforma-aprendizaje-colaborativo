/*
 * Módulo Formación (docs/diseno-desarrollo-formacion.md §9.4): catálogo,
 * visor de recursos y, más adelante, cursos y progreso. El panel de
 * administración consume sus hooks y su API; no llama al servidor por su
 * cuenta.
 */
export { PantallaRecursos } from './PantallaRecursos'
export { PantallaRecurso } from './PantallaRecurso'
export { PantallaCurso } from './PantallaCurso'
export { PantallaLeccion } from './PantallaLeccion'
export { PantallaMiFormacion } from './PantallaMiFormacion'
export { PantallaRuta } from './PantallaRuta'
export { Markdown } from './Markdown'
export { etiquetaLeccion, formatoTamano } from './formato'
export { ErrorFormacion, urlArchivo, urlArchivoAdmin } from './formacion.api'
export type {
  CursoAdmin,
  CursoDeRuta,
  DatosRuta,
  ResumenRutaAdmin,
  RutaAdmin,
  DatosCurso,
  DatosLeccion,
  DatosRecurso,
  LeccionAdmin,
  RecursoAdmin,
  RecursoAdminDetalle,
  RecursoPublico,
  ResumenCursoAdmin,
  ResumenRecurso,
} from './formacion.api'
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
export {
  useActualizarCurso,
  useActualizarLeccion,
  useAgregarLeccion,
  useCrearCurso,
  useCursoAdmin,
  useCursosAdmin,
  useEliminarCurso,
  useEliminarLeccion,
  useReordenarLecciones,
} from './useCursos'
export { useValorDiferido } from './useValorDiferido'
export {
  useActualizarRuta,
  useCrearRuta,
  useEliminarRuta,
  useReemplazarCursosRuta,
  useRutaAdmin,
  useRutasAdmin,
} from './useRutas'
