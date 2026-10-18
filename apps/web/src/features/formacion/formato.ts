import { ETIQUETAS_TIPO_RECURSO, type TipoRecurso } from '@plataforma/shared'

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

/** Normaliza para buscar sin distinguir mayúsculas ni acentos. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es')
}
