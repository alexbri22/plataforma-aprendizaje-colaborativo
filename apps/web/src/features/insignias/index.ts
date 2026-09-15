/*
 * API pública de la feature. Otras features (el perfil, la lista de
 * participantes de una actividad) importan desde aquí y nunca de un archivo
 * suelto: así la frontera del módulo se ve en el árbol de imports y se puede
 * mover lo de adentro sin romper a nadie.
 */

export {
  duplicadosDeArte,
  emblemaDeInsignia,
  faltantesDeArte,
  ignoradosDeArte,
  type ArchivoIgnorado,
  type FaltanteDeArte,
  type MotivoIgnorado,
} from './arteInsignias'
export { DetalleInsignia, type DetalleInsigniaProps } from './DetalleInsignia'
export { IconoCategoria, type IconoCategoriaProps } from './IconoCategoria'
export { descripcionDeInsignia } from './descripcionDeInsignia'
export { InsigniaCategoria, type InsigniaCategoriaProps } from './InsigniaCategoria'
export { MarcoRango, type MarcoRangoProps, type TamanoMarco } from './MarcoRango'
export { PantallaMuestraInsignias } from './PantallaMuestraInsignias'
export { PantallaMisReconocimientos } from './PantallaMisReconocimientos'
export { PantallaParticipantes } from './PantallaParticipantes'
export { PantallaReconocer } from './PantallaReconocer'
export { PantallaReconocimientosDeParticipante } from './PantallaReconocimientosDeParticipante'
export {
  RitualReconocimiento,
  type IntegranteEquipo,
  type ReconocimientoBorrador,
  type RitualReconocimientoProps,
} from './RitualReconocimiento'
export { useRecibidosEnPerfil } from './useReconocimientos'
export type { ReconocimientoEnPerfil } from './insignias.api'
export {
  VitrinaInsignias,
  type PuntosPorCategoria,
  type VitrinaInsigniasProps,
} from './VitrinaInsignias'
