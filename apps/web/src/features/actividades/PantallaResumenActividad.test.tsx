import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Usuario } from '../cuentas/api'
import { cerrarInscripcion, obtenerActividad, obtenerParticipantes } from './actividades.api'
import { PantallaResumenActividad } from './PantallaResumenActividad'
import type { Actividad, Participante } from './tipos'

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

// Se mockea el módulo en vez de golpear fetch, mismo patrón que
// PantallaCrearActividad.test.tsx y PantallaMisActividades.test.tsx.
vi.mock('./actividades.api', async () => {
  const real = await vi.importActual<typeof import('./actividades.api')>('./actividades.api')
  return {
    ...real,
    obtenerActividad: vi.fn(),
    cerrarInscripcion: vi.fn(),
    obtenerParticipantes: vi.fn().mockResolvedValue([]),
  }
})

function renderPantalla(id: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/actividades/${id}`]}>
        <Routes>
          <Route path="/actividades/:id" element={<PantallaResumenActividad />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const ACTIVIDAD_BASE: Actividad = {
  id: 'act-nueva-1',
  nombre: 'Club de robótica',
  objetivo: 'Construir un brazo robótico.',
  fase: 'inscripcion',
  rol: 'organizador',
  numParticipantes: 1,
  fechaClave: 'Clave: ROBOT2XY',
  claveIngreso: 'ROBOT2XY',
  informacionGeneral: 'Prototipo funcional con reporte técnico.',
  fechaInicio: '2026-09-01',
  fechaTermino: '2026-11-01',
  fechaLimiteInscripcion: '2026-09-05',
  plazoCierreDias: 10,
  numeroEquiposEsperado: 3,
  capacidades: ['configurar_funciones', 'cerrar_inscripcion', 'agregar_coorganizador'],
}

describe('PantallaResumenActividad', () => {
  beforeEach(() => {
    vi.mocked(obtenerActividad).mockReset()
    vi.mocked(cerrarInscripcion).mockReset()
    vi.mocked(obtenerParticipantes).mockReset().mockResolvedValue([])
  })

  it('muestra un aviso cuando la actividad no existe', async () => {
    vi.mocked(obtenerActividad).mockRejectedValueOnce(new Error('No encontramos esta actividad.'))

    renderPantalla('no-existe')

    expect(
      await screen.findByText('No encontramos esta actividad, o ya no formas parte de ella.'),
    ).toBeInTheDocument()
  })

  it('una actividad recién creada ya tiene fase Inscripción y clave de ingreso', async () => {
    const actividad: Actividad = {
      id: 'act-nueva-1',
      nombre: 'Club de robótica',
      objetivo: 'Construir un brazo robótico.',
      fase: 'inscripcion',
      rol: 'organizador',
      numParticipantes: 0,
      fechaClave: 'Clave: ROBOT2XY',
      claveIngreso: 'ROBOT2XY',
      informacionGeneral: 'Prototipo funcional con reporte técnico.',
      fechaInicio: '2026-09-01',
      fechaTermino: '2026-11-01',
      fechaLimiteInscripcion: '2026-09-05',
      plazoCierreDias: 10,
      numeroEquiposEsperado: 3,
    }
    vi.mocked(obtenerActividad).mockResolvedValueOnce(actividad)

    renderPantalla(actividad.id)

    expect(await screen.findByText('Inscripción')).toBeInTheDocument()
    expect(screen.getByText('Clave de ingreso')).toBeInTheDocument()
    expect(screen.getByText(actividad.claveIngreso as string)).toBeInTheDocument()
  })

  it('muestra el botón de cerrar inscripción cuando esa capacidad está presente', async () => {
    vi.mocked(obtenerActividad).mockResolvedValueOnce(ACTIVIDAD_BASE)

    renderPantalla(ACTIVIDAD_BASE.id)

    expect(await screen.findByRole('button', { name: 'Cerrar inscripción' })).toBeInTheDocument()
  })

  it('no muestra ninguna acción de avance para un participante sin esa capacidad', async () => {
    vi.mocked(obtenerActividad).mockResolvedValueOnce({ ...ACTIVIDAD_BASE, rol: 'participante', capacidades: [] })

    renderPantalla(ACTIVIDAD_BASE.id)

    await screen.findByText('Inscripción')
    expect(screen.queryByRole('button', { name: 'Cerrar inscripción' })).not.toBeInTheDocument()
  })

  it('pide confirmación y solo cierra la inscripción tras confirmar', async () => {
    const usuario = userEvent.setup()
    vi.mocked(obtenerActividad).mockResolvedValue(ACTIVIDAD_BASE)
    vi.mocked(cerrarInscripcion).mockResolvedValueOnce({
      ...ACTIVIDAD_BASE,
      capacidades: [],
    })

    renderPantalla(ACTIVIDAD_BASE.id)

    await usuario.click(await screen.findByRole('button', { name: 'Cerrar inscripción' }))
    expect(cerrarInscripcion).not.toHaveBeenCalled()

    await usuario.click(await screen.findByRole('button', { name: 'Sí, cerrar inscripción' }))
    await waitFor(() => expect(cerrarInscripcion).toHaveBeenCalledWith(ACTIVIDAD_BASE.id))
  })

  it('cancelar la confirmación no llama a cerrarInscripcion', async () => {
    const usuario = userEvent.setup()
    vi.mocked(obtenerActividad).mockResolvedValueOnce(ACTIVIDAD_BASE)

    renderPantalla(ACTIVIDAD_BASE.id)

    await usuario.click(await screen.findByRole('button', { name: 'Cerrar inscripción' }))
    await usuario.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByRole('button', { name: 'Cerrar inscripción' })).toBeInTheDocument()
    expect(cerrarInscripcion).not.toHaveBeenCalled()
  })

  it('muestra el estado vacío de participantes cuando nadie se ha unido', async () => {
    vi.mocked(obtenerActividad).mockResolvedValueOnce(ACTIVIDAD_BASE)
    vi.mocked(obtenerParticipantes).mockResolvedValueOnce([])

    renderPantalla(ACTIVIDAD_BASE.id)

    expect(
      await screen.findByText('Nadie se ha unido todavía. Comparte la clave de ingreso para que empiecen a llegar.'),
    ).toBeInTheDocument()
  })

  it('lista a los participantes que se han unido, sin incluir al organizador', async () => {
    vi.mocked(obtenerActividad).mockResolvedValueOnce(ACTIVIDAD_BASE)
    const participantes: Participante[] = [
      { idUsuario: 'org-1', nombre: 'Ada Lovelace', rol: 'organizador', estado: 'activa', fechaUnion: '2026-08-01T12:00:00.000Z' },
      { idUsuario: 'p-1', nombre: 'Grace Hopper', rol: 'participante', estado: 'activa', fechaUnion: '2026-08-02T12:00:00.000Z' },
    ]
    vi.mocked(obtenerParticipantes).mockResolvedValueOnce(participantes)

    renderPantalla(ACTIVIDAD_BASE.id)

    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument()
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument()
    expect(screen.getByText('Participantes (1)')).toBeInTheDocument()
  })
})
