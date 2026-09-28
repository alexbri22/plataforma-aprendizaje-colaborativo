// Tipos del dominio (Actividad, Equipo, Insignia, roles, estados) se añaden
// en Fase A conforme se implementan los módulos correspondientes (ver
// docs/diseno-desarrollo.md, secciones 2.3 y 10).

export const SHARED_PACKAGE_READY = true as const

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
