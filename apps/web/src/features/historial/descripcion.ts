import type { EventoHistorial } from '@plataforma/shared'

// Una frase breve por tipo de evento (nucleo §5.1: "identificación legible").
// Los tipos sin entrada aquí se leen con una etiqueta genérica derivada del
// propio tipoEvento — nunca un evento queda sin texto, y agregar un tipo
// nuevo al catálogo del servidor no rompe esta pantalla.
const DESCRIPCIONES: Partial<Record<string, (datos: Record<string, unknown>) => string>> = {
  actividad_creada: () => 'Creó la actividad',
  fase_avanzada: (d) => `Avanzó de fase: ${d.faseOrigen ?? '?'} → ${d.faseDestino ?? '?'}`,
  configuracion_modificada: (d) => `Cambió la configuración de ${d.funcion ?? 'una función'}`,
  equipo_creado: (d) => `Creó el equipo "${d.nombre ?? ''}"`,
  equipo_modificado: (d) => `Editó el equipo "${d.nombre ?? ''}"`,
  equipo_eliminado: (d) => `Eliminó el equipo "${d.nombre ?? ''}"`,
  elemento_creado: (d) => `Agregó ${etiquetaTipo(d.tipo)}: "${recortar(d.extracto)}"`,
  elemento_modificado: (d) => `Editó ${etiquetaTipo(d.tipo)}`,
  elemento_eliminado: (d) => `Eliminó ${etiquetaTipo(d.tipo)}: "${recortar(d.contenido)}"`,
}

function etiquetaTipo(valor: unknown): string {
  if (valor === 'metas') return 'una meta'
  if (valor === 'avances') return 'un avance'
  if (valor === 'recursos') return 'un recurso'
  return 'un elemento'
}

function recortar(valor: unknown): string {
  if (typeof valor !== 'string') return ''
  return valor.length > 80 ? `${valor.slice(0, 80)}…` : valor
}

function etiquetaGenerica(tipoEvento: string): string {
  return tipoEvento.replaceAll('_', ' ')
}

export function descripcionEvento(evento: EventoHistorial): string {
  const descriptor = DESCRIPCIONES[evento.tipoEvento]
  return descriptor ? descriptor(evento.datos) : etiquetaGenerica(evento.tipoEvento)
}
