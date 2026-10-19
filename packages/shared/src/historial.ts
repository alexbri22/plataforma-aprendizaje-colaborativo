/*
 * Contrato de la consulta cronológica del historial (nucleo §5.5, incremento
 * "Espacio de equipo y cierre de fase" de §11.2). Es la versión mínima: sin
 * filtros ni agregación de ediciones consecutivas, que son Fase B (§11.3,
 * incremento "Cierre y consulta"). Sí paginada por cursor, como exige
 * cualquier relación sin cota (nucleo §3.1): el historial de una actividad
 * larga no tiene límite de filas. La visibilidad por rol (general §7.3) ya
 * se aplicó en el servidor al construir la lista: lo que llega es lo que el
 * actor puede ver, nada que el cliente tenga que recortar.
 *
 * Fuentes: docs/diseno-desarrollo-general.md §4.4, §5.5, §7.3, §8.1.
 *          docs/diseno-desarrollo-nucleo.md §3.1, §5.1, §5.2, §5.5.
 */

export type CategoriaEvento = 'aportacion' | 'estructura' | 'evaluacion'

export interface EventoHistorial {
  id: string
  tipoEvento: string
  tipoEntidad: string
  idEntidad: string
  categoria: CategoriaEvento
  /** Nulo cuando el actor es el sistema (general §4.4: "id_usuario_actor...
   * anulable"), p. ej. una transición automática por vencimiento de fecha. */
  actor: string | null
  /** Suficiente para entender el evento sin consultar la entidad afectada
   * (nucleo §5.1): su forma depende de tipoEvento. */
  datos: Record<string, unknown>
  fecha: string
}

export interface PaginaHistorial {
  eventos: EventoHistorial[]
  /** Id del evento desde el que pedir la siguiente página (?cursor=...).
   * Nulo cuando esta página ya llegó al final. */
  cursorSiguiente: string | null
}
