import type { EventoHistorial } from '@plataforma/shared'

const FORMATO_DIA = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const FORMATO_HORA = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' })

export function formatearDia(fechaIso: string): string {
  return FORMATO_DIA.format(new Date(fechaIso))
}

export function formatearHora(fechaIso: string): string {
  return FORMATO_HORA.format(new Date(fechaIso))
}

export interface GrupoDeEventos {
  dia: string
  eventos: EventoHistorial[]
}

// El servidor ya entrega orden cronológico inverso (nucleo §5.5): agrupar
// solo junta consecutivos del mismo día, sin reordenar.
export function agruparPorDia(eventos: readonly EventoHistorial[]): GrupoDeEventos[] {
  const grupos: GrupoDeEventos[] = []
  for (const evento of eventos) {
    const dia = formatearDia(evento.fecha)
    const actual = grupos.at(-1)
    if (actual?.dia === dia) actual.eventos.push(evento)
    else grupos.push({ dia, eventos: [evento] })
  }
  return grupos
}
