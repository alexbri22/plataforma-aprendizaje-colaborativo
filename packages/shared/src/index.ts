// Tipos del dominio (Actividad, Equipo, Insignia, roles, estados) se añaden
// en Fase A conforme se implementan los módulos correspondientes (ver
// docs/diseno-desarrollo.md, secciones 2.3 y 10).

export const SHARED_PACKAGE_READY = true as const

export {
  ACCIONES_ACTIVIDAD,
  CONFIGURACION_POR_DEFECTO,
  ELEMENTOS_ESPACIO_EQUIPO,
  ESTADOS_FORMACION_EQUIPOS,
  ESTADOS_ELEMENTO_ESPACIO_EQUIPO,
  ESTADOS_PERIODO,
  ESTADOS_POR_FUNCION,
  FUNCIONES_SEGUIMIENTO,
  PERIODICIDADES,
  PERMISOS_COORGANIZADOR,
  PERMISOS_COORGANIZADOR_POR_DEFECTO,
  esEstadoFormacionEquipos,
  parsearEstadoEspacioEquipo,
  serializarEstadoEspacioEquipo,
} from './actividades.js'

export type {
  AccionActividad,
  ElementoEspacioEquipo,
  EstadoElementoEspacioEquipo,
  EstadoEspacioEquipo,
  EstadoFormacionEquipos,
  EstadoPeriodo,
  FuncionSeguimiento,
  Periodicidad,
  PeriodoReporte,
  PermisoCoorganizador,
} from './actividades.js'

export {
  CATALOGO_INSIGNIAS,
  CATEGORIAS_INSIGNIA,
  FRASES_SUGERIDAS,
  FUENTES_OTORGAMIENTO,
  MAXIMO_RECONOCIMIENTOS,
  MINIMO_RECONOCIMIENTOS,
  NIVELES,
  NIVELES_INSIGNIA,
  PROPORCION_RECONOCIMIENTOS,
  PUNTOS_POR_FUENTE,
  definicionCategoria,
  definicionNivel,
  nivelParaPuntos,
  progresoDeNivel,
  personasReconocibles,
} from './insignias.js'

export type {
  CategoriaInsignia,
  DefinicionCategoria,
  DefinicionNivel,
  FuenteOtorgamiento,
  NivelInsignia,
  ProgresoNivel,
  RangoCategoria,
} from './insignias.js'

export {
  LIMITE_MAXIMO_TAMANO_EQUIPO,
  LONGITUD_MAXIMA_NOMBRE_EQUIPO,
  LONGITUD_MAXIMA_TEXTO_EQUIPO,
  SEMILLA_MAXIMA,
  TAMANO_MINIMO_EQUIPO,
} from './equipos.js'

export type {
  Equipo,
  IntegranteEquipo,
  LimitesEquipo,
  ListaEquipos,
  ParticipanteSinEquipo,
  PropuestaEquipos,
  RolIntegrante,
} from './equipos.js'

export {
  ETIQUETAS_NIVEL_ESTUDIOS,
  LADO_FOTO_PERFIL,
  MAX_BYTES_FOTO_PERFIL,
  NIVELES_ESTUDIOS,
  TIPOS_FOTO_PERFIL,
  esTipoFotoPerfil,
} from './perfil.js'

export type { NivelEstudios, TipoFotoPerfil } from './perfil.js'

export { LIMITE_PERIODOS, generarPeriodos } from './periodos.js'

export type { PeriodoGenerado } from './periodos.js'

export {
  EXTENSIONES_ARCHIVO_ELEMENTO,
  LONGITUD_MAXIMA_CONTENIDO_BITACORA,
  LONGITUD_MAXIMA_CONTENIDO_COMENTARIO,
  LONGITUD_MAXIMA_CONTENIDO_ELEMENTO,
  LONGITUD_MAXIMA_ENLACE_ELEMENTO,
  MAX_BYTES_ARCHIVO_ELEMENTO,
  TIPOS_ARCHIVO_ELEMENTO,
  TIPOS_ENTIDAD_COMENTARIO,
  esTipoArchivoElemento,
} from './seguimiento.js'

export type {
  Comentario,
  ArchivoDeElemento,
  ElementoDeEspacioEquipo,
  EntradaBitacora,
  TipoEntidadComentario,
} from './seguimiento.js'

export type { CategoriaEvento, EventoHistorial, PaginaHistorial } from './historial.js'

export {
  AREAS_HABILIDAD,
  DURACION_MAXIMA_RECURSO_MIN,
  ELEMENTOS_COLABORACION,
  ESTATUS_RECURSO,
  ETIQUETAS_AREA,
  ETIQUETAS_ELEMENTO,
  ETIQUETAS_ESTATUS_RECURSO,
  ETIQUETAS_NIVEL_CURSO,
  ETIQUETAS_SECCION,
  ETIQUETAS_TIPO_LECCION,
  ETIQUETAS_TIPO_RECURSO,
  LARGO_MAXIMO_CURSO,
  LARGO_MAXIMO_LECCION,
  LARGO_MAXIMO_REFLEXION,
  LARGO_MAXIMO_RUTA,
  MAX_CURSOS_RUTA,
  MAX_ELEMENTOS_PREFERIDOS,
  MIN_CURSOS_RUTA,
  LARGO_MAXIMO_RECURSO,
  MAX_LECCIONES_CURSO,
  MAX_BYTES_ARCHIVO_RECURSO,
  MIN_LECCIONES_CURSO,
  NIVELES_CURSO,
  POR_PAGINA_ADMIN,
  POR_PAGINA_MAXIMA,
  POR_PAGINA_PUBLICA,
  SECCIONES_FORMATIVAS,
  TIPOS_ARCHIVO_RECURSO,
  TIPOS_CON_ARCHIVO,
  TIPOS_CON_URL,
  TIPOS_LECCION,
  TIPOS_LECTURA,
  TIPOS_RECURSO,
  esAreaHabilidad,
  esElementoColaboracion,
  esEstatusRecurso,
  esNivelCurso,
  esSeccionFormativa,
  esTipoArchivoRecurso,
  esTipoLeccion,
  esTipoRecurso,
  esUrlSegura,
  normalizarBusqueda,
  textoDeBusquedaCatalogo,
} from './formacion.js'

export type {
  AreaHabilidad,
  ElementoColaboracion,
  EstatusCurso,
  EstatusRecurso,
  NivelCurso,
  Paginacion,
  SeccionFormativa,
  TipoLeccion,
  TipoRecurso,
} from './formacion.js'

export { IDS_PISTA, esIdPista } from './ayuda.js'
export type { IdPista } from './ayuda.js'
