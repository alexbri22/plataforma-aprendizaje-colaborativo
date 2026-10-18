import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerSesionActual } from '../cuentas/api'
import { normalizarBusqueda } from '@plataforma/shared'
import { listarRecursos, type ConsultaRecursos, type ResumenRecurso } from './formacion.api'
import { PantallaRecursos } from './PantallaRecursos'

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  return { ...real, obtenerSesionActual: vi.fn() }
})

vi.mock('./formacion.api', async () => {
  const real = await vi.importActual<typeof import('./formacion.api')>('./formacion.api')
  return { ...real, listarRecursos: vi.fn() }
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

describe('PantallaRecursos', () => {
  beforeEach(() => {
    vi.mocked(obtenerSesionActual).mockResolvedValue(null)
    vi.mocked(listarRecursos).mockReset()
    vi.mocked(listarRecursos).mockImplementation(servidor(RECURSOS))
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

    await user.click(within(articulos).getByRole('button', { name: 'Página 2' }))
    expect(await within(articulos).findByText('Artículo 7')).toBeInTheDocument()
    expect(within(articulos).queryByText('Artículo 1')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Comunicación' }))
    expect(await within(articulos).findByText('Artículo 1')).toBeInTheDocument()
  })
})
