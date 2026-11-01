import {
  ETIQUETAS_TIPO_LECCION,
  ETIQUETAS_TIPO_RECURSO,
  type TipoLeccion,
  type TipoRecurso,
} from '@plataforma/shared'

export function formatoDuracion(minutos: number | null, tipo?: TipoRecurso): string | null {
  if (minutos === null) return null
  return tipo === 'texto' ? `${minutos} min de lectura` : `${minutos} min`
}

export function formatoTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.0', '')} MB`
}

export function etiquetaTipo(tipo: TipoRecurso): string {
  return ETIQUETAS_TIPO_RECURSO[tipo]
}

/** Qué es una lección, para el índice: el tipo de recurso que reutiliza o su
 * tipo propio (Lectura, Práctica, Reflexión). */
export function etiquetaLeccion(l: {
  tipo: TipoLeccion
  tipoRecurso?: TipoRecurso | null
  disponible?: boolean
}): string {
  if (l.tipo !== 'recurso') return ETIQUETAS_TIPO_LECCION[l.tipo]
  if (l.disponible === false) return 'No disponible'
  return l.tipoRecurso ? ETIQUETAS_TIPO_RECURSO[l.tipoRecurso] : 'Recurso'
}
