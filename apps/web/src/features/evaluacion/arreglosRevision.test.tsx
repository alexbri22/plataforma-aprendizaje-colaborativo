import type {
  EntregaDeInstrumento,
  InstrumentoPorResponder,
  Ponderacion,
  ProyectoDeEquipo,
} from '@plataforma/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerActividad } from '../actividades/actividades.api'
import type { Actividad } from '../actividades'
import type { Usuario } from '../cuentas/api'
import { obtenerEquipoConActividad } from '../equipos/equipos.api'
import {
  capturarPuntajeDeEquipo,
  obtenerDesglose,
  obtenerProyectoPorEquipo,
} from './calificaciones.api'
import { PantallaAspectoProceso } from './PantallaAspectoProceso'
import { PantallaMisResultados } from './PantallaMisResultados'
import {
  guardarEntrega,
  obtenerEntregas,
  obtenerMisInstrumentos,
  obtenerPonderacion,
  subirArchivoEntrega,
} from './ponderacion.api'
import { PuntajeDelEquipo } from './PuntajeDelEquipo'

// Arreglos de la revisión del PR: Mis resultados no pide la calificación
// antes del cierre, el puntaje de un equipo con ajustes se puede retirar, y
// una entrega que falla a medias conserva el formulario para reintentar.

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  const usuario: Usuario = {
    idUsuario: 'u1',
    nombre: 'Ana',
    apellidoPaterno: 'Soto',
    apellidoMaterno: '',
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

vi.mock('../actividades/actividades.api', async () => {
  const real = await vi.importActual<typeof import('../actividades/actividades.api')>(
    '../actividades/actividades.api',
  )
  return { ...real, obtenerActividad: vi.fn() }
})

vi.mock('../equipos/equipos.api', async () => {
  const real =
    await vi.importActual<typeof import('../equipos/equipos.api')>('../equipos/equipos.api')
  return { ...real, obtenerEquipoConActividad: vi.fn() }
})

vi.mock('./calificaciones.api', async () => {
  const real = await vi.importActual<typeof import('./calificaciones.api')>('./calificaciones.api')
  return {
    ...real,
    obtenerDesglose: vi.fn(),
    obtenerProyectoPorEquipo: vi.fn(),
    capturarPuntajeDeEquipo: vi.fn(),
  }
})

vi.mock('./ponderacion.api', async () => {
  const real = await vi.importActual<typeof import('./ponderacion.api')>('./ponderacion.api')
  return {
    ...real,
    obtenerPonderacion: vi.fn(),
    obtenerMisInstrumentos: vi.fn(),
    obtenerEntregas: vi.fn(),
    guardarEntrega: vi.fn(),
    subirArchivoEntrega: vi.fn(),
  }
})

function actividad(sobrescribir: Partial<Actividad> = {}): Actividad {
  return {
    id: 'act-1',
    nombre: 'Club de robótica',
    objetivo: '',
    fase: 'desarrollo',
    rol: 'participante',
    numParticipantes: 2,
    fechaClave: '',
    nombreOrganizador: 'Olga Organizadora',
    idMiMembresia: 'm1',
    idMiEquipo: 'e1',
    capacidades: ['responder_instrumento'],
    configuracion: { calificacion: 'habilitada' },
    ...sobrescribir,
  }
}

function conProveedores(ui: React.ReactNode, ruta: string, patron: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path={patron} element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Mis resultados', () => {
  it('antes del cierre avisa cuándo estará y no pide la calificación', async () => {
    vi.mocked(obtenerActividad).mockResolvedValue(actividad())
    conProveedores(
      <PantallaMisResultados />,
      '/actividades/act-1/resultados',
      '/actividades/:id/resultados',
    )

    expect(await screen.findByText('Tu calificación se verá en el cierre.')).toBeInTheDocument()
    expect(obtenerDesglose).not.toHaveBeenCalled()
  })
})

describe('Puntaje del equipo con ajustes individuales', () => {
  it('se retiran con una acción explícita, tras confirmar que reemplaza los ajustes', async () => {
    const usuario = userEvent.setup()
    const proyecto: ProyectoDeEquipo[] = [
      {
        idEquipo: 'e1',
        nombre: 'Alfa',
        integrantes: 2,
        elementos: [
          { idInstrumento: 'i1', clave: 'metas', nombre: 'Metas', valor: null, ajustado: true },
        ],
      },
    ]
    vi.mocked(obtenerProyectoPorEquipo).mockResolvedValue(proyecto)
    vi.mocked(capturarPuntajeDeEquipo).mockResolvedValue(undefined)
    conProveedores(
      <PuntajeDelEquipo idActividad="act-1" idEquipo="e1" elemento="metas" puedeCapturar />,
      '/x',
      '/x',
    )

    await usuario.click(await screen.findByRole('button', { name: 'Quitar los puntajes' }))
    expect(capturarPuntajeDeEquipo).not.toHaveBeenCalled()
    await usuario.click(screen.getByRole('button', { name: 'Reemplazar' }))

    await waitFor(() =>
      expect(capturarPuntajeDeEquipo).toHaveBeenCalledWith('act-1', 'i1', 'e1', null),
    )
  })
})

describe('Entrega de una actividad externa', () => {
  it('si la nota se guarda y el archivo no, el formulario sigue abierto con el error', async () => {
    const usuario = userEvent.setup()
    const instrumento: InstrumentoPorResponder = {
      id: 'i1',
      nombre: 'Entrevista 1',
      aspecto: { clave: 'interaccion', nombre: 'Interacción' },
      formato: 'enlace',
      clavePlantilla: null,
      enlace: 'https://entrevista.example.com',
      fechaPlanificada: null,
      completadoEn: null,
    }
    const creada: EntregaDeInstrumento = {
      id: 'en1',
      idInstrumento: 'i1',
      idMembresia: 'm1',
      contenido: 'La hice.',
      enlace: null,
      archivo: null,
      fechaCreacion: '2026-11-17T16:00:00.000Z',
      fechaActualizacion: '2026-11-17T16:00:00.000Z',
    }
    const ponderacion: Ponderacion = {
      componentes: [
        {
          id: 'c1',
          clave: 'proceso',
          nombre: 'Proceso colaborativo',
          peso: 40,
          orden: 1,
          aspectos: [
            {
              id: 'a1',
              clave: 'interaccion',
              nombre: 'Interacción',
              peso: 20,
              orden: 0,
              instrumentos: [],
            },
          ],
        },
      ],
    }
    vi.mocked(obtenerEquipoConActividad).mockResolvedValue({
      id: 'e1',
      nombre: 'Alfa',
      descripcionActividad: null,
      formaDeTrabajo: null,
      integrantes: [
        { idMembresia: 'm1', idUsuario: 'u1', nombre: 'Ana Soto', rol: 'participante' },
      ],
      idActividad: 'act-1',
      idMiMembresia: 'm1',
    })
    vi.mocked(obtenerActividad).mockResolvedValue(actividad())
    vi.mocked(obtenerPonderacion).mockResolvedValue(ponderacion)
    vi.mocked(obtenerMisInstrumentos).mockResolvedValue([instrumento])
    // Antes de guardar no hay entrega; el refresco tras el fallo la descubre.
    vi.mocked(obtenerEntregas).mockResolvedValueOnce([]).mockResolvedValue([creada])
    vi.mocked(guardarEntrega).mockResolvedValue(creada)
    vi.mocked(subirArchivoEntrega).mockRejectedValue(new Error('No pudimos subir el archivo.'))

    const { container } = conProveedores(
      <PantallaAspectoProceso />,
      '/equipos/e1/proceso/interaccion',
      '/equipos/:idEquipo/proceso/:aspecto',
    )

    await usuario.click(await screen.findByRole('button', { name: 'Entregar' }))
    await usuario.type(await screen.findByLabelText('¿Qué hiciste?'), 'La hice.')
    const entradaArchivo = container.querySelector('input[type="file"]') as HTMLInputElement
    await usuario.upload(
      entradaArchivo,
      new File(['%PDF'], 'evidencia.pdf', { type: 'application/pdf' }),
    )
    await usuario.click(screen.getByRole('button', { name: 'Marcar como hecha' }))

    expect(await screen.findByText('No pudimos subir el archivo.')).toBeInTheDocument()
    await waitFor(() => expect(obtenerEntregas).toHaveBeenCalledTimes(2))
    expect(screen.getByLabelText('¿Qué hiciste?')).toBeInTheDocument()
  })
})
