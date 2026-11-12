import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerSesionActual } from '../cuentas/api'
import {
  guardarReflexion,
  inscribirse,
  marcarLeccion,
  obtenerCurso,
  obtenerLeccion,
  obtenerMiProgreso,
  type CursoPublico,
  type LeccionPublica,
  type MiProgresoCurso,
} from './formacion.api'
import { PantallaCurso } from './PantallaCurso'
import { PantallaLeccion } from './PantallaLeccion'

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  return { ...real, obtenerSesionActual: vi.fn() }
})

vi.mock('./formacion.api', async () => {
  const real = await vi.importActual<typeof import('./formacion.api')>('./formacion.api')
  return {
    ...real,
    obtenerCurso: vi.fn(),
    obtenerLeccion: vi.fn(),
    obtenerMiProgreso: vi.fn(),
    inscribirse: vi.fn(),
    marcarLeccion: vi.fn(),
    guardarReflexion: vi.fn(),
  }
})

const ANA = {
  idUsuario: 'u1',
  nombre: 'Ana',
  apellidoPaterno: 'García',
  apellidoMaterno: 'López',
  correo: 'ana@example.com',
  tipoCuenta: 'usuario' as const,
  fotoUrl: null,
}

const LECCIONES: CursoPublico['lecciones'] = [
  {
    idLeccion: 'l1',
    orden: 0,
    titulo: 'Lee el caso',
    tipo: 'lectura',
    obligatoria: true,
    duracionMin: 4,
    disponible: true,
    tipoRecurso: null,
  },
  {
    idLeccion: 'l2',
    orden: 1,
    titulo: 'Redacta tu acuerdo',
    tipo: 'practica',
    obligatoria: true,
    duracionMin: 10,
    disponible: true,
    tipoRecurso: null,
  },
  {
    idLeccion: 'l3',
    orden: 2,
    titulo: '¿Qué cambiarás?',
    tipo: 'reflexion',
    obligatoria: false,
    duracionMin: 5,
    disponible: true,
    tipoRecurso: null,
  },
]

const CURSO: CursoPublico = {
  idCurso: 'c1',
  titulo: 'Acuerdos claros',
  resumen: 'Convierte una conversación en compromisos.',
  objetivo: 'Redactar un acuerdo breve.',
  practicaFinal: 'Un acuerdo de equipo listo para usar.',
  area: 'organizacion',
  nivel: 'inicial',
  elementos: ['responsabilidades'],
  numLecciones: 3,
  duracionMin: 19,
  autor: 'Grace Hopper',
  fechaActualizacion: '2026-09-01T12:00:00.000Z',
  lecciones: LECCIONES,
}

function progreso(parcial: Partial<MiProgresoCurso> = {}): MiProgresoCurso {
  return {
    idCurso: 'c1',
    inscrito: false,
    fechaInicio: null,
    fechaFinalizacion: null,
    leccionesCompletadas: [],
    total: 2,
    completadas: 0,
    porcentaje: 0,
    siguiente: { idLeccion: 'l1', titulo: 'Lee el caso' },
    reflexiones: [],
    ...parcial,
  }
}

const EMPEZADO = progreso({
  inscrito: true,
  fechaInicio: '2026-11-01T12:00:00.000Z',
  leccionesCompletadas: ['l1'],
  completadas: 1,
  porcentaje: 50,
  siguiente: { idLeccion: 'l2', titulo: 'Redacta tu acuerdo' },
})

function leccion(parcial: Partial<LeccionPublica> = {}): LeccionPublica {
  return {
    ...LECCIONES[0],
    contenido: 'Lee esto primero',
    recurso: null,
    anterior: null,
    siguiente: { idLeccion: 'l2', titulo: 'Redacta tu acuerdo' },
    ...parcial,
  }
}

function renderEn(ruta: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/cursos/:id" element={<PantallaCurso />} />
          <Route path="/cursos/:id/lecciones/:idLeccion" element={<PantallaLeccion />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeAll(() => {
  // jsdom no implementa el desplazamiento.
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
})

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  vi.mocked(obtenerSesionActual).mockResolvedValue(ANA)
  vi.mocked(obtenerCurso).mockResolvedValue(CURSO)
  vi.mocked(obtenerLeccion).mockResolvedValue(leccion())
  vi.mocked(obtenerMiProgreso).mockResolvedValue(progreso())
  vi.mocked(inscribirse).mockReset()
  vi.mocked(marcarLeccion).mockReset()
  vi.mocked(guardarReflexion).mockReset()
})

describe('ficha con sesión', () => {
  it('empezar crea la inscripción y abre la siguiente lección', async () => {
    vi.mocked(inscribirse).mockResolvedValue(progreso({ inscrito: true }))
    const user = userEvent.setup()
    renderEn('/cursos/c1')

    await user.click(await screen.findByRole('button', { name: 'Empezar curso' }))

    expect(inscribirse).toHaveBeenCalledWith('c1')
    expect(await screen.findByText('Lee esto primero')).toBeInTheDocument()
    expect(obtenerLeccion).toHaveBeenCalledWith('c1', 'l1')
  })

  it('con el curso empezado muestra el avance y continúa en la pendiente', async () => {
    vi.mocked(obtenerMiProgreso).mockResolvedValue(EMPEZADO)
    renderEn('/cursos/c1')

    expect(await screen.findByText('1 de 2 lecciones · 50 %')).toBeInTheDocument()
    expect(
      screen.getByRole('progressbar', { name: 'Progreso en Acuerdos claros' }),
    ).toHaveAttribute('aria-valuenow', '50')
    expect(screen.getByRole('link', { name: 'Continuar' })).toHaveAttribute(
      'href',
      '/cursos/c1/lecciones/l2',
    )
    const temario = screen.getByRole('heading', { name: 'Lecciones' }).parentElement as HTMLElement
    const [primera, segunda] = within(temario).getAllByRole('listitem')
    expect(within(primera).getByText('Completada')).toBeInTheDocument()
    expect(within(segunda).queryByText('Completada')).not.toBeInTheDocument()
  })

  it('con el curso terminado dice cuándo y ofrece repasarlo', async () => {
    vi.mocked(obtenerMiProgreso).mockResolvedValue(
      progreso({
        inscrito: true,
        fechaFinalizacion: '2026-11-02T18:00:00.000Z',
        leccionesCompletadas: ['l1', 'l2'],
        completadas: 2,
        porcentaje: 100,
        siguiente: { idLeccion: 'l3', titulo: '¿Qué cambiarás?' },
      }),
    )
    renderEn('/cursos/c1')

    expect(await screen.findByText(/Completaste este curso el/)).toBeInTheDocument()
    // Queda la reflexión opcional: "Ver lo nuevo" lleva a ella.
    expect(screen.getByRole('link', { name: 'Ver lo nuevo' })).toHaveAttribute(
      'href',
      '/cursos/c1/lecciones/l3',
    )
  })

  it('sin sesión empezar es un enlace y no se pide el progreso', async () => {
    vi.mocked(obtenerSesionActual).mockResolvedValue(null)
    renderEn('/cursos/c1')

    expect(await screen.findByRole('link', { name: 'Empezar curso' })).toHaveAttribute(
      'href',
      '/cursos/c1/lecciones/l1',
    )
    expect(obtenerMiProgreso).not.toHaveBeenCalled()
  })
})

describe('visor con sesión', () => {
  it('marca la lección como completada y la señala en el índice', async () => {
    vi.mocked(marcarLeccion).mockResolvedValue({ progreso: EMPEZADO, cursoCompletadoAhora: false })
    const user = userEvent.setup()
    renderEn('/cursos/c1/lecciones/l1')

    await user.click(await screen.findByRole('button', { name: 'Marcar como completada' }))

    expect(marcarLeccion).toHaveBeenCalledWith('c1', 'l1', true)
    expect(await screen.findByText('Completaste esta lección')).toBeInTheDocument()
    const indice = screen.getByRole('navigation', { name: 'Lecciones del curso' })
    expect(
      within(within(indice).getByRole('link', { name: /Lee el caso/ })).getByText('Completada'),
    ).toBeInTheDocument()
    expect(screen.getByText('1 de 2 lecciones · 50 %')).toBeInTheDocument()
    expect(screen.queryByText('Completaste el curso')).not.toBeInTheDocument()
  })

  it('puede devolver una lección a pendiente', async () => {
    vi.mocked(obtenerMiProgreso).mockResolvedValue(EMPEZADO)
    vi.mocked(marcarLeccion).mockResolvedValue({
      progreso: progreso({ inscrito: true }),
      cursoCompletadoAhora: false,
    })
    const user = userEvent.setup()
    renderEn('/cursos/c1/lecciones/l1')

    await user.click(await screen.findByRole('button', { name: 'Marcar como pendiente' }))

    expect(marcarLeccion).toHaveBeenCalledWith('c1', 'l1', false)
    expect(
      await screen.findByRole('button', { name: 'Marcar como completada' }),
    ).toBeInTheDocument()
  })

  it('avisa una vez, sin celebraciones, cuando la marca termina el curso', async () => {
    vi.mocked(obtenerMiProgreso).mockResolvedValue(EMPEZADO)
    vi.mocked(obtenerLeccion).mockResolvedValue(leccion({ ...LECCIONES[1], siguiente: null }))
    vi.mocked(marcarLeccion).mockResolvedValue({
      progreso: progreso({
        inscrito: true,
        fechaFinalizacion: '2026-11-02T18:00:00.000Z',
        leccionesCompletadas: ['l1', 'l2'],
        completadas: 2,
        porcentaje: 100,
      }),
      cursoCompletadoAhora: true,
    })
    const user = userEvent.setup()
    renderEn('/cursos/c1/lecciones/l2')

    await user.click(await screen.findByRole('button', { name: 'Marcar como completada' }))

    expect(await screen.findByText('Completaste el curso')).toBeInTheDocument()
    expect(screen.getByText('2 de 2 lecciones · 100 %')).toBeInTheDocument()
  })

  it('una lección no disponible no se puede marcar', async () => {
    vi.mocked(obtenerLeccion).mockResolvedValue(
      leccion({ disponible: false, titulo: 'Recurso no disponible', tipo: 'recurso' }),
    )
    renderEn('/cursos/c1/lecciones/l1')

    expect(await screen.findByText(/no está disponible por ahora/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Marcar como completada' })).not.toBeInTheDocument()
  })

  it('la reflexión empieza con lo guardado y se guarda en privado', async () => {
    vi.mocked(obtenerMiProgreso).mockResolvedValue(
      progreso({
        inscrito: true,
        reflexiones: [
          {
            idLeccion: 'l3',
            texto: 'Pediré fechas.',
            fechaActualizacion: '2026-11-01T12:00:00.000Z',
          },
        ],
      }),
    )
    vi.mocked(obtenerLeccion).mockResolvedValue(
      leccion({ ...LECCIONES[2], contenido: '¿Qué harás distinto?', siguiente: null }),
    )
    vi.mocked(guardarReflexion).mockResolvedValue({
      idLeccion: 'l3',
      texto: 'Pediré fechas y responsables.',
      fechaActualizacion: '2026-11-03T12:00:00.000Z',
    })
    const user = userEvent.setup()
    renderEn('/cursos/c1/lecciones/l3')

    const campo = await screen.findByLabelText('Tu respuesta')
    expect(campo).toHaveValue('Pediré fechas.')
    expect(screen.getByText(/Solo tú puedes leerla/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar reflexión' })).toBeDisabled()

    await user.clear(campo)
    await user.type(campo, 'Pediré fechas y responsables.')
    // Lo que el servidor devolverá al releer el progreso después de guardar.
    vi.mocked(obtenerMiProgreso).mockResolvedValue(
      progreso({
        inscrito: true,
        reflexiones: [
          {
            idLeccion: 'l3',
            texto: 'Pediré fechas y responsables.',
            fechaActualizacion: '2026-11-03T12:00:00.000Z',
          },
        ],
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Guardar reflexión' }))

    expect(guardarReflexion).toHaveBeenCalledWith('c1', 'l3', 'Pediré fechas y responsables.')
    expect(await screen.findByText(/Guardada el/)).toBeInTheDocument()
    // Guardar la reflexión no marca la lección.
    expect(marcarLeccion).not.toHaveBeenCalled()
  })

  it('sin sesión no hay botones de progreso ni campo de reflexión', async () => {
    vi.mocked(obtenerSesionActual).mockResolvedValue(null)
    vi.mocked(obtenerLeccion).mockResolvedValue(
      leccion({ ...LECCIONES[2], contenido: '¿Qué harás distinto?', siguiente: null }),
    )
    renderEn('/cursos/c1/lecciones/l3')

    expect(await screen.findByText('¿Qué harás distinto?')).toBeInTheDocument()
    expect(screen.getByText('Estás explorando sin cuenta')).toBeInTheDocument()
    expect(screen.queryByLabelText('Tu respuesta')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Marcar como completada' })).not.toBeInTheDocument()
    expect(obtenerMiProgreso).not.toHaveBeenCalled()
  })
})
