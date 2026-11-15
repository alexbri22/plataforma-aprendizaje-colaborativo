import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Usuario } from '../cuentas/api'
import {
  cerrarInscripcion,
  obtenerActividad,
  obtenerParticipantes,
  type Participante,
} from './actividades.api'
import { PantallaInscripcion } from './PantallaInscripcion'
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
  return {
    ...real,
    obtenerActividad: vi.fn(),
    cerrarInscripcion: vi.fn(),
    obtenerParticipantes: vi.fn(),
  }
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
      <MemoryRouter initialEntries={[`/actividades/${id}/inscripcion`]}>
        <Routes>
          <Route path="/actividades/:id/inscripcion" element={<PantallaInscripcion />} />
          <Route
            path="/actividades/:id/resumen"
            element={<p>Datos de la actividad (pantalla)</p>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const ACTIVIDAD: Actividad = {
  id: 'act-1',
  nombre: 'Club de robótica',
  objetivo: 'Construir un brazo robótico.',
  fase: 'inscripcion',
  rol: 'organizador',
  numParticipantes: 2,
  fechaClave: 'Clave: ROBOT2XY',
  claveIngreso: 'ROBOT2XY',
  nombreOrganizador: 'Ana García López',
  fechaInicio: '2026-09-01',
  fechaTermino: '2026-11-01',
  fechaLimiteInscripcion: '2026-09-05',
  plazoCierreDias: 10,
  capacidades: ['configurar_funciones', 'cerrar_inscripcion'],
}

function participante(n: number): Participante {
  return {
    idMembresia: `m${n}`,
    idUsuario: `u${n}`,
    nombre: `Persona ${String(n).padStart(2, '0')}`,
    rol: 'participante',
    fechaUnion: '2026-09-02T15:00:00.000Z',
  }
}

describe('PantallaInscripcion', () => {
  beforeEach(() => {
    vi.mocked(obtenerActividad).mockReset().mockResolvedValue(ACTIVIDAD)
    vi.mocked(cerrarInscripcion).mockReset()
    vi.mocked(obtenerParticipantes)
      .mockReset()
      .mockResolvedValue([participante(1), participante(2)])
  })

  it('muestra la clave de ingreso y hasta cuándo está abierta', async () => {
    renderPantalla(ACTIVIDAD.id)

    expect(await screen.findByText('ROBOT2XY')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument()
    expect(screen.getByText('Abierta hasta el 5 sep 2026')).toBeInTheDocument()
  })

  it('lista a quienes se han unido aquí mismo, sin enviar a otra pantalla', async () => {
    renderPantalla(ACTIVIDAD.id)

    expect(await screen.findByRole('heading', { name: 'Participantes (2)' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Persona 01' })).toHaveAttribute(
      'href',
      '/usuarios/u1',
    )
    expect(screen.getByRole('link', { name: 'Persona 02' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Ver participantes/ })).not.toBeInTheDocument()
  })

  it('pagina la lista de diez en diez', async () => {
    const muchos = Array.from({ length: 12 }, (_, i) => participante(i + 1))
    vi.mocked(obtenerParticipantes).mockResolvedValue(muchos)
    vi.mocked(obtenerActividad).mockResolvedValue({ ...ACTIVIDAD, numParticipantes: 12 })
    const usuario = userEvent.setup()
    renderPantalla(ACTIVIDAD.id)

    expect(await screen.findByRole('link', { name: 'Persona 10' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Persona 11' })).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: /Siguiente/ }))
    expect(await screen.findByRole('link', { name: 'Persona 11' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Persona 01' })).not.toBeInTheDocument()
  })

  it('sin nadie inscrito invita a compartir la clave', async () => {
    vi.mocked(obtenerParticipantes).mockResolvedValue([])
    vi.mocked(obtenerActividad).mockResolvedValue({ ...ACTIVIDAD, numParticipantes: 0 })
    renderPantalla(ACTIVIDAD.id)

    expect(await screen.findByText(/Todavía nadie se ha unido/)).toBeInTheDocument()
  })

  it('pide confirmación y solo cierra la inscripción tras confirmar', async () => {
    vi.mocked(cerrarInscripcion).mockResolvedValueOnce({ ...ACTIVIDAD, capacidades: [] })
    const usuario = userEvent.setup()
    renderPantalla(ACTIVIDAD.id)

    await usuario.click(await screen.findByRole('button', { name: 'Cerrar inscripción' }))
    expect(cerrarInscripcion).not.toHaveBeenCalled()

    await usuario.click(await screen.findByRole('button', { name: 'Sí, cerrar inscripción' }))
    await waitFor(() => expect(cerrarInscripcion).toHaveBeenCalledWith(ACTIVIDAD.id))
  })

  it('cancelar la confirmación no cierra la inscripción', async () => {
    const usuario = userEvent.setup()
    renderPantalla(ACTIVIDAD.id)

    await usuario.click(await screen.findByRole('button', { name: 'Cerrar inscripción' }))
    await usuario.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByRole('button', { name: 'Cerrar inscripción' })).toBeInTheDocument()
    expect(cerrarInscripcion).not.toHaveBeenCalled()
  })

  it('sin la capacidad de cerrar no ofrece el botón', async () => {
    vi.mocked(obtenerActividad).mockResolvedValue({ ...ACTIVIDAD, capacidades: [] })
    renderPantalla(ACTIVIDAD.id)

    await screen.findByText('ROBOT2XY')
    expect(screen.queryByRole('button', { name: 'Cerrar inscripción' })).not.toBeInTheDocument()
  })

  it('una vez cerrada dice cuándo cerró', async () => {
    vi.mocked(obtenerActividad).mockResolvedValue({
      ...ACTIVIDAD,
      fase: 'formacion_equipos',
      capacidades: [],
    })
    renderPantalla(ACTIVIDAD.id)

    expect(await screen.findByText('Cerró el 5 sep 2026')).toBeInTheDocument()
  })

  it('quien participa no ve esta pantalla: va a Datos de la actividad', async () => {
    vi.mocked(obtenerActividad).mockResolvedValue({
      ...ACTIVIDAD,
      rol: 'participante',
      capacidades: [],
    })
    renderPantalla(ACTIVIDAD.id)

    expect(await screen.findByText('Datos de la actividad (pantalla)')).toBeInTheDocument()
  })
})
