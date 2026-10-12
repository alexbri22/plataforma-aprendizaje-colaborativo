import type { BadgeProps } from '../../components/ui'
import type { FaseActividad } from './tipos'

interface InfoFase {
  etiqueta: string
  variant: BadgeProps['variant']
}

// Cada fase alcanzable tiene su propio color, para distinguirlas de un
// vistazo en "Mis actividades" y en el resumen. 'configuracion' comparte
// variant con 'inscripcion' porque ninguna actividad pasa hoy por ella (nace
// directamente en inscripción, ver la nota de ORDEN_FASES) y por eso no
// compite por un color propio. La fase de cierre usa 'warning' porque
// requiere una acción próxima de quien organiza (calificar, evaluar); la
// archivada usa 'accent' porque el cierre o archivado es uno de los dos
// únicos usos sancionados de Apothecary Amber fuera de insignias (ver
// DESIGN.md, "The One-Bottle Rule").
const INFO_POR_FASE: Record<FaseActividad, InfoFase> = {
  configuracion: { etiqueta: 'Configuración', variant: 'primary' },
  inscripcion: { etiqueta: 'Inscripción', variant: 'primary' },
  formacion_equipos: { etiqueta: 'Formación de equipos', variant: 'success' },
  desarrollo: { etiqueta: 'En desarrollo', variant: 'neutral' },
  cierre: { etiqueta: 'Cierre', variant: 'warning' },
  archivada: { etiqueta: 'Archivada', variant: 'accent' },
}

export function infoFase(fase: FaseActividad): InfoFase {
  return INFO_POR_FASE[fase]
}

// Orden de las opciones del filtro por estado en "Mis actividades". Cada
// opción usa la misma etiqueta que la píldora de la tarjeta (infoFase()),
// así que lo que se filtra coincide con lo que se ve. Sin 'configuracion':
// las actividades nacen en 'inscripcion' y ninguna pasa por ahí todavía
// (docs/diseno-desarrollo-general.md §5.1); agregarla cuando exista la
// transición manual.
export const ORDEN_FASES: FaseActividad[] = [
  'inscripcion',
  'formacion_equipos',
  'desarrollo',
  'cierre',
  'archivada',
]
