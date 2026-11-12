import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Usuario } from '../cuentas/api'
import { archivarActividad, obtenerActividad } from './actividades.api'
import { PantallaConfirmarCierre } from './PantallaConfirmarCierre'
import type { Actividad } from './tipos'

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  const usuario: Usuario = {
    idUsuario: 'u1',
    nombre: 'Ana',
    apellidoPaterno: 'García',
    apellidoMaterno: 'López',
    correo: 'ana@example.com',
    tipoCuenta: 'usuario',
    fotoUrl: null,
  }
  return {
    ...real,
    obtenerSesionActual: vi.fn().mockResolvedValue(usuario),
    cerrarSesion: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock('./actividades.api', async () => {
  const real = await vi.importActual<typeof import('./actividades.api')>('./actividades.api')
  return { ...real, obtenerActividad: vi.fn(), archivarActividad: vi.fn() }
})

vi.mock('../historial/historial.api', async () => {
  const real = await vi.importActual<typeof import('../historial/historial.api')>(
    '../historial/historial.api',
  )
  return {
    ...real,
    obtenerHistorial: vi.fn().mockResolvedValue({ eventos: [], cursorSiguiente: null }),
  }
})

function renderPantalla(id: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/actividades/${id}/cierre`]}>
        <Routes>
          <Route path="/actividades/:id/cierre" element={<PantallaConfirmarCierre />} />
          <Route
            path="/actividades/:id/resumen"
            element={<p>Datos de la actividad (pantalla)</p>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const EN_CIERRE: Actividad = {
  id: 'act-1',
  nombre: 'Club de robótica',
  objetivo: 'Construir un brazo robótico.',
  fase: 'cierre',
  rol: 'organizador',
  numParticipantes: 4,
  fechaClave: 'Clave: ROBOT2XY',
  nombreOrganizador: 'Ana García López',
  fechaInicio: '2026-09-01',
  fechaTermino: '2026-11-01',
  plazoCierreDias: 10,
  capacidades: ['archivar'],
}

describe('PantallaConfirmarCierre', () => {
  beforeEach(() => {
    vi.mocked(obtenerActividad).mockReset().mockResolvedValue(EN_CIERRE)
    vi.mocked(archivarActividad).mockReset()
  })

  it('dice cuándo se archiva sola la actividad', async () => {
    renderPantalla(EN_CIERRE.id)

    // Término 1 nov + 10 días de plazo.
    expect(
      await screen.findByText('Se archiva sola al terminar el 11 nov 2026.'),
    ).toBeInTheDocument()
  })

  it('pide confirmación, avisa lo que implica y solo archiva tras confirmar', async () => {
    vi.mocked(archivarActividad).mockResolvedValueOnce({
      ...EN_CIERRE,
      fase: 'archivada',
      capacidades: [],
    })
    const usuario = userEvent.setup()
    renderPantalla(EN_CIERRE.id)

    await usuario.click(await screen.findByRole('button', { name: 'Archivar ahora' }))
    expect(archivarActividad).not.toHaveBeenCalled()
    expect(screen.getByText(/No tiene vuelta atrás/)).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Sí, archivar' }))
    await waitFor(() => expect(archivarActividad).toHaveBeenCalledWith(EN_CIERRE.id))
  })

  it('cancelar la confirmación no archiva', async () => {
    const usuario = userEvent.setup()
    renderPantalla(EN_CIERRE.id)

    await usuario.click(await screen.findByRole('button', { name: 'Archivar ahora' }))
    await usuario.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByRole('button', { name: 'Archivar ahora' })).toBeInTheDocument()
    expect(archivarActividad).not.toHaveBeenCalled()
  })

  it('sin la capacidad de archivar no ofrece el botón', async () => {
    vi.mocked(obtenerActividad).mockResolvedValue({ ...EN_CIERRE, capacidades: [] })
    renderPantalla(EN_CIERRE.id)

    await screen.findByText(/Se archiva sola/)
    expect(screen.queryByRole('button', { name: 'Archivar ahora' })).not.toBeInTheDocument()
  })

  it('una actividad archivada solo informa', async () => {
    vi.mocked(obtenerActividad).mockResolvedValue({
      ...EN_CIERRE,
      fase: 'archivada',
      capacidades: [],
    })
    renderPantalla(EN_CIERRE.id)

    expect(await screen.findByText('Archivada: solo lectura para todos.')).toBeInTheDocument()
  })

  it('quien participa no ve esta pantalla: va a Datos de la actividad', async () => {
    vi.mocked(obtenerActividad).mockResolvedValue({
      ...EN_CIERRE,
      rol: 'participante',
      capacidades: [],
    })
    renderPantalla(EN_CIERRE.id)

    expect(await screen.findByText('Datos de la actividad (pantalla)')).toBeInTheDocument()
  })
})
