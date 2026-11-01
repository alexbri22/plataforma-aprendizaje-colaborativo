import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerSesionActual } from '../cuentas/api'
import {
  ErrorFormacion,
  obtenerCurso,
  obtenerLeccion,
  type CursoPublico,
  type LeccionPublica,
} from './formacion.api'
import { PantallaCurso } from './PantallaCurso'
import { PantallaLeccion } from './PantallaLeccion'

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  return { ...real, obtenerSesionActual: vi.fn() }
})

vi.mock('./formacion.api', async () => {
  const real = await vi.importActual<typeof import('./formacion.api')>('./formacion.api')
  return { ...real, obtenerCurso: vi.fn(), obtenerLeccion: vi.fn() }
})

const LECCIONES: CursoPublico['lecciones'] = [
  {
    idLeccion: 'l1',
    orden: 0,
    titulo: 'Plantilla de acuerdos',
    tipo: 'recurso',
    obligatoria: true,
    duracionMin: 4,
    disponible: true,
    tipoRecurso: 'plantilla',
  },
  {
    idLeccion: 'l2',
    orden: 1,
    titulo: 'Recurso no disponible',
    tipo: 'recurso',
    obligatoria: true,
    duracionMin: 6,
    disponible: false,
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
  duracionMin: 15,
  autor: 'Grace Hopper',
  fechaActualizacion: '2026-09-01T12:00:00.000Z',
  lecciones: LECCIONES,
}

function leccion(parcial: Partial<LeccionPublica>): LeccionPublica {
  return {
    ...LECCIONES[0],
    contenido: '',
    recurso: null,
    anterior: null,
    siguiente: null,
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
  sessionStorage.clear()
  vi.mocked(obtenerSesionActual).mockResolvedValue(null)
  vi.mocked(obtenerCurso).mockResolvedValue(CURSO)
  vi.mocked(obtenerLeccion).mockReset()
})

describe('PantallaCurso', () => {
  it('muestra la ficha y empieza por la primera lección, sin pedir cuenta', async () => {
    renderEn('/cursos/c1')

    expect(await screen.findByRole('heading', { name: 'Acuerdos claros' })).toBeInTheDocument()
    expect(screen.getByText('Redactar un acuerdo breve.')).toBeInTheDocument()
    expect(screen.getByText('Un acuerdo de equipo listo para usar.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Empezar curso' })).toHaveAttribute(
      'href',
      '/cursos/c1/lecciones/l1',
    )
    expect(screen.getByText('Estás explorando sin cuenta')).toBeInTheDocument()
  })

  it('una lección no disponible se lista sin enlace', async () => {
    renderEn('/cursos/c1')

    expect(await screen.findByText('Recurso no disponible')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Recurso no disponible' })).not.toBeInTheDocument()
    expect(screen.getByText(/Reflexión · 5 min · Opcional/)).toBeInTheDocument()
  })

  it('explica cuando el curso no existe o se retiró', async () => {
    vi.mocked(obtenerCurso).mockRejectedValue(new ErrorFormacion('No encontramos.', 404))
    renderEn('/cursos/c1')

    expect(await screen.findByText('No encontramos este curso')).toBeInTheDocument()
  })
})

describe('PantallaCurso sin el curso', () => {
  it('deja de mostrar la ficha en caché cuando el servidor confirma un 404', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/cursos/c1']}>
          <Routes>
            <Route path="/cursos/:id" element={<PantallaCurso />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByRole('link', { name: 'Empezar curso' })).toBeInTheDocument()

    vi.mocked(obtenerCurso).mockRejectedValue(new ErrorFormacion('No encontramos.', 404))
    await queryClient.invalidateQueries()

    expect(await screen.findByText('No encontramos este curso')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Empezar curso' })).not.toBeInTheDocument()
  })

  it('con sesión usa h2: el h1 de la página ya lo pone el AppShell', async () => {
    vi.mocked(obtenerSesionActual).mockResolvedValue({
      idUsuario: 'u1',
      nombre: 'Ana',
      apellidoPaterno: 'García',
      apellidoMaterno: 'López',
      correo: 'ana@example.com',
      tipoCuenta: 'usuario',
      fotoUrl: null,
    })
    vi.mocked(obtenerCurso).mockRejectedValue(new ErrorFormacion('No encontramos.', 404))
    renderEn('/cursos/c1')

    expect(
      await screen.findByRole('heading', { level: 2, name: 'No encontramos este curso' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})

describe('PantallaLeccion', () => {
  it('marca la lección actual y navega a la siguiente', async () => {
    vi.mocked(obtenerLeccion).mockResolvedValue(
      leccion({ contenido: 'Lee esto primero', siguiente: { idLeccion: 'l3', titulo: 'Después' } }),
    )
    renderEn('/cursos/c1/lecciones/l1')

    const indice = await screen.findByRole('navigation', { name: 'Lecciones del curso' })
    expect(within(indice).getByRole('link', { name: /Plantilla de acuerdos/ })).toHaveAttribute(
      'aria-current',
      'step',
    )
    expect(screen.getByText('Lee esto primero')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Siguiente/ })).toHaveAttribute(
      'href',
      '/cursos/c1/lecciones/l3',
    )
  })

  it('la reflexión muestra la pregunta y aclara que no se califica', async () => {
    vi.mocked(obtenerLeccion).mockResolvedValue(
      leccion({
        ...LECCIONES[2],
        contenido: '¿Qué harás distinto?',
        anterior: { idLeccion: 'l1', titulo: 'Antes' },
      }),
    )
    renderEn('/cursos/c1/lecciones/l3')

    expect(await screen.findByText('¿Qué harás distinto?')).toBeInTheDocument()
    expect(screen.getByText(/no se califica/)).toBeInTheDocument()
    // Es la última: en lugar de Siguiente, vuelve al curso.
    expect(screen.getByRole('link', { name: /Volver al curso/ })).toHaveAttribute(
      'href',
      '/cursos/c1',
    )
  })

  it('una lección cuyo recurso se retiró lo explica', async () => {
    vi.mocked(obtenerLeccion).mockResolvedValue(leccion({ ...LECCIONES[1] }))
    renderEn('/cursos/c1/lecciones/l2')

    expect(await screen.findByText(/no está disponible por ahora/)).toBeInTheDocument()
  })

  it('un recurso reutilizado conserva su fuente y derechos de uso', async () => {
    vi.mocked(obtenerLeccion).mockResolvedValue(
      leccion({
        recurso: {
          idRecurso: 'r1',
          seccion: 'como_colaborar',
          titulo: 'Plantilla',
          resumen: '',
          tipoRecurso: 'texto',
          area: null,
          elementos: [],
          duracionMin: 4,
          orden: 0,
          fechaActualizacion: '2026-09-01T00:00:00.000Z',
          archivo: null,
          contenido: 'Cuerpo del recurso',
          transcripcion: '',
          fuente: 'Equipo Co3',
          licencia: 'CC BY 4.0',
        },
      }),
    )
    renderEn('/cursos/c1/lecciones/l1')

    expect(await screen.findByText('Fuente: Equipo Co3')).toBeInTheDocument()
    expect(screen.getByText('Derechos de uso: CC BY 4.0')).toBeInTheDocument()
  })

  it('explica cuando la lección no existe', async () => {
    vi.mocked(obtenerLeccion).mockRejectedValue(new ErrorFormacion('No encontramos.', 404))
    renderEn('/cursos/c1/lecciones/x')

    expect(await screen.findByText('No encontramos esta lección')).toBeInTheDocument()
  })
})
