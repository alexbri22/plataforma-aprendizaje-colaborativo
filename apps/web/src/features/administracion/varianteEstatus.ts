import type { EstatusRecurso } from '@plataforma/shared'

// El estatus siempre se lee como texto; el color solo acompaña (§12.5 de
// docs/diseno-desarrollo-formacion.md, WCAG: el estado no depende del color).
const VARIANTES: Record<EstatusRecurso, 'success' | 'neutral' | 'warning'> = {
  publicado: 'success',
  borrador: 'neutral',
  retirado: 'warning',
}

export function varianteEstatus(estatus: EstatusRecurso) {
  return VARIANTES[estatus]
}
