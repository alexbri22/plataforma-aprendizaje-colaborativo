import type { EstatusRecurso } from '@plataforma/shared'

/*
 * Aviso que el editor de recursos deja al volver a la lista del panel. Viaja
 * en el estado de la navegación (no en la URL): es una confirmación de una
 * sola vez, que no debe reaparecer al recargar ni al compartir el enlace.
 */

export type AccionRecurso =
  'creado' | 'publicado' | 'guardado' | 'retirado' | 'republicado' | 'eliminado'

export interface AvisoContenido {
  idRecurso: string
  titulo: string
  accion: AccionRecurso
  /** Estatus con el que quedó el recurso; null si se eliminó. */
  estatus: EstatusRecurso | null
}

export function esAvisoContenido(valor: unknown): valor is AvisoContenido {
  if (!valor || typeof valor !== 'object') return false
  const v = valor as Record<string, unknown>
  return (
    typeof v.idRecurso === 'string' && typeof v.titulo === 'string' && typeof v.accion === 'string'
  )
}

export function mensajeDeAviso({ titulo, accion }: AvisoContenido): {
  titulo: string
  detalle: string
} {
  const nombre = `«${titulo}»`
  switch (accion) {
    case 'creado':
      return {
        titulo: 'Borrador guardado',
        detalle: `${nombre} se guardó como borrador. Todavía no aparece en Recursos.`,
      }
    case 'publicado':
      return { titulo: 'Recurso publicado', detalle: `${nombre} ya aparece en Recursos.` }
    case 'republicado':
      return {
        titulo: 'Recurso publicado de nuevo',
        detalle: `${nombre} vuelve a aparecer en Recursos.`,
      }
    case 'guardado':
      return { titulo: 'Cambios guardados', detalle: `Se guardaron los cambios de ${nombre}.` }
    case 'retirado':
      return {
        titulo: 'Recurso retirado',
        detalle: `${nombre} ya no aparece en Recursos. Puedes volver a publicarlo cuando quieras.`,
      }
    case 'eliminado':
      return { titulo: 'Recurso eliminado', detalle: `Se eliminó ${nombre}.` }
  }
}
