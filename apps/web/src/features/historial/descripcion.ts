import type { EventoHistorial } from '@plataforma/shared'
import { FUNCIONES_SIMPLES, infoFase, type FaseActividad } from '../actividades'

// Una frase breve por tipo de evento (nucleo §5.1: "identificación legible").
// Los tipos sin entrada aquí se leen con una etiqueta genérica derivada del
// propio tipoEvento — nunca un evento queda sin texto, y agregar un tipo
// nuevo al catálogo del servidor no rompe esta pantalla.
const DESCRIPCIONES: Partial<Record<string, (datos: Record<string, unknown>) => string>> = {
  actividad_creada: () => 'Creó la actividad',
  fase_avanzada: (d) => `Pasó a la etapa ${etiquetaEtapa(d.faseDestino)}`,
  configuracion_modificada: (d) =>
    d.campo === 'limites_de_tamano'
      ? 'Cambió el tamaño de los equipos'
      : `Cambió la planificación de ${etiquetaFuncion(d.funcion)}`,
  propuesta_generada: (d) =>
    `Sugirió ${d.numeroEquipos ?? 'nuevos'} ${d.numeroEquipos === 1 ? 'equipo' : 'equipos'}`,
  reparto_automatico: () => 'Repartió en equipos a quienes no tenían uno',
  integrante_asignado: (d) =>
    `Asignó a ${d.nombre ?? 'alguien'} al equipo "${nombreDe(d.equipoNuevo)}"`,
  integrante_retirado: (d) =>
    `Retiró a ${d.nombre ?? 'alguien'} del equipo "${nombreDe(d.equipo)}"`,
  integrantes_intercambiados: () => 'Intercambió a dos personas entre equipos',
  periodos_definidos: (d) =>
    d.numeroPeriodos ? `Definió ${d.numeroPeriodos} entregas` : 'Quitó el calendario de entregas',
  periodo_modificado: (d) => `${accionSobrePeriodo(d)} la entrega ${d.orden ?? ''}`.trim(),
  co_organizador_modificado: () => 'Cambió los permisos de un co-organizador',
  equipo_creado: (d) => `Creó el equipo "${d.nombre ?? ''}"`,
  equipo_modificado: (d) => `Editó el equipo "${d.nombre ?? ''}"`,
  equipo_eliminado: (d) => `Eliminó el equipo "${d.nombre ?? ''}"`,
  elemento_creado: (d) => `Agregó ${etiquetaTipo(d.tipo)}: "${recortar(d.extracto)}"`,
  elemento_modificado: (d) => `Editó ${etiquetaTipo(d.tipo)}`,
  elemento_eliminado: (d) => `Eliminó ${etiquetaTipo(d.tipo)}: "${recortar(d.contenido)}"`,
  entrada_bitacora_creada: (d) => `Escribió en la bitácora: "${recortar(d.extracto)}"`,
  entrada_bitacora_modificada: () => 'Editó una entrada de bitácora',
  comentario_escrito: (d) =>
    `Comentó ${etiquetaEntidadComentada(d.tipoEntidadComentada)}: "${recortar(d.extracto)}"`,
  comentario_modificado: (d) =>
    `Editó un comentario sobre ${etiquetaEntidadComentada(d.tipoEntidadComentada)}`,
}

// faseDestino viene del servidor tal cual ('formacion_equipos'): se muestra
// con la misma etiqueta que la etapa tiene en el resto de la app.
// Cancelar o reactivar una entrega emite el mismo evento que mover sus
// fechas (periodos.service, actualizarPeriodo): lo que cambió se lee del
// estado de antes y de después.
function accionSobrePeriodo(datos: Record<string, unknown>): string {
  const antes = (datos.antes as { estado?: string } | undefined)?.estado
  const despues = (datos.despues as { estado?: string } | undefined)?.estado
  if (antes !== 'cancelado' && despues === 'cancelado') return 'Canceló'
  if (antes === 'cancelado' && despues === 'activo') return 'Reactivó'
  return 'Cambió las fechas de'
}

function etiquetaEtapa(valor: unknown): string {
  if (typeof valor !== 'string') return 'siguiente'
  return infoFase(valor as FaseActividad)?.etiqueta ?? valor
}

function etiquetaFuncion(valor: unknown): string {
  if (valor === 'espacio_equipo') return 'Proyecto colaborativo'
  const definicion = FUNCIONES_SIMPLES.find((f) => f.funcion === valor)
  return definicion ? definicion.titulo : 'una función'
}

function nombreDe(valor: unknown): string {
  return typeof valor === 'object' && valor !== null && 'nombre' in valor
    ? String((valor as { nombre: unknown }).nombre)
    : ''
}

function etiquetaEntidadComentada(valor: unknown): string {
  return valor === 'bitacora' ? 'una entrada de bitácora' : 'un elemento del espacio de equipo'
}

function etiquetaTipo(valor: unknown): string {
  if (valor === 'metas') return 'una meta'
  if (valor === 'planeacion') return 'una entrada de la planeación'
  if (valor === 'avances') return 'un avance'
  if (valor === 'recursos') return 'un material'
  if (valor === 'producto') return 'una entrada del producto'
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
