import {
  type CategoriaInsignia,
  definicionCategoria,
  definicionNivel,
  nivelParaPuntos,
} from '@plataforma/shared'

/** Nombre accesible de una insignia: categoría y nivel. Lo usa la propia
 * insignia y cualquier control que la envuelva, para que digan lo mismo. */
export function descripcionDeInsignia(categoria: CategoriaInsignia, puntos: number): string {
  const definicion = definicionCategoria(categoria)
  const nivel = nivelParaPuntos(puntos)
  return nivel
    ? `${definicion.nombre}, nivel ${definicionNivel(nivel).nombre}`
    : `${definicion.nombre}, sin nivel todavía`
}
