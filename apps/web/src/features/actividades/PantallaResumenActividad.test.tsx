import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Usuario } from '../cuentas/api'
import {
  cerrarInscripcion,
  iniciarCierre,
  obtenerActividad,
  obtenerParticipantes,
} from './actividades.api'
import { PantallaResumenActividad } from './PantallaResumenActividad'
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

// Se mockea el módulo en vez de golpear fetch, mismo patrón que
// PantallaCrearActividad.test.tsx y PantallaMisActividades.test.tsx.
vi.mock('./actividades.api', async () => {
  const real = await vi.importActual<typeof import('./actividades.api')>('./actividades.api')
  return {
    ...real,
    obtenerActividad: vi.fn(),
    cerrarInscripcion: vi.fn(),
    iniciarCierre: vi.fn(),
    obtenerParticipantes: vi.fn().mockResolvedValue([]),
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

// Con las rutas del espacio de equipo y de /resumen, para probar a dónde
// lleva abrir la actividad.
function renderConRutas(ruta: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/actividades/:id" element={<PantallaResumenActividad />} />
          <Route
            path="/actividades/:id/resumen"
            element={<PantallaResumenActividad soloResumen />}
          />
          <Route path="/equipos/:idEquipo/:seccion" element={<p>Espacio del equipo</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

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
  nombreOrganizador: 'Ana García López',
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
    vi.mocked(iniciarCierre).mockReset()
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
      nombreOrganizador: 'Ana García López',
      informacionGeneral: 'Prototipo funcional con reporte técnico.',
      fechaInicio: '2026-09-01',
      fechaTermino: '2026-11-01',
      fechaLimiteInscripcion: '2026-09-05',
      plazoCierreDias: 10,
      numeroEquiposEsperado: 3,
    }
    vi.mocked(obtenerActividad).mockResolvedValueOnce(actividad)

    renderPantalla(actividad.id)

    expect(await screen.findByRole('listitem', { current: 'step' })).toHaveTextContent(
      'Inscripción',
    )
    expect(screen.getByText('Clave de ingreso')).toBeInTheDocument()
    expect(screen.getByText(actividad.claveIngreso as string)).toBeInTheDocument()
  })

  it('muestra el botón de cerrar inscripción cuando esa capacidad está presente', async () => {
    vi.mocked(obtenerActividad).mockResolvedValueOnce(ACTIVIDAD_BASE)

    renderPantalla(ACTIVIDAD_BASE.id)

    expect(
      await screen.findByRole('button', { name: 'Cerrar inscripción ahora' }),
    ).toBeInTheDocument()
  })

  it('no muestra ninguna acción de avance para un participante sin esa capacidad', async () => {
    vi.mocked(obtenerActividad).mockResolvedValueOnce({
      ...ACTIVIDAD_BASE,
      rol: 'participante',
      capacidades: [],
    })

    renderPantalla(ACTIVIDAD_BASE.id)

    await screen.findByRole('listitem', { current: 'step' })
    expect(screen.queryByRole('button', { name: /Cerrar inscripción/ })).not.toBeInTheDocument()
  })

  it('pide confirmación y solo cierra la inscripción tras confirmar', async () => {
    const usuario = userEvent.setup()
    vi.mocked(obtenerActividad).mockResolvedValue(ACTIVIDAD_BASE)
    vi.mocked(cerrarInscripcion).mockResolvedValueOnce({
      ...ACTIVIDAD_BASE,
      capacidades: [],
    })

    renderPantalla(ACTIVIDAD_BASE.id)

    await usuario.click(await screen.findByRole('button', { name: 'Cerrar inscripción ahora' }))
    expect(cerrarInscripcion).not.toHaveBeenCalled()

    await usuario.click(await screen.findByRole('button', { name: 'Sí, cerrar inscripción' }))
    await waitFor(() => expect(cerrarInscripcion).toHaveBeenCalledWith(ACTIVIDAD_BASE.id))
  })

  it('cancelar la confirmación no llama a cerrarInscripcion', async () => {
    const usuario = userEvent.setup()
    vi.mocked(obtenerActividad).mockResolvedValueOnce(ACTIVIDAD_BASE)

    renderPantalla(ACTIVIDAD_BASE.id)

    await usuario.click(await screen.findByRole('button', { name: 'Cerrar inscripción ahora' }))
    await usuario.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(
      await screen.findByRole('button', { name: 'Cerrar inscripción ahora' }),
    ).toBeInTheDocument()
    expect(cerrarInscripcion).not.toHaveBeenCalled()
  })

  it('muestra el botón de iniciar cierre cuando esa capacidad está presente, en vez del de cerrar inscripción', async () => {
    vi.mocked(obtenerActividad).mockResolvedValueOnce({
      ...ACTIVIDAD_BASE,
      fase: 'desarrollo',
      capacidades: ['iniciar_cierre'],
    })

    renderPantalla(ACTIVIDAD_BASE.id)

    expect(await screen.findByRole('button', { name: 'Iniciar cierre ahora' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Cerrar inscripción ahora' }),
    ).not.toBeInTheDocument()
  })

  it('pide confirmación y solo inicia el cierre tras confirmar', async () => {
    const usuario = userEvent.setup()
    const actividadEnDesarrollo: Actividad = {
      ...ACTIVIDAD_BASE,
      fase: 'desarrollo',
      capacidades: ['iniciar_cierre'],
    }
    vi.mocked(obtenerActividad).mockResolvedValue(actividadEnDesarrollo)
    vi.mocked(iniciarCierre).mockResolvedValueOnce({ ...actividadEnDesarrollo, capacidades: [] })

    renderPantalla(ACTIVIDAD_BASE.id)

    await usuario.click(await screen.findByRole('button', { name: 'Iniciar cierre ahora' }))
    expect(iniciarCierre).not.toHaveBeenCalled()

    await usuario.click(await screen.findByRole('button', { name: 'Sí, iniciar cierre' }))
    await waitFor(() => expect(iniciarCierre).toHaveBeenCalledWith(ACTIVIDAD_BASE.id))
  })

  it('en Detalles dice cuántos se han unido; la lista está en Participantes', async () => {
    vi.mocked(obtenerActividad).mockResolvedValueOnce({ ...ACTIVIDAD_BASE, numParticipantes: 0 })

    renderPantalla(ACTIVIDAD_BASE.id)

    expect(await screen.findByText('Nadie se ha unido todavía')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Participantes/ })).not.toBeInTheDocument()
  })

  it('cuenta en singular y plural a quienes se han unido', async () => {
    vi.mocked(obtenerActividad).mockResolvedValueOnce({ ...ACTIVIDAD_BASE, numParticipantes: 6 })

    renderPantalla(ACTIVIDAD_BASE.id)

    expect(await screen.findByText('6 se han unido')).toBeInTheDocument()
  })

  it('explica las fechas con lo que pasa en ellas', async () => {
    vi.mocked(obtenerActividad).mockResolvedValueOnce(ACTIVIDAD_BASE)

    renderPantalla(ACTIVIDAD_BASE.id)

    // Término 1 nov + 10 días de plazo.
    expect(await screen.findByText(/Del 1 nov 2026 al 11 nov 2026/)).toBeInTheDocument()
    expect(screen.getByText('Hasta el 5 sep 2026')).toBeInTheDocument()
    expect(screen.getByText('Compártela para que se unan.')).toBeInTheDocument()
  })

  it('la barra ofrece Planificar si solo puede ajustar el calendario, como en desarrollo', async () => {
    vi.mocked(obtenerActividad).mockResolvedValueOnce({
      ...ACTIVIDAD_BASE,
      fase: 'desarrollo',
      capacidades: ['ajustar_periodos', 'agregar_coorganizador'],
    })

    renderPantalla(ACTIVIDAD_BASE.id)

    expect(await screen.findByRole('link', { name: 'Planificar' })).toHaveAttribute(
      'href',
      `/actividades/${ACTIVIDAD_BASE.id}/configuracion`,
    )
  })

  it('la barra ofrece Planificar si solo puede ajustar funciones, como en cierre', async () => {
    vi.mocked(obtenerActividad).mockResolvedValueOnce({
      ...ACTIVIDAD_BASE,
      fase: 'cierre',
      capacidades: ['ajustar_funciones', 'agregar_coorganizador'],
    })

    renderPantalla(ACTIVIDAD_BASE.id)

    expect(await screen.findByRole('link', { name: 'Planificar' })).toHaveAttribute(
      'href',
      `/actividades/${ACTIVIDAD_BASE.id}/configuracion`,
    )
  })

  it('en formación dice qué se hace y dónde, sin botones que lleven ahí', async () => {
    vi.mocked(obtenerActividad).mockResolvedValueOnce({
      ...ACTIVIDAD_BASE,
      fase: 'formacion_equipos',
      capacidades: [],
    })

    renderPantalla(ACTIVIDAD_BASE.id)

    expect(await screen.findByRole('listitem', { current: 'step' })).toHaveTextContent(
      'Formación de equipos',
    )
    expect(screen.getByRole('heading', { name: 'Qué se hace en esta etapa' })).toBeInTheDocument()
    expect(screen.getByText(/Revisa que todos tengan equipo/)).toBeInTheDocument()
    // Informativo: nombra la sección de la barra, no da un atajo.
    expect(screen.queryByRole('link', { name: /Revisa/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Equipos' })).toHaveAttribute(
      'href',
      `/actividades/${ACTIVIDAD_BASE.id}/equipos`,
    )
  })

  it('a quien participa le dice qué hacer con sus palabras', async () => {
    vi.mocked(obtenerActividad).mockResolvedValueOnce({
      ...ACTIVIDAD_BASE,
      rol: 'participante',
      capacidades: [],
    })

    renderPantalla(ACTIVIDAD_BASE.id)

    expect(
      await screen.findByText(/Espera a que cierre la inscripción, el 5 sep 2026/),
    ).toBeInTheDocument()
  })

  it('la flecha de la barra lleva a Organizo para quien organiza', async () => {
    vi.mocked(obtenerActividad).mockResolvedValueOnce(ACTIVIDAD_BASE)

    renderPantalla(ACTIVIDAD_BASE.id)

    expect(await screen.findByRole('link', { name: 'Volver a Organizo' })).toHaveAttribute(
      'href',
      '/actividades/organizo',
    )
  })

  it('la flecha de la barra lleva a Participo para un participante', async () => {
    vi.mocked(obtenerActividad).mockResolvedValueOnce({
      ...ACTIVIDAD_BASE,
      rol: 'participante',
      capacidades: [],
    })

    renderPantalla(ACTIVIDAD_BASE.id)

    expect(await screen.findByRole('link', { name: 'Volver a Participo' })).toHaveAttribute(
      'href',
      '/actividades/participo',
    )
  })

  it('durante la inscripción ya ofrece el acceso a Equipos, para configurar cómo se forman', async () => {
    vi.mocked(obtenerActividad).mockResolvedValueOnce(ACTIVIDAD_BASE)

    renderPantalla(ACTIVIDAD_BASE.id)

    await screen.findByRole('button', { name: 'Cerrar inscripción ahora' })
    expect(screen.getByRole('link', { name: 'Equipos' })).toBeInTheDocument()
  })

  describe('quien participa en desarrollo', () => {
    const enDesarrollo: Actividad = {
      ...ACTIVIDAD_BASE,
      rol: 'participante',
      fase: 'desarrollo',
      capacidades: [],
      idMiEquipo: 'eq-1',
    }

    it('al abrir la actividad entra directo a su equipo', async () => {
      vi.mocked(obtenerActividad).mockResolvedValue(enDesarrollo)

      renderConRutas(`/actividades/${ACTIVIDAD_BASE.id}`)

      expect(await screen.findByText('Espacio del equipo')).toBeInTheDocument()
    })

    it('desde Resumen en la barra se queda en el resumen', async () => {
      vi.mocked(obtenerActividad).mockResolvedValue(enDesarrollo)

      renderConRutas(`/actividades/${ACTIVIDAD_BASE.id}/resumen`)

      expect(await screen.findByRole('heading', { name: 'Resumen', level: 1 })).toBeInTheDocument()
      expect(screen.queryByText('Espacio del equipo')).not.toBeInTheDocument()
    })

    it('sin equipo se queda en el resumen', async () => {
      vi.mocked(obtenerActividad).mockResolvedValue({ ...enDesarrollo, idMiEquipo: null })

      renderConRutas(`/actividades/${ACTIVIDAD_BASE.id}`)

      expect(
        await screen.findByText(/Pide a quien organiza que te asigne un equipo/),
      ).toBeInTheDocument()
    })
  })

  it('Historial abre un panel lateral, no navega a otra pantalla', async () => {
    vi.mocked(obtenerActividad).mockResolvedValueOnce(ACTIVIDAD_BASE)
    const usuario = userEvent.setup()
    renderPantalla(ACTIVIDAD_BASE.id)

    const botonHistorial = await screen.findByRole('button', { name: 'Historial' })
    expect(botonHistorial).toBeInTheDocument()
    await usuario.click(botonHistorial)

    const panel = await screen.findByRole('dialog')
    expect(panel).toHaveTextContent('Historial')
    expect(screen.queryByRole('link', { name: 'Historial' })).not.toBeInTheDocument()
  })
})
