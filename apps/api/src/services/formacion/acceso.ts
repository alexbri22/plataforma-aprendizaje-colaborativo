import {
  ESTATUS_EDITABLES_POR_AUTOR,
  type EstatusRecurso,
  type OrigenContenido,
} from '@plataforma/shared'
import { ErrorPropuestaNoEditable } from '../../errores.js'

/*
 * Quién ve y quién edita un recurso o un curso (docs/diseno-desarrollo-formacion.md
 * §6.3, AUT-01 y nota del incremento 6). La regla vive aquí, en un solo
 * lugar, y la aplican los servicios de recursos y cursos con la fila ya
 * bloqueada; las rutas solo dicen quién llama.
 *
 * - El contenido editorial es del administrador, como hasta ahora.
 * - Una propuesta es de su autor mientras la prepara (borrador o con cambios
 *   solicitados): nadie más la ve, ni el administrador.
 * - Enviada a revisión está congelada: el administrador la ve y decide, y
 *   nadie la edita. Rechazada es definitiva.
 * - Publicada (o retirada después) queda a cargo del administrador, que la
 *   edita en sitio como cualquier contenido. El autor ya no la edita: no hay
 *   versiones (nota del incremento 6).
 */

export type Acceso = { rol: 'admin' } | { rol: 'autor'; idUsuario: string }

export const ADMIN: Acceso = { rol: 'admin' }

export function autor(idUsuario: string): Acceso {
  return { rol: 'autor', idUsuario }
}

export interface EstadoContenido {
  origen: OrigenContenido
  estatus: EstatusRecurso
  idUsuarioAutor: string | null
}

/** Una propuesta que su autor todavía prepara: solo él la ve. */
export function esPrivadaDelAutor(c: EstadoContenido): boolean {
  return c.origen === 'propuesta' && ESTATUS_EDITABLES_POR_AUTOR.includes(c.estatus)
}

/** Si quien llama puede ver el contenido. Si no, se responde 404, igual que
 * si no existiera. */
export function puedeVer(c: EstadoContenido, acceso: Acceso): boolean {
  if (acceso.rol === 'autor') {
    return c.origen === 'propuesta' && c.idUsuarioAutor === acceso.idUsuario
  }
  return !esPrivadaDelAutor(c)
}

/** Por qué quien llama no puede editar lo que sí ve, o null si puede. */
export function motivoNoEditable(c: EstadoContenido, acceso: Acceso): string | null {
  if (acceso.rol === 'autor') {
    if (ESTATUS_EDITABLES_POR_AUTOR.includes(c.estatus)) return null
    switch (c.estatus) {
      case 'en_revision':
        return 'Tu propuesta está en revisión. Para cambiarla, cancela el envío.'
      case 'rechazado':
        return 'Esta propuesta fue rechazada y ya no se edita.'
      default:
        return 'Esta propuesta ya se publicó: los cambios los hace el administrador.'
    }
  }
  if (c.origen === 'editorial' || c.estatus === 'publicado' || c.estatus === 'retirado') {
    return null
  }
  return c.estatus === 'en_revision'
    ? 'Esta propuesta está en revisión: decide sobre ella desde la cola, sin editarla.'
    : 'Esta propuesta fue rechazada y ya no se edita.'
}

export function exigirEditable(c: EstadoContenido, acceso: Acceso): void {
  const motivo = motivoNoEditable(c, acceso)
  if (motivo) throw new ErrorPropuestaNoEditable(motivo)
}

/** Si el administrador puede usar este contenido en otro (un recurso como
 * lección, un curso en una ruta): el editorial siempre; una propuesta, solo
 * una vez publicada. */
export function usableEnElCatalogo(c: Pick<EstadoContenido, 'origen' | 'estatus'>): boolean {
  return c.origen === 'editorial' || c.estatus === 'publicado' || c.estatus === 'retirado'
}
