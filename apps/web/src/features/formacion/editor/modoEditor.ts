import {
  ESTATUS_EDITABLES_POR_AUTOR,
  type EstatusRecurso,
  type OrigenContenido,
} from '@plataforma/shared'

/** Quién usa el editor: el panel o quien propone (nota del incremento 6). */
export type ModoEditor = 'admin' | 'autor'

/**
 * Si el editor muestra el contenido sin dejar editarlo. Es la misma regla que
 * aplica el servidor (acceso.ts del API): la interfaz solo evita ofrecer lo
 * que se rechazaría. El autor edita su propuesta en borrador o con cambios
 * solicitados; el administrador no edita una propuesta en revisión ni una
 * rechazada.
 */
export function esSoloLectura(
  modo: ModoEditor,
  c: { estatus: EstatusRecurso; origen: OrigenContenido },
): boolean {
  if (modo === 'autor') return !ESTATUS_EDITABLES_POR_AUTOR.includes(c.estatus)
  return c.origen === 'propuesta' && (c.estatus === 'en_revision' || c.estatus === 'rechazado')
}
