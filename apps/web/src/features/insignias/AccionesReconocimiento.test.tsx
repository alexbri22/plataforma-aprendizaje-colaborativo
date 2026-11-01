import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccionesReconocimiento } from './AccionesReconocimiento'
import { obtenerRitual, type ContextoReconocimiento } from './insignias.api'

vi.mock('./insignias.api', async () => {
  const real = await vi.importActual<typeof import('./insignias.api')>('./insignias.api')
  return { ...real, obtenerRitual: vi.fn() }
})

function contexto(ventana: Pick<ContextoReconocimiento, 'abierto' | 'aplicados'>) {
  return {
    contexto: {
      actividad: { id: 'act-1', nombre: 'Proyecto' },
      rol: 'participante' as const,
      idMembresiaActor: 'm-1',
      companeros: [],
      presupuesto: 1,
      fechaLimite: '2026-11-14',
      ...ventana,
    },
    reconocimientos: [],
  }
}

function montar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AccionesReconocimiento idActividad="act-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AccionesReconocimiento', () => {
  beforeEach(() => {
    vi.mocked(obtenerRitual).mockReset()
  })

  it('antes del cierre no ofrece ninguno de los dos', async () => {
    vi.mocked(obtenerRitual).mockResolvedValue(contexto({ abierto: false, aplicados: false }))
    montar()

    await vi.waitFor(() => expect(obtenerRitual).toHaveBeenCalled())
    expect(screen.queryByRole('link', { name: 'Reconocer al equipo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Mis reconocimientos' })).not.toBeInTheDocument()
  })

  it('durante el cierre ofrece reconocer y ver lo propio', async () => {
    vi.mocked(obtenerRitual).mockResolvedValue(contexto({ abierto: true, aplicados: false }))
    montar()

    expect(await screen.findByRole('link', { name: 'Reconocer al equipo' })).toHaveAttribute(
      'href',
      '/actividades/act-1/reconocer',
    )
    expect(screen.getByRole('link', { name: 'Mis reconocimientos' })).toHaveAttribute(
      'href',
      '/actividades/act-1/insignias',
    )
  })

  it('terminado el cierre solo deja ver lo recibido', async () => {
    vi.mocked(obtenerRitual).mockResolvedValue(contexto({ abierto: false, aplicados: true }))
    montar()

    expect(await screen.findByRole('link', { name: 'Mis reconocimientos' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Reconocer al equipo' })).not.toBeInTheDocument()
  })

  it('si no se puede consultar el ritual no muestra nada', async () => {
    vi.mocked(obtenerRitual).mockRejectedValue(new Error('sin conexión'))
    const { container } = montar()

    await vi.waitFor(() => expect(obtenerRitual).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })
})
