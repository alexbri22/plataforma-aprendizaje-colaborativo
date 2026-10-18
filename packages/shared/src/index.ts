// Tipos del dominio (Actividad, Equipo, Insignia, roles, estados) se añaden
// en Fase A conforme se implementan los módulos correspondientes (ver
// docs/diseno-desarrollo.md, secciones 2.3 y 10).

export const SHARED_PACKAGE_READY = true as const

export {
  ACCIONES_ACTIVIDAD,
  CONFIGURACION_POR_DEFECTO,
  ELEMENTOS_ESPACIO_EQUIPO,
  ESTADOS_ELEMENTO_ESPACIO_EQUIPO,
  ESTADOS_PERIODO,
  ESTADOS_POR_FUNCION,
  FUNCIONES_SEGUIMIENTO,
  PERIODICIDADES,
  PERMISOS_COORGANIZADOR,
  PERMISOS_COORGANIZADOR_POR_DEFECTO,
  parsearEstadoEspacioEquipo,
  serializarEstadoEspacioEquipo,
} from './actividades.js'

export type {
  AccionActividad,
  ElementoEspacioEquipo,
  EstadoElementoEspacioEquipo,
  EstadoEspacioEquipo,
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
  AREAS_HABILIDAD,
  DURACION_MAXIMA_RECURSO_MIN,
  ELEMENTOS_COLABORACION,
  ESTATUS_RECURSO,
  ETIQUETAS_AREA,
  ETIQUETAS_ELEMENTO,
  ETIQUETAS_ESTATUS_RECURSO,
  ETIQUETAS_SECCION,
  ETIQUETAS_TIPO_RECURSO,
  LARGO_MAXIMO_RECURSO,
  MAX_BYTES_ARCHIVO_RECURSO,
  POR_PAGINA_ADMIN,
  POR_PAGINA_MAXIMA,
  POR_PAGINA_PUBLICA,
  SECCIONES_FORMATIVAS,
  TIPOS_ARCHIVO_RECURSO,
  TIPOS_CON_ARCHIVO,
  TIPOS_CON_URL,
  TIPOS_LECTURA,
  TIPOS_RECURSO,
  esAreaHabilidad,
  esElementoColaboracion,
  esEstatusRecurso,
  esSeccionFormativa,
  esTipoArchivoRecurso,
  esTipoRecurso,
  esUrlSegura,
  normalizarBusqueda,
} from './formacion.js'

export type {
  AreaHabilidad,
  ElementoColaboracion,
  EstatusRecurso,
  Paginacion,
  SeccionFormativa,
  TipoRecurso,
} from './formacion.js'
