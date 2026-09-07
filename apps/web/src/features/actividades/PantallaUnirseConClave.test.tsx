import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Usuario } from '../cuentas/api'
import { ErrorActividad, buscarActividadPorClave, unirseConClave } from './actividades.api'
import { PantallaUnirseConClave } from './PantallaUnirseConClave'
import type { Actividad, VistaPreviaActividad } from './tipos'

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  const usuario: Usuario = {
    idUsuario: 'u1',
    nombre: 'Ana',
    apellidoPaterno: 'García',
    apellidoMaterno: 'López',
    correo: 'ana@example.com',
    tipoCuenta: 'usuario',
  }
  return {
    ...real,
    obtenerSesionActual: vi.fn().mockResolvedValue(usuario),
    cerrarSesion: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock('./actividades.api', async () => {
  const real = await vi.importActual<typeof import('./actividades.api')>('./actividades.api')
  return { ...real, buscarActividadPorClave: vi.fn(), unirseConClave: vi.fn() }
})

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const real = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...real, useNavigate: () => navigateMock }
})

const VISTA_PREVIA: VistaPreviaActividad = {
  nombre: 'Proyecto de ecosistemas',
  objetivo: 'Investigar el impacto humano en un ecosistema local.',
  nombreOrganizador: 'Ada Lovelace Byron',
}

function renderPantalla() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PantallaUnirseConClave />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PantallaUnirseConClave', () => {
  beforeEach(() => {
    vi.mocked(buscarActividadPorClave).mockReset()
    vi.mocked(unirseConClave).mockReset()
    navigateMock.mockReset()
  })

  it('bloquea la búsqueda si la clave está vacía', async () => {
    renderPantalla()

    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(await screen.findByText('Este campo es obligatorio.')).toBeInTheDocument()
    expect(buscarActividadPorClave).not.toHaveBeenCalled()
  })

  it('muestra la vista previa al encontrar la clave', async () => {
    vi.mocked(buscarActividadPorClave).mockResolvedValueOnce(VISTA_PREVIA)
    renderPantalla()

    await userEvent.type(screen.getByLabelText('Clave de ingreso'), 'eco4h7kp')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(await screen.findByText('Proyecto de ecosistemas')).toBeInTheDocument()
    expect(screen.getByText('Organiza Ada Lovelace Byron')).toBeInTheDocument()
    // El campo se normaliza a mayúsculas, mismo alfabeto de la clave real.
    expect(buscarActividadPorClave).toHaveBeenCalledWith('ECO4H7KP')
  })

  it('muestra un error y permite reintentar si la clave no corresponde a nada', async () => {
    vi.mocked(buscarActividadPorClave).mockRejectedValueOnce(
      new ErrorActividad('Esta clave no corresponde a ninguna actividad.'),
    )
    renderPantalla()

    await userEvent.type(screen.getByLabelText('Clave de ingreso'), 'NOEXISTE')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(
      await screen.findByText('Esta clave no corresponde a ninguna actividad.'),
    ).toBeInTheDocument()
    // Sigue en el formulario, no atascada en un estado de carga.
    expect(screen.getByLabelText('Clave de ingreso')).toBeInTheDocument()
  })

  it('al unirse, navega al resumen de la actividad', async () => {
    vi.mocked(buscarActividadPorClave).mockResolvedValueOnce(VISTA_PREVIA)
    const actividad: Actividad = {
      id: 'act-1',
      nombre: VISTA_PREVIA.nombre,
      objetivo: VISTA_PREVIA.objetivo,
      fase: 'inscripcion',
      rol: 'participante',
      numParticipantes: 1,
      fechaClave: 'Clave: ECO4H7KP',
    }
    vi.mocked(unirseConClave).mockResolvedValueOnce(actividad)

    renderPantalla()

    await userEvent.type(screen.getByLabelText('Clave de ingreso'), 'ECO4H7KP')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    await screen.findByText('Proyecto de ecosistemas')
    await userEvent.click(screen.getByRole('button', { name: 'Unirme' }))

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(`/actividades/${actividad.id}`))
    expect(unirseConClave).toHaveBeenCalledWith('ECO4H7KP')
  })

  it('muestra un error si ya es miembro, sin perder la vista previa', async () => {
    vi.mocked(buscarActividadPorClave).mockResolvedValueOnce(VISTA_PREVIA)
    vi.mocked(unirseConClave).mockRejectedValueOnce(
      new ErrorActividad('Ya formas parte de esta actividad.'),
    )

    renderPantalla()

    await userEvent.type(screen.getByLabelText('Clave de ingreso'), 'ECO4H7KP')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    await screen.findByText('Proyecto de ecosistemas')
    await userEvent.click(screen.getByRole('button', { name: 'Unirme' }))

    expect(await screen.findByText('Ya formas parte de esta actividad.')).toBeInTheDocument()
    expect(screen.getByText('Proyecto de ecosistemas')).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
