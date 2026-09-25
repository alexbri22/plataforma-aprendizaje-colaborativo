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
  LONGITUD_MAXIMA_NOMBRE_EQUIPO,
  LONGITUD_MAXIMA_TEXTO_EQUIPO,
  SEMILLA_MAXIMA,
} from './equipos.js'

export type {
  Equipo,
  IntegranteEquipo,
  ListaEquipos,
  ParticipanteSinEquipo,
  PropuestaEquipos,
  RolIntegrante,
} from './equipos.js'
