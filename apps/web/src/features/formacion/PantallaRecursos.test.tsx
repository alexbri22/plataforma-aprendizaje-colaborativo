import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerSesionActual } from '../cuentas/api'
import { normalizarBusqueda } from '@plataforma/shared'
import {
  listarCursos,
  listarRecursos,
  listarRutas,
  type ConsultaCursos,
  type ConsultaRecursos,
  type ResumenCursoPublico,
  type ResumenRecurso,
} from './formacion.api'
import { PantallaRecursos } from './PantallaRecursos'

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  return { ...real, obtenerSesionActual: vi.fn() }
})

vi.mock('./formacion.api', async () => {
  const real = await vi.importActual<typeof import('./formacion.api')>('./formacion.api')
  return { ...real, listarRecursos: vi.fn(), listarCursos: vi.fn(), listarRutas: vi.fn() }
})

function recurso(parcial: Partial<ResumenRecurso> & Pick<ResumenRecurso, 'idRecurso' | 'titulo'>) {
  return {
    seccion: 'como_colaborar',
    resumen: '',
    tipoRecurso: 'texto',
    area: 'comunicacion',
    elementos: [],
    duracionMin: 5,
    orden: 0,
    fechaActualizacion: '2026-09-01T00:00:00.000Z',
    archivo: null,
    ...parcial,
  } satisfies ResumenRecurso
}

const RECURSOS: ResumenRecurso[] = [
  recurso({
    idRecurso: 'r1',
    titulo: 'Los cinco elementos',
    seccion: 'que_es_colaborar',
    area: 'reflexion',
  }),
  recurso({ idRecurso: 'r2', titulo: 'Acuerdos que se recuerdan', area: 'coordinacion' }),
  recurso({
    idRecurso: 'r3',
    titulo: 'Plantilla de acuerdos claros',
    tipoRecurso: 'plantilla',
    area: 'organizacion',
  }),
]

function renderPantalla() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PantallaRecursos />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return queryClient
}

const CURSOS: ResumenCursoPublico[] = [
  {
    idCurso: 'c1',
    titulo: 'Comunicación clara en equipos',
    resumen: 'Expresa ideas de forma directa.',
    area: 'comunicacion',
    nivel: 'inicial',
    elementos: ['interaccion_promotora'],
    numLecciones: 3,
    duracionMin: 30,
    fechaActualizacion: '2026-09-01T00:00:00.000Z',
  },
  {
    idCurso: 'c2',
    titulo: 'Retrospectivas para mejorar',
    resumen: 'Revisa cómo colaboró el grupo.',
    area: 'reflexion',
    nivel: 'intermedio',
    elementos: ['procesamiento_grupal'],
    numLecciones: 4,
    duracionMin: 40,
    fechaActualizacion: '2026-09-01T00:00:00.000Z',
  },
]

function servidorCursos(catalogo: ResumenCursoPublico[]) {
  return async (consulta: ConsultaCursos = {}) => {
    const filtrados = catalogo.filter(
      (c) =>
        (!consulta.area || c.area === consulta.area) &&
        (!consulta.nivel || c.nivel === consulta.nivel) &&
        (!consulta.elemento || c.elementos.includes(consulta.elemento)) &&
        (!consulta.texto ||
          normalizarBusqueda(c.titulo).includes(normalizarBusqueda(consulta.texto))),
    )
    const pagina = consulta.pagina ?? 1
    const porPagina = consulta.porPagina ?? 9
    return {
      cursos: filtrados.slice((pagina - 1) * porPagina, pagina * porPagina),
      paginacion: {
        pagina,
        porPagina,
        total: filtrados.length,
        totalPaginas: Math.ceil(filtrados.length / porPagina),
      },
    }
  }
}

// Servidor de mentira: filtra y pagina como lo hace GET /api/recursos.
function servidor(catalogo: ResumenRecurso[]) {
  return async (consulta: ConsultaRecursos = {}) => {
    const filtrados = catalogo.filter(
      (r) =>
        (!consulta.area || r.area === consulta.area) &&
        (!consulta.seccion || r.seccion === consulta.seccion) &&
        (!consulta.tipos || consulta.tipos.includes(r.tipoRecurso)) &&
        (!consulta.texto ||
          normalizarBusqueda(`${r.titulo} ${r.resumen}`).includes(
            normalizarBusqueda(consulta.texto),
          )),
    )
    const pagina = consulta.pagina ?? 1
    const porPagina = consulta.porPagina ?? 9
    return {
      recursos: filtrados.slice((pagina - 1) * porPagina, pagina * porPagina),
      paginacion: {
        pagina,
        porPagina,
        total: filtrados.length,
        totalPaginas: Math.ceil(filtrados.length / porPagina),
      },
    }
  }
}

beforeAll(() => {
  // jsdom no implementa el desplazamiento; la pantalla lo usa al cambiar de
  // página para llevar la vista al inicio de la sección.
  Element.prototype.scrollIntoView = vi.fn()
})

describe('PantallaRecursos', () => {
  beforeEach(() => {
    vi.mocked(obtenerSesionActual).mockResolvedValue(null)
    vi.mocked(listarRecursos).mockReset()
    vi.mocked(listarRecursos).mockImplementation(servidor(RECURSOS))
    vi.mocked(listarCursos).mockReset()
    vi.mocked(listarCursos).mockImplementation(servidorCursos(CURSOS))
    vi.mocked(listarRutas).mockResolvedValue({
      rutas: [],
      paginacion: { pagina: 1, porPagina: 50, total: 0, totalPaginas: 0 },
    })
  })

  it('lista los cursos publicados con enlace a su ficha', async () => {
    renderPantalla()

    const enlace = await screen.findByRole('link', {
      name: /Ver curso.*Comunicación clara en equipos/,
    })
    expect(enlace).toHaveAttribute('href', '/cursos/c1')
    expect(screen.queryByText('Próximamente')).not.toBeInTheDocument()
  })

  it('filtra los cursos por nivel y ofrece volver a verlos todos', async () => {
    const user = userEvent.setup()
    renderPantalla()
    await screen.findByText('Retrospectivas para mejorar')

    await user.selectOptions(screen.getByLabelText('Nivel'), 'avanzado')
    expect(await screen.findByText(/Ningún curso coincide/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ver todos los cursos' }))
    expect(await screen.findByText('Retrospectivas para mejorar')).toBeInTheDocument()
  })

  it('elegir una sección oculta los cursos, que no pertenecen a ninguna', async () => {
    const user = userEvent.setup()
    renderPantalla()
    await screen.findByText('Retrospectivas para mejorar')

    await user.selectOptions(screen.getByLabelText('Sección'), 'como_colaborar')
    await waitFor(() =>
      expect(screen.queryByText('Retrospectivas para mejorar')).not.toBeInTheDocument(),
    )
  })

  it('separa artículos de recursos breves y destaca el primero de Qué es colaborar', async () => {
    renderPantalla()

    const articulos = await screen.findByRole('region', { name: 'Artículos' })
    expect(
      within(articulos).getByRole('heading', { name: 'Los cinco elementos' }),
    ).toBeInTheDocument()
    expect(
      within(articulos).getByRole('heading', { name: 'Acuerdos que se recuerdan' }),
    ).toBeInTheDocument()

    const breves = screen.getByRole('region', { name: 'Recursos breves' })
    expect(
      within(breves).getByRole('link', { name: /Plantilla de acuerdos claros/ }),
    ).toHaveAttribute('href', '/recursos/r3')

    expect(screen.getByText('Empieza por aquí')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Leer ahora' })).toHaveAttribute('href', '/recursos/r1')
  })

  it('filtra por habilidad y ofrece limpiar cuando no hay resultados', async () => {
    const user = userEvent.setup()
    renderPantalla()
    await screen.findByRole('region', { name: 'Artículos' })

    await user.click(screen.getByRole('button', { name: 'Organización' }))
    expect(screen.queryByRole('region', { name: 'Artículos' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Recursos breves' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Buscar en el catálogo'), 'inexistente')
    expect(
      await screen.findByText('No encontramos contenido con esos criterios'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(await screen.findByRole('region', { name: 'Artículos' })).toBeInTheDocument()
  })

  it('pide la búsqueda al servidor cuando se deja de escribir, no por cada tecla', async () => {
    const user = userEvent.setup()
    renderPantalla()
    await screen.findByRole('region', { name: 'Artículos' })
    vi.mocked(listarRecursos).mockClear()

    await user.type(screen.getByLabelText('Buscar en el catálogo'), 'plantilla')
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Artículos' })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('link', { name: /Plantilla de acuerdos claros/ })).toBeInTheDocument()

    const textos = vi.mocked(listarRecursos).mock.calls.map(([c]) => c?.texto)
    expect(textos).toContain('plantilla')
    expect(textos).not.toContain('pla')
  })

  it('pagina los artículos y vuelve a la primera página al cambiar un filtro', async () => {
    const user = userEvent.setup()
    const muchos = Array.from({ length: 8 }, (_, i) =>
      recurso({ idRecurso: `a${i}`, titulo: `Artículo ${i + 1}` }),
    )
    vi.mocked(listarRecursos).mockImplementation(servidor(muchos))
    renderPantalla()

    const articulos = await screen.findByRole('region', { name: 'Artículos' })
    expect(within(articulos).getAllByRole('heading', { level: 3 })).toHaveLength(6)

    await user.click(within(articulos).getByRole('button', { name: 'Siguiente' }))
    expect(await within(articulos).findByText('Artículo 7')).toBeInTheDocument()
    expect(within(articulos).queryByText('Artículo 1')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Comunicación' }))
    expect(await within(articulos).findByText('Artículo 1')).toBeInTheDocument()
  })

  it('si el catálogo se reduce estando en una página que ya no existe, vuelve a la última', async () => {
    const user = userEvent.setup()
    const ocho = Array.from({ length: 8 }, (_, i) =>
      recurso({ idRecurso: `a${i}`, titulo: `Artículo ${i + 1}` }),
    )
    vi.mocked(listarRecursos).mockImplementation(servidor(ocho))
    const queryClient = renderPantalla()

    const articulos = await screen.findByRole('region', { name: 'Artículos' })
    await user.click(within(articulos).getByRole('button', { name: 'Siguiente' }))
    expect(await within(articulos).findByText('Artículo 7')).toBeInTheDocument()

    // Se retiran dos artículos y la lista se vuelve a pedir: ya solo hay una
    // página, y la 2 llegaría vacía.
    vi.mocked(listarRecursos).mockImplementation(servidor(ocho.slice(0, 6)))
    await queryClient.invalidateQueries()

    expect(await within(articulos).findByText('Artículo 1')).toBeInTheDocument()
    expect(within(articulos).getAllByRole('heading', { level: 3 })).toHaveLength(6)
  })
})
