import type { EventoHistorial } from '@plataforma/shared'
import { describe, expect, it } from 'vitest'
import { descripcionEvento } from './descripcion'

function periodoModificado(
  antes: { estado: string; fechaFin: string },
  despues: { estado: string; fechaFin: string },
): EventoHistorial {
  return {
    tipoEvento: 'periodo_modificado',
    datos: {
      orden: 2,
      antes: { fechaInicio: '2026-09-01', ...antes },
      despues: { fechaInicio: '2026-09-01', ...despues },
    },
  } as unknown as EventoHistorial
}

describe('descripcionEvento: periodo_modificado', () => {
  it('mover las fechas de una entrega', () => {
    const evento = periodoModificado(
      { estado: 'activo', fechaFin: '2026-09-07' },
      { estado: 'activo', fechaFin: '2026-09-10' },
    )
    expect(descripcionEvento(evento)).toBe('Cambió las fechas de la entrega 2')
  })

  it('cancelar una entrega no se describe como un cambio de fechas', () => {
    const evento = periodoModificado(
      { estado: 'activo', fechaFin: '2026-09-07' },
      { estado: 'cancelado', fechaFin: '2026-09-07' },
    )
    expect(descripcionEvento(evento)).toBe('Canceló la entrega 2')
  })

  it('reactivar una entrega cancelada', () => {
    const evento = periodoModificado(
      { estado: 'cancelado', fechaFin: '2026-09-07' },
      { estado: 'activo', fechaFin: '2026-09-07' },
    )
    expect(descripcionEvento(evento)).toBe('Reactivó la entrega 2')
  })
})
