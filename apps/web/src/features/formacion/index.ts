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
export { PantallaConstancia } from './PantallaConstancia'
// Los editores de recursos y cursos: los usan el panel (modo admin) y quien
// propone (modo autor), con las mismas piezas (nota del incremento 6).
export { EditorCurso } from './editor/EditorCurso'
export { EditorRecurso } from './editor/EditorRecurso'
export { PantallaPropuestaCurso, PantallaPropuestaRecurso } from './PantallaPropuesta'
export { ProveedorMarcasNav } from './ProveedorMarcasNav'
export { useColaRevision, useDecidirRevision, useRevision } from './usePropuestas'
export type {
  ContenidoEnRevision,
  DatosDecision,
  ElementoCola,
  EntradaHistorial,
} from './formacion.api'
export { VistaPreviaCurso, VistaPreviaRecurso } from './editor/VistaPrevia'
export { varianteEstatus } from './editor/varianteEstatus'
export { llevarA } from './editor/llevarA'
export type { Requisito } from './editor/requisitosCurso'
export {
  accionDe,
  esAvisoContenido,
  esAvisoCurso,
  esAvisoRuta,
  mensajeDeAviso,
  mensajeDeAvisoCurso,
  mensajeDeAvisoRuta,
} from './editor/avisoContenido'
export type { AvisoContenido, AvisoCurso, AvisoRuta } from './editor/avisoContenido'
// Lo que el perfil (Cuentas) pinta de Formación: el grupo ya armado, con sus
// datos y su regla de privacidad (nota del incremento 5).
export { ConstanciasEnPerfil } from './ConstanciasEnPerfil'
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
