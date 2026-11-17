import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerSesionActual } from '../cuentas/api'
import {
  cambiarVisibilidadConstancias,
  listarRecursos,
  listarRutas,
  obtenerMiFormacion,
  obtenerMisConstancias,
  obtenerPreferencias,
  obtenerRecomendaciones,
  type ConstanciaPropia,
  type MiCurso,
  type ResumenRecurso,
  type ResumenRutaPublica,
  type RutaRecomendada,
} from './formacion.api'
import { PantallaMisDiplomas } from './PantallaMisDiplomas'
import { PantallaPlantillas } from './PantallaPlantillas'
import { PantallaRutasAprendizaje } from './PantallaRutasAprendizaje'

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  return { ...real, obtenerSesionActual: vi.fn() }
})

vi.mock('./formacion.api', async () => {
  const real = await vi.importActual<typeof import('./formacion.api')>('./formacion.api')
  return {
    ...real,
    listarRecursos: vi.fn(),
    listarRutas: vi.fn(),
    obtenerMiFormacion: vi.fn(),
    obtenerRecomendaciones: vi.fn(),
    obtenerPreferencias: vi.fn(),
    obtenerMisConstancias: vi.fn(),
    cambiarVisibilidadConstancias: vi.fn(),
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

const DERIVADO = {
  elementos: [{ elemento: 'interaccion_promotora' as const, cursos: 2 }],
  nivelInicial: 'inicial' as const,
  duracionMin: 45,
  numCursos: 2,
}

const RUTA_DESTACADA: ResumenRutaPublica = {
  idRuta: 'rd',
  titulo: 'Organización y corresponsabilidad',
  finalidad: 'Coordinar mejor los aportes.',
  destacada: true,
  derivado: DERIVADO,
  cursos: [
    { idCurso: 'k1', titulo: 'Acuerdos', nivel: 'inicial', duracionMin: 20, disponible: true },
    { idCurso: 'k2', titulo: 'Metas', nivel: 'inicial', duracionMin: 25, disponible: true },
  ],
}

const RUTA_COMUNICACION: ResumenRutaPublica = {
  idRuta: 'rc',
  titulo: 'Comunicación y confianza',
  finalidad: 'Expresar ideas con claridad.',
  destacada: false,
  derivado: DERIVADO,
  cursos: [
    { idCurso: 'c1', titulo: 'Comunicación', nivel: 'inicial', duracionMin: 20, disponible: true },
    // Retirado: no cuenta para el avance.
    { idCurso: 'c2', titulo: 'Retirado', nivel: null, duracionMin: 0, disponible: false },
    { idCurso: 'c3', titulo: 'Escucha', nivel: 'inicial', duracionMin: 25, disponible: true },
  ],
}

const RECOMENDADA: RutaRecomendada = {
  idRuta: 'rc',
  puntaje: 82,
  senales: { interes: 1, brecha: 1, continuidad: 0, nivel: 1 },
  razones: [],
  avance: { completados: 0, total: 2 },
  ruta: {
    ...RUTA_COMUNICACION,
    cursos: RUTA_COMUNICACION.cursos.map((c) => ({ ...c, estado: 'pendiente' as const })),
  },
}

function miCurso(parcial: Partial<MiCurso> & Pick<MiCurso, 'idCurso' | 'titulo'>): MiCurso {
  return {
    estatus: 'publicado',
    fechaInicio: '2026-11-01T12:00:00.000Z',
    fechaFinalizacion: null,
    fechaUltimaActividad: '2026-11-02T12:00:00.000Z',
    total: 4,
    completadas: 1,
    porcentaje: 25,
    siguiente: null,
    ...parcial,
  }
}

function constancia(parcial: Partial<ConstanciaPropia> = {}): ConstanciaPropia {
  return {
    folio: 'CO3-7KQM-4XPA',
    tipo: 'curso',
    titulo: 'Retrospectivas',
    numCursos: 0,
    fechaFinalizacion: '2026-11-02T12:00:00.000Z',
    idCurso: 'c9',
    idRuta: null,
    ...parcial,
  }
}

function plantilla(
  parcial: Partial<ResumenRecurso> & Pick<ResumenRecurso, 'idRecurso' | 'titulo'>,
) {
  return {
    seccion: 'como_colaborar',
    resumen: 'Para cerrar una reunión con acuerdos.',
    tipoRecurso: 'plantilla',
    area: 'organizacion',
    elementos: [],
    duracionMin: 10,
    orden: 0,
    fechaActualizacion: '2026-09-01T00:00:00.000Z',
    archivo: null,
    ...parcial,
  } satisfies ResumenRecurso
}

function pagina(total: number) {
  return { pagina: 1, porPagina: 9, total, totalPaginas: Math.ceil(total / 9) }
}

function renderEn(ruta: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/rutas" element={<PantallaRutasAprendizaje />} />
          <Route path="/plantillas" element={<PantallaPlantillas />} />
          <Route path="/mis-diplomas" element={<PantallaMisDiplomas />} />
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
  sessionStorage.clear()
  vi.mocked(obtenerSesionActual).mockResolvedValue(ANA)
  vi.mocked(listarRutas).mockResolvedValue({
    rutas: [RUTA_DESTACADA, RUTA_COMUNICACION],
    paginacion: pagina(2),
  })
  vi.mocked(obtenerRecomendaciones).mockResolvedValue({ modo: 'editorial', recomendaciones: [] })
  vi.mocked(obtenerPreferencias).mockResolvedValue([])
  vi.mocked(obtenerMiFormacion).mockResolvedValue({ enCurso: [], completados: [] })
  vi.mocked(obtenerMisConstancias).mockResolvedValue({ constancias: [], publicas: false })
  vi.mocked(listarRecursos).mockResolvedValue({ recursos: [], paginacion: pagina(0) })
})

describe('Rutas de aprendizaje', () => {
  it('sin sesión lista todas las rutas en tarjetas, sin avance ni preferencias', async () => {
    vi.mocked(obtenerSesionActual).mockResolvedValue(null)
    renderEn('/rutas')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Rutas de aprendizaje' }),
    ).toBeInTheDocument()
    const lista = await screen.findByRole('list', { name: 'Rutas de aprendizaje' })
    const tarjetas = within(lista).getAllByRole('listitem')
    expect(tarjetas).toHaveLength(2)
    expect(within(tarjetas[0]).getByRole('link', { name: RUTA_DESTACADA.titulo })).toHaveAttribute(
      'href',
      '/rutas/rd',
    )
    expect(within(tarjetas[0]).getByText(/Trabaja: Interacción/)).toBeInTheDocument()
    expect(
      screen.queryByRole('group', { name: '¿Qué quieres fortalecer?' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(obtenerRecomendaciones).not.toHaveBeenCalled()
  })

  it('con sesión, la recomendada va primero y cada ruta dice cuánto llevas', async () => {
    vi.mocked(obtenerRecomendaciones).mockResolvedValue({
      modo: 'personalizado',
      recomendaciones: [RECOMENDADA],
    })
    vi.mocked(obtenerMiFormacion).mockResolvedValue({
      enCurso: [miCurso({ idCurso: 'c3', titulo: 'Escucha' })],
      completados: [
        miCurso({ idCurso: 'c1', titulo: 'Comunicación', fechaFinalizacion: '2026-11-03' }),
        miCurso({ idCurso: 'k1', titulo: 'Acuerdos', fechaFinalizacion: '2026-11-03' }),
        miCurso({ idCurso: 'k2', titulo: 'Metas', fechaFinalizacion: '2026-11-04' }),
      ],
    })
    vi.mocked(obtenerMisConstancias).mockResolvedValue({
      constancias: [
        constancia({
          folio: 'CO3-RUTA-0001',
          tipo: 'ruta',
          titulo: RUTA_DESTACADA.titulo,
          idCurso: null,
          idRuta: 'rd',
          numCursos: 2,
        }),
      ],
      publicas: false,
    })
    renderEn('/rutas')

    const lista = await screen.findByRole('list', { name: 'Rutas de aprendizaje' })
    await waitFor(() =>
      expect(within(lista).getAllByRole('listitem')[0]).toHaveTextContent(RUTA_COMUNICACION.titulo),
    )
    const [comunicacion, destacada] = within(lista).getAllByRole('listitem')

    expect(within(comunicacion).getByText('Recomendada para ti')).toBeInTheDocument()
    expect(within(comunicacion).getByText('En curso')).toBeInTheDocument()
    // El curso retirado no cuenta: 1 de 2, no 1 de 3.
    expect(await within(comunicacion).findByText('1 de 2 cursos terminados')).toBeInTheDocument()
    expect(within(comunicacion).queryByRole('link', { name: /constancia/ })).not.toBeInTheDocument()

    expect(within(destacada).getByText('Completada')).toBeInTheDocument()
    expect(
      await within(destacada).findByRole('link', {
        name: `Ver la constancia de ${RUTA_DESTACADA.titulo}`,
      }),
    ).toHaveAttribute('href', '/constancias/CO3-RUTA-0001')

    expect(
      await screen.findByRole('group', { name: '¿Qué quieres fortalecer?' }),
    ).toBeInTheDocument()
  })

  it('sin rutas publicadas lo dice', async () => {
    vi.mocked(listarRutas).mockResolvedValue({ rutas: [], paginacion: pagina(0) })
    renderEn('/rutas')

    expect(await screen.findByText('Todavía no hay rutas publicadas.')).toBeInTheDocument()
  })
})

describe('Plantillas', () => {
  it('lista solo plantillas, con el formato de su archivo, y filtra por habilidad', async () => {
    const user = userEvent.setup()
    vi.mocked(listarRecursos).mockResolvedValue({
      recursos: [
        plantilla({
          idRecurso: 'p1',
          titulo: 'Acuerdos claros',
          archivo: {
            nombre: 'acuerdos.docx',
            tipo: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            tamano: 2048,
            url: '/api/recursos/p1/archivo?v=1',
          },
        }),
        plantilla({ idRecurso: 'p2', titulo: 'Retrospectiva', area: 'reflexion' }),
      ],
      paginacion: pagina(2),
    })
    renderEn('/plantillas')

    const lista = await screen.findByRole('list', { name: 'Plantillas' })
    const [conArchivo, soloTexto] = within(lista).getAllByRole('listitem')
    expect(within(conArchivo).getByText('Word · 10 min')).toBeInTheDocument()
    expect(within(conArchivo).getByRole('link', { name: 'Acuerdos claros' })).toHaveAttribute(
      'href',
      '/recursos/p1',
    )
    expect(within(soloTexto).getByText('10 min')).toBeInTheDocument()
    expect(vi.mocked(listarRecursos).mock.calls[0][0]).toMatchObject({
      tipos: ['plantilla'],
      pagina: 1,
    })

    await user.click(screen.getByRole('button', { name: 'Reflexión' }))
    await waitFor(() =>
      expect(vi.mocked(listarRecursos).mock.calls.at(-1)?.[0]).toMatchObject({
        tipos: ['plantilla'],
        area: 'reflexion',
      }),
    )
  })

  it('sin resultados con filtros, ofrece limpiarlos', async () => {
    const user = userEvent.setup()
    renderEn('/plantillas')

    expect(await screen.findByText('Todavía no hay plantillas publicadas.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Conflictos' }))
    expect(
      await screen.findByText('No encontramos plantillas con esos criterios.'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(await screen.findByText('Todavía no hay plantillas publicadas.')).toBeInTheDocument()
  })
})

describe('Mis diplomas', () => {
  it('muestra mis constancias en tarjetas y permite mostrarlas en mi perfil', async () => {
    const user = userEvent.setup()
    vi.mocked(obtenerMisConstancias).mockResolvedValue({
      constancias: [
        constancia(),
        constancia({
          folio: 'CO3-RUTA-0001',
          tipo: 'ruta',
          titulo: 'Organización y corresponsabilidad',
          idCurso: null,
          idRuta: 'rd',
          numCursos: 2,
        }),
      ],
      publicas: false,
    })
    vi.mocked(cambiarVisibilidadConstancias).mockResolvedValue(true)
    renderEn('/mis-diplomas')

    const lista = await screen.findByRole('list', { name: 'Mis constancias' })
    const [curso, ruta] = within(lista).getAllByRole('listitem')
    expect(within(curso).getByText('Curso')).toBeInTheDocument()
    expect(within(curso).getByText('CO3-7KQM-4XPA')).toBeInTheDocument()
    expect(within(curso).getByText('Terminado el 2 de noviembre de 2026')).toBeInTheDocument()
    expect(within(curso).getByRole('link', { name: /Ver constancia/ })).toHaveAttribute(
      'href',
      '/constancias/CO3-7KQM-4XPA',
    )
    expect(within(ruta).getByText('Ruta')).toBeInTheDocument()
    expect(within(ruta).getByText(/2 cursos/)).toBeInTheDocument()

    const interruptor = screen.getByRole('switch', { name: 'Mostrar mis constancias en mi perfil' })
    expect(interruptor).not.toBeChecked()
    await user.click(interruptor)
    expect(cambiarVisibilidadConstancias).toHaveBeenCalledWith(true, expect.anything())
    expect(await screen.findByText(/Otras personas con sesión las ven/)).toBeInTheDocument()
  })

  it('sin constancias lo explica y ofrece explorar', async () => {
    renderEn('/mis-diplomas')

    expect(await screen.findByText(/Todavía no tienes constancias/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Explorar recursos' })).toHaveAttribute(
      'href',
      '/recursos',
    )
  })

  it('la barra lateral enlaza las tres páginas y deja Recursos compartidos sin enlace', async () => {
    renderEn('/mis-diplomas')

    await screen.findByText(/Todavía no tienes constancias/)
    expect(screen.getByRole('link', { name: 'Rutas de aprendizaje' })).toHaveAttribute(
      'href',
      '/rutas',
    )
    expect(screen.getByRole('link', { name: 'Plantillas' })).toHaveAttribute('href', '/plantillas')
    const actual = screen.getByRole('link', { name: 'Mis diplomas' })
    expect(actual).toHaveAttribute('href', '/mis-diplomas')
    expect(actual).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Recursos compartidos').closest('a')).toBeNull()
  })
})
