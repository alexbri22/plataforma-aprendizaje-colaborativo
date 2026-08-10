/*
 * API pública de la feature. Otras features (el perfil, la lista de
 * participantes de una actividad) importan desde aquí y nunca de un archivo
 * suelto: así la frontera del módulo se ve en el árbol de imports y se puede
 * mover lo de adentro sin romper a nadie.
 */

export { IconoCategoria, type IconoCategoriaProps } from './IconoCategoria'
export { InsigniaCategoria, type InsigniaCategoriaProps } from './InsigniaCategoria'
export { MarcoRango, type MarcoRangoProps, type TamanoMarco } from './MarcoRango'
export { PantallaMuestraInsignias } from './PantallaMuestraInsignias'
export {
  VitrinaInsignias,
  type PuntosPorCategoria,
  type VitrinaInsigniasProps,
} from './VitrinaInsignias'
