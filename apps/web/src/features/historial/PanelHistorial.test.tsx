import type { EventoHistorial } from '@plataforma/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorHistorial, obtenerHistorial } from './historial.api'
import { PanelHistorial } from './PanelHistorial'

vi.mock('./historial.api', async () => {
  const real = await vi.importActual<typeof import('./historial.api')>('./historial.api')
  return { ...real, obtenerHistorial: vi.fn() }
})

function renderPanel(abierto = true) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const onCerrar = vi.fn()
  const resultado = render(
    <QueryClientProvider client={queryClient}>
      <PanelHistorial idActividad="act-1" abierto={abierto} onCerrar={onCerrar} />
    </QueryClientProvider>,
  )
  return { ...resultado, onCerrar }
}

function evento(sobrescribir: Partial<EventoHistorial> = {}): EventoHistorial {
  return {
    id: 'ev-1',
    tipoEvento: 'equipo_creado',
    tipoEntidad: 'equipo',
    idEntidad: 'e1',
    categoria: 'estructura',
    actor: 'Olga Prueba',
    datos: { nombre: 'Alfa' },
    fecha: '2026-10-01T10:00:00.000Z',
    ...sobrescribir,
  }
}

describe('PanelHistorial', () => {
  beforeEach(() => {
    vi.mocked(obtenerHistorial).mockReset()
  })

  it('no pide nada ni se pinta cuando está cerrado', () => {
    renderPanel(false)
    expect(obtenerHistorial).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('agrupa por día y muestra una fila compacta por evento, sin tarjeta por evento', async () => {
    vi.mocked(obtenerHistorial).mockResolvedValue({
      eventos: [
        evento({ id: 'ev-1', fecha: '2026-10-09T10:00:00.000Z' }),
        evento({
          id: 'ev-2',
          fecha: '2026-10-09T09:00:00.000Z',
          tipoEvento: 'elemento_creado',
          actor: 'Ana García',
          categoria: 'aportacion',
          datos: { tipo: 'metas', extracto: 'Entregar el reporte' },
        }),
        evento({ id: 'ev-3', fecha: '2026-10-01T10:00:00.000Z', datos: { nombre: 'Beta' } }),
      ],
      cursorSiguiente: null,
    })
    renderPanel()

    const panel = await screen.findByRole('dialog')
    expect(await within(panel).findByText('Creó el equipo "Alfa"')).toBeInTheDocument()
    expect(within(panel).getByText('Agregó una meta: "Entregar el reporte"')).toBeInTheDocument()

    // Dos encabezados de día: uno agrupa ev-1 y ev-2 (mismo día), otro ev-3.
    expect(within(panel).getByText('9 oct 2026')).toBeInTheDocument()
    expect(within(panel).getByText('1 oct 2026')).toBeInTheDocument()
  })

  it('un evento del sistema muestra "Sistema" en vez de un actor nulo', async () => {
    vi.mocked(obtenerHistorial).mockResolvedValue({
      eventos: [
        evento({
          tipoEvento: 'fase_avanzada',
          actor: null,
          datos: { faseOrigen: 'formacion_equipos', faseDestino: 'desarrollo' },
        }),
      ],
      cursorSiguiente: null,
    })
    renderPanel()

    const panel = await screen.findByRole('dialog')
    expect(await within(panel).findByText('Sistema')).toBeInTheDocument()
    expect(
      within(panel).getByText('Avanzó de fase: formacion_equipos → desarrollo'),
    ).toBeInTheDocument()
  })

  it('sin eventos todavía, lo dice en vez de una lista vacía', async () => {
    vi.mocked(obtenerHistorial).mockResolvedValue({ eventos: [], cursorSiguiente: null })
    renderPanel()

    expect(await screen.findByText('Todavía no hay nada que mostrar aquí.')).toBeInTheDocument()
  })

  it('muestra un aviso si no se puede cargar el historial', async () => {
    vi.mocked(obtenerHistorial).mockRejectedValue(
      new ErrorHistorial('No pudimos cargar el historial.'),
    )
    renderPanel()

    expect(await screen.findByText('No pudimos cargar el historial.')).toBeInTheDocument()
  })

  // Paginación por cursor (nucleo §3.1): el panel no trae todo el historial
  // de una sola vez.
  it('con más páginas, muestra "Cargar más" y al tocarlo agrega la siguiente página sin perder la primera', async () => {
    const usuario = userEvent.setup()
    vi.mocked(obtenerHistorial).mockImplementation(async (_id, cursor) =>
      cursor === 'ev-1'
        ? {
            eventos: [evento({ id: 'ev-2', fecha: '2026-10-08T10:00:00.000Z' })],
            cursorSiguiente: null,
          }
        : {
            eventos: [evento({ id: 'ev-1', fecha: '2026-10-09T10:00:00.000Z' })],
            cursorSiguiente: 'ev-1',
          },
    )
    renderPanel()

    const panel = await screen.findByRole('dialog')
    await within(panel).findByText('9 oct 2026')
    const botonCargarMas = within(panel).getByRole('button', { name: 'Cargar más' })

    await usuario.click(botonCargarMas)

    await within(panel).findByText('8 oct 2026')
    expect(within(panel).getByText('9 oct 2026')).toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: 'Cargar más' })).not.toBeInTheDocument()
    expect(obtenerHistorial).toHaveBeenCalledWith('act-1', 'ev-1', undefined)
  })
})
