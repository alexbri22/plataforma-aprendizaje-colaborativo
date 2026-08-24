import type { BadgeProps } from '../../components/ui'
import type { FaseActividad } from './tipos'

interface InfoFase {
  etiqueta: string
  variant: BadgeProps['variant']
}

// La fase de cierre usa 'warning' porque requiere una acción próxima de quien
// organiza (calificar, evaluar); la archivada usa 'accent' porque el cierre o
// archivado es uno de los dos únicos usos sancionados de Apothecary Amber
// fuera de insignias (ver DESIGN.md, "The One-Bottle Rule"). 'configuracion'
// comparte variant con 'inscripcion': ambas son fases tempranas que esperan
// una acción de quien organiza, y se agrupan en la misma sección visual
// (ver GRUPO_VISUAL_POR_FASE).
const INFO_POR_FASE: Record<FaseActividad, InfoFase> = {
  configuracion: { etiqueta: 'Configuración', variant: 'primary' },
  inscripcion: { etiqueta: 'Inscripción', variant: 'primary' },
  desarrollo: { etiqueta: 'En desarrollo', variant: 'neutral' },
  cierre: { etiqueta: 'Cierre', variant: 'warning' },
  archivada: { etiqueta: 'Archivada', variant: 'accent' },
}

export function infoFase(fase: FaseActividad): InfoFase {
  return INFO_POR_FASE[fase]
}

// Agrupación visual del dashboard de "Mis actividades": 'configuracion' se
// funde con 'inscripcion' para no fragmentar la lista en una sección más
// (misma decisión ya tomada para la fase de formación de equipos, plegada
// dentro de 'inscripcion' desde tipos.ts). La tarjeta de la actividad sigue
// mostrando su fase exacta vía infoFase(); solo el encabezado de sección se
// funde.
export type GrupoFaseVisual = 'inscripcion' | 'desarrollo' | 'cierre' | 'archivada'

const GRUPO_VISUAL_POR_FASE: Record<FaseActividad, GrupoFaseVisual> = {
  configuracion: 'inscripcion',
  inscripcion: 'inscripcion',
  desarrollo: 'desarrollo',
  cierre: 'cierre',
  archivada: 'archivada',
}

export function grupoVisual(fase: FaseActividad): GrupoFaseVisual {
  return GRUPO_VISUAL_POR_FASE[fase]
}

export const ORDEN_GRUPOS_VISUALES: GrupoFaseVisual[] = [
  'inscripcion',
  'desarrollo',
  'cierre',
  'archivada',
]

export const TITULO_GRUPO_FASE: Record<GrupoFaseVisual, string> = {
  inscripcion: 'Inscripción',
  desarrollo: 'En desarrollo',
  cierre: 'Cierre',
  archivada: 'Archivadas',
}
