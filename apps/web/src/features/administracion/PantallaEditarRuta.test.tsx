import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerSesionActual, type Usuario } from '../cuentas/api'
import {
  ErrorFormacion,
  actualizarRuta,
  crearRuta,
  listarCursosAdmin,
  listarRutasAdmin,
  obtenerRutaAdmin,
  reemplazarCursosRuta,
  type CursoDeRuta,
  type ResumenCursoAdmin,
  type RutaAdmin,
} from '../formacion/formacion.api'
import { PantallaEditarRuta } from './PantallaEditarRuta'
import { PantallaRutas } from './PantallaRutas'

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  return { ...real, obtenerSesionActual: vi.fn() }
})

vi.mock('../formacion/formacion.api', async () => {
  const real = await vi.importActual<typeof import('../formacion/formacion.api')>(
    '../formacion/formacion.api',
  )
  return {
    ...real,
    actualizarRuta: vi.fn(),
    crearRuta: vi.fn(),
    listarCursosAdmin: vi.fn(),
    listarRutasAdmin: vi.fn(),
    obtenerRutaAdmin: vi.fn(),
    reemplazarCursosRuta: vi.fn(),
  }
})

const ADMIN: Usuario = {
  idUsuario: 'a1',
  nombre: 'Grace',
  apellidoPaterno: 'Hopper',
  apellidoMaterno: 'Murray',
  correo: 'grace@example.com',
  tipoCuenta: 'administrador',
  fotoUrl: null,
}

function cursoDeRuta(idCurso: string, titulo: string, parcial: Partial<CursoDeRuta> = {}) {
  return {
    idCurso,
    titulo,
    resumen: '',
    area: 'comunicacion',
    nivel: 'inicial',
    elementos: ['interaccion_promotora'],
    numLecciones: 2,
    duracionMin: 15,
    fechaActualizacion: '2026-09-01T00:00:00.000Z',
    estatus: 'publicado',
    disponible: true,
    ...parcial,
  } satisfies CursoDeRuta
}

const CLARA = cursoDeRuta('c1', 'Comunicación clara')
const ESCUCHA = cursoDeRuta('c2', 'Escucha activa', { nivel: 'intermedio' })

const RUTA: RutaAdmin = {
  idRuta: 'r1',
  titulo: 'Comunicación y confianza',
  finalidad: '',
  descripcion: '',
  estatus: 'borrador',
  destacada: false,
  orden: 0,
  numCursos: 1,
  versionFicha: 3,
  fechaCreacion: '2026-09-01T00:00:00.000Z',
  fechaActualizacion: '2026-09-01T00:00:00.000Z',
  autor: null,
  cursos: [CLARA],
  derivado: {
    elementos: [{ elemento: 'interaccion_promotora', cursos: 1 }],
    nivelInicial: 'inicial',
    duracionMin: 15,
    numCursos: 1,
  },
}

function resumenCurso(c: CursoDeRuta): ResumenCursoAdmin {
  return {
    idCurso: c.idCurso,
    titulo: c.titulo,
    resumen: '',
    area: c.area,
    nivel: c.nivel,
    estatus: c.estatus,
    orden: 0,
    numLecciones: c.numLecciones,
    duracionMin: c.duracionMin,
    fechaActualizacion: c.fechaActualizacion,
  }
}

function renderEn(ruta: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/admin/rutas" element={<PantallaRutas />} />
          <Route path="/admin/rutas/nuevo" element={<PantallaEditarRuta />} />
          <Route path="/admin/rutas/:id" element={<PantallaEditarRuta />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeAll(() => {
  // jsdom no implementa el desplazamiento.
  Element.prototype.scrollIntoView = vi.fn()
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(obtenerSesionActual).mockResolvedValue(ADMIN)
  vi.mocked(obtenerRutaAdmin).mockResolvedValue(RUTA)
  vi.mocked(listarCursosAdmin).mockResolvedValue({
    cursos: [CLARA, ESCUCHA].map(resumenCurso),
    paginacion: { pagina: 1, porPagina: 20, total: 2, totalPaginas: 1 },
  })
  vi.mocked(listarRutasAdmin).mockResolvedValue({
    rutas: [RUTA],
    paginacion: { pagina: 1, porPagina: 20, total: 1, totalPaginas: 1 },
  })
})

describe('PantallaRutas', () => {
  it('lista las rutas con su estatus y enlace al editor', async () => {
    vi.mocked(listarRutasAdmin).mockResolvedValue({
      rutas: [{ ...RUTA, destacada: true }],
      paginacion: { pagina: 1, porPagina: 20, total: 1, totalPaginas: 1 },
    })
    renderEn('/admin/rutas')

    expect(await screen.findByRole('link', { name: 'Comunicación y confianza' })).toHaveAttribute(
      'href',
      '/admin/rutas/r1',
    )
    expect(screen.getByText('Destacada')).toBeInTheDocument()
    expect(screen.getByText('Borrador')).toBeInTheDocument()
  })
})

describe('PantallaEditarRuta', () => {
  it('una ruta nueva se queda en el editor para agregarle cursos', async () => {
    vi.mocked(crearRuta).mockResolvedValue({ ...RUTA, cursos: [] })
    const user = userEvent.setup()
    renderEn('/admin/rutas/nuevo')

    await user.type(await screen.findByLabelText('Título'), 'Comunicación y confianza')
    await user.click(screen.getByRole('button', { name: 'Crear ruta' }))

    expect(crearRuta).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Comunicación y confianza', destacada: false }),
    )
    expect(await screen.findByText(/Ahora agrega sus cursos/)).toBeInTheDocument()
  })

  it('los requisitos y lo calculado de los cursos se ven en vivo', async () => {
    const user = userEvent.setup()
    renderEn('/admin/rutas/r1')

    const lateral = await screen.findByRole('complementary', { name: 'Publicación de la ruta' })
    expect(within(lateral).getByText(/Finalidad escrita/)).toHaveTextContent('pendiente')
    expect(within(lateral).getByText(/De 2 a 5 cursos/)).toHaveTextContent('pendiente')
    expect(within(lateral).getByText(/Empieza en nivel inicial · 15 min/)).toBeInTheDocument()
    expect(within(lateral).getByText('Interacción promotora: 1 curso')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Finalidad: para qué sirve la ruta'), 'Hablar claro.')
    expect(within(lateral).getByText(/Finalidad escrita/)).toHaveTextContent('cumplido')
  })

  it('agregar un curso guarda la lista completa, y luego la ficha usa la versión nueva', async () => {
    const conDos = { ...RUTA, cursos: [CLARA, ESCUCHA], numCursos: 2, versionFicha: 4 }
    vi.mocked(reemplazarCursosRuta).mockResolvedValue(conDos)
    vi.mocked(actualizarRuta).mockResolvedValue({ ...conDos, versionFicha: 5 })
    const user = userEvent.setup()
    renderEn('/admin/rutas/r1')

    await user.click(await screen.findByRole('button', { name: 'Agregar curso' }))
    const modal = await screen.findByRole('dialog')
    expect(within(modal).getByText('Ya está en la ruta')).toBeInTheDocument()
    await user.click(within(modal).getByRole('button', { name: 'Agregar Escucha activa' }))

    expect(reemplazarCursosRuta).toHaveBeenCalledWith('r1', ['c1', 'c2'], 3)
    expect(await screen.findByText('Curso agregado.')).toBeInTheDocument()

    // Su propio cambio movió la versión: guardar la ficha no debe chocar.
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }))
    expect(actualizarRuta).toHaveBeenCalledWith('r1', expect.objectContaining({ versionFicha: 4 }))
  })

  it('reordena con flechas y quita cursos', async () => {
    vi.mocked(obtenerRutaAdmin).mockResolvedValue({ ...RUTA, cursos: [CLARA, ESCUCHA] })
    vi.mocked(reemplazarCursosRuta).mockResolvedValue({ ...RUTA, cursos: [ESCUCHA, CLARA] })
    const user = userEvent.setup()
    renderEn('/admin/rutas/r1')

    await screen.findByRole('button', { name: 'Bajar curso 1' })
    // Lo que el servidor devolverá al releer la ruta tras reordenar.
    vi.mocked(obtenerRutaAdmin).mockResolvedValue({ ...RUTA, cursos: [ESCUCHA, CLARA] })
    await user.click(screen.getByRole('button', { name: 'Bajar curso 1' }))
    expect(reemplazarCursosRuta).toHaveBeenLastCalledWith('r1', ['c2', 'c1'], 3)
    // La lista ya se repintó con el orden nuevo: el curso 1 ahora es Escucha.
    expect(await screen.findByText('Orden actualizado.')).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: 'Quitar curso 1' }))
    expect(reemplazarCursosRuta).toHaveBeenLastCalledWith('r1', ['c1'], 3)
  })

  it('avisa de un curso sin publicar dentro de la ruta', async () => {
    vi.mocked(obtenerRutaAdmin).mockResolvedValue({
      ...RUTA,
      cursos: [CLARA, cursoDeRuta('c3', 'En borrador', { estatus: 'borrador', disponible: false })],
    })
    renderEn('/admin/rutas/r1')

    expect(await screen.findByText(/publícalo antes de publicar la ruta/)).toBeInTheDocument()
  })

  it('si no se puede publicar, explica qué falta', async () => {
    vi.mocked(actualizarRuta).mockRejectedValue(
      new ErrorFormacion('La petición no es válida.', 400, {
        cursos: 'Una ruta publicada necesita al menos 2 cursos.',
      }),
    )
    const user = userEvent.setup()
    renderEn('/admin/rutas/r1')

    await user.click(await screen.findByRole('button', { name: 'Publicar' }))
    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('No se pudo publicar porque faltan datos:')
    expect(alerta).toHaveTextContent('Una ruta publicada necesita al menos 2 cursos.')
  })

  it('si otro administrador guardó antes, ofrece cargar la versión actual', async () => {
    vi.mocked(actualizarRuta).mockRejectedValue(
      new ErrorFormacion('Otro administrador…', 409, undefined, 'ruta_desactualizada'),
    )
    const user = userEvent.setup()
    renderEn('/admin/rutas/r1')

    await user.click(await screen.findByRole('button', { name: 'Guardar borrador' }))
    expect(
      await screen.findByText('Otro administrador modificó esta ruta mientras la editabas.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cargar la versión actual' })).toBeInTheDocument()
  })
})
