import type { DesgloseCalificacion as Desglose, InstrumentoDelDesglose } from '@plataforma/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DesgloseCalificacion } from './DesgloseCalificacion'

function instrumento(
  id: string,
  nombre: string,
  sobrescribir: Partial<InstrumentoDelDesglose> = {},
): InstrumentoDelDesglose {
  return {
    id,
    nombre,
    origen: 'manual',
    clavePlantilla: null,
    fechaPlanificada: null,
    puntaje: { estado: 'pendiente' },
    pesoEfectivo: 20,
    capturable: true,
    ...sobrescribir,
  }
}

const DESGLOSE: Desglose = {
  idMembresia: 'm1',
  nombre: 'Ana Soto',
  equipo: { id: 'e1', nombre: 'Alfa' },
  valor: 16,
  provisional: true,
  parcial: { valor: 80, cubre: 20 },
  componentes: [
    {
      id: 'c1',
      clave: 'proyecto',
      nombre: 'Proyecto colaborativo',
      pesoEfectivo: 40,
      valor: 40,
      aspectos: [
        {
          id: 'a1',
          clave: 'metas',
          nombre: 'Metas',
          pesoEfectivo: 20,
          valor: 80,
          instrumentos: [instrumento('i1', 'Metas', { puntaje: { estado: 'valor', valor: 80 } })],
        },
      ],
    },
    {
      id: 'c2',
      clave: 'proceso',
      nombre: 'Proceso colaborativo',
      pesoEfectivo: 40,
      valor: 0,
      aspectos: [
        {
          id: 'a2',
          clave: 'interaccion',
          nombre: 'Interacción',
          pesoEfectivo: 40,
          valor: 0,
          instrumentos: [
            instrumento('i2', 'Entrevista 1', { origen: 'enlace' }),
            instrumento('i3', 'Entrevista 2', { origen: 'enlace' }),
          ],
        },
      ],
    },
  ],
}

function renderDesglose() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <DesgloseCalificacion idActividad="act-1" desglose={DESGLOSE} puedeCapturar />
    </QueryClientProvider>,
  )
}

describe('DesgloseCalificacion', () => {
  it('un aspecto con un solo instrumento de su mismo nombre ocupa una sola fila', () => {
    renderDesglose()

    expect(screen.getAllByText('Metas')).toHaveLength(1)
    expect(screen.getByLabelText('Puntaje de Metas')).toHaveValue(80)
  })

  it('un aspecto con varios instrumentos conserva una fila por instrumento', () => {
    renderDesglose()

    expect(screen.getByText('Interacción')).toBeInTheDocument()
    expect(screen.getByLabelText('Puntaje de Entrevista 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Puntaje de Entrevista 2')).toBeInTheDocument()
  })
})
