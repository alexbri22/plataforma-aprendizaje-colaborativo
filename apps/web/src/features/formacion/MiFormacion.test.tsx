import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerSesionActual } from '../cuentas/api'
import {
  cambiarGuardado,
  estaGuardado,
  guardarPreferencias,
  listarCursos,
  listarRecursos,
  listarRecursosGuardados,
  listarRutas,
  obtenerMiFormacion,
  obtenerMisConstancias,
  obtenerPreferencias,
  obtenerRecomendaciones,
  obtenerRecurso,
  obtenerRuta,
  type ConstanciaPropia,
  type MiCurso,
  type MiFormacion,
  type ResumenRecurso,
  type ResumenRutaPublica,
  type RutaRecomendada,
} from './formacion.api'
import { PantallaMiFormacion } from './PantallaMiFormacion'
import { PantallaRecurso } from './PantallaRecurso'
import { PantallaRecursos } from './PantallaRecursos'
import { PantallaRuta } from './PantallaRuta'

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  return { ...real, obtenerSesionActual: vi.fn() }
})

vi.mock('./formacion.api', async () => {
  const real = await vi.importActual<typeof import('./formacion.api')>('./formacion.api')
  return {
    ...real,
    listarRecursos: vi.fn(),
    listarCursos: vi.fn(),
    obtenerRecurso: vi.fn(),
    obtenerMiFormacion: vi.fn(),
    listarRecursosGuardados: vi.fn(),
    estaGuardado: vi.fn(),
    cambiarGuardado: vi.fn(),
    listarRutas: vi.fn(),
    obtenerRuta: vi.fn(),
    obtenerRecomendaciones: vi.fn(),
    obtenerPreferencias: vi.fn(),
    guardarPreferencias: vi.fn(),
    obtenerMisConstancias: vi.fn(),
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

function miCurso(parcial: Partial<MiCurso> & Pick<MiCurso, 'idCurso' | 'titulo'>): MiCurso {
  return {
    estatus: 'publicado',
    fechaInicio: '2026-11-01T12:00:00.000Z',
    fechaFinalizacion: null,
    fechaUltimaActividad: '2026-11-02T12:00:00.000Z',
    total: 4,
    completadas: 1,
    porcentaje: 25,
    siguiente: { idLeccion: 'l2', titulo: 'Plantilla de acuerdos' },
    ...parcial,
  }
}

const ARTICULO: ResumenRecurso = {
  idRecurso: 'r1',
  seccion: 'que_es_colaborar',
  titulo: 'Los cinco elementos',
  resumen: 'Qué hace que un grupo colabore.',
  tipoRecurso: 'texto',
  area: 'reflexion',
  elementos: [],
  duracionMin: 5,
  orden: 0,
  fechaActualizacion: '2026-09-01T00:00:00.000Z',
  archivo: null,
}

function pagina<T>(items: T[], total = items.length) {
  return { pagina: 1, porPagina: 10, total, totalPaginas: Math.ceil(total / 10) }
}

function formacion(parcial: Partial<MiFormacion> = {}): MiFormacion {
  return { enCurso: [], completados: [], ...parcial }
}

function Ubicacion() {
  const { pathname, search } = useLocation()
  return <output data-testid="ubicacion">{pathname + search}</output>
}

function renderEn(ruta: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/recursos" element={<PantallaRecursos />} />
          <Route path="/recursos/:id" element={<PantallaRecurso />} />
          <Route path="/mi-formacion" element={<PantallaMiFormacion />} />
          <Route path="/rutas/:id" element={<PantallaRuta />} />
        </Routes>
        <Ubicacion />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return queryClient
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
  vi.mocked(listarRecursos).mockResolvedValue({
    recursos: [ARTICULO],
    paginacion: pagina([ARTICULO]),
  })
  vi.mocked(listarCursos).mockResolvedValue({ cursos: [], paginacion: pagina([]) })
  vi.mocked(obtenerMiFormacion).mockResolvedValue(formacion())
  vi.mocked(listarRecursosGuardados).mockResolvedValue({ recursos: [], paginacion: pagina([]) })
  vi.mocked(estaGuardado).mockResolvedValue(false)
  vi.mocked(cambiarGuardado).mockResolvedValue(undefined)
  vi.mocked(listarRutas).mockResolvedValue({ rutas: [], paginacion: pagina([]) })
  vi.mocked(obtenerRecomendaciones).mockResolvedValue({ modo: 'editorial', recomendaciones: [] })
  vi.mocked(obtenerPreferencias).mockResolvedValue([])
  vi.mocked(obtenerMisConstancias).mockResolvedValue({ constancias: [], publicas: false })
})

function constanciaPropia(parcial: Partial<ConstanciaPropia> = {}): ConstanciaPropia {
  return {
    folio: 'CO3-7KQM-4XPA',
    tipo: 'curso',
    titulo: 'Retrospectivas',
    numCursos: 0,
    fechaFinalizacion: '2026-11-02T12:00:00.000Z',
    idCurso: 'c3',
    idRuta: null,
    ...parcial,
  }
}

describe('Recursos con sesión y sin ella', () => {
  it('con sesión empieza directo en el catálogo, sin la presentación pública', async () => {
    vi.mocked(obtenerMiFormacion).mockResolvedValue(
      formacion({ enCurso: [miCurso({ idCurso: 'c1', titulo: 'Acuerdos claros' })] }),
    )
    renderEn('/recursos')

    expect(await screen.findByRole('heading', { name: 'Aprende a tu ritmo' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Aprender colaborando' })).not.toBeInTheDocument()
    // "Continuar" vive en Mi formación (observaciones del 12 de noviembre).
    expect(screen.queryByText('Continúa aprendiendo')).not.toBeInTheDocument()
    expect(screen.queryByText('Empieza por aquí')).not.toBeInTheDocument()
  })

  it('sin sesión se presenta como "Aprender colaborando" y no pide el progreso', async () => {
    vi.mocked(obtenerSesionActual).mockResolvedValue(null)
    renderEn('/recursos')

    expect(await screen.findByRole('heading', { name: 'Aprender colaborando' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Recursos' })).toBeInTheDocument()
    expect(obtenerMiFormacion).not.toHaveBeenCalled()
  })
})

describe('Mi formación: cursos', () => {
  it('separa en curso y completados, y un retirado no ofrece seguir', async () => {
    vi.mocked(obtenerMisConstancias).mockResolvedValue({
      constancias: [constanciaPropia()],
      publicas: false,
    })
    vi.mocked(obtenerMiFormacion).mockResolvedValue(
      formacion({
        enCurso: [
          miCurso({ idCurso: 'c1', titulo: 'Acuerdos claros' }),
          miCurso({ idCurso: 'c2', titulo: 'Curso viejo', estatus: 'retirado', siguiente: null }),
        ],
        completados: [
          miCurso({
            idCurso: 'c3',
            titulo: 'Retrospectivas',
            fechaFinalizacion: '2026-11-02T12:00:00.000Z',
            completadas: 4,
            porcentaje: 100,
            siguiente: null,
          }),
        ],
      }),
    )
    renderEn('/mi-formacion')

    // Una sola cuadrícula de tarjetas, cada una con su estado (observaciones
    // del 12 de noviembre); primero las que van en curso.
    const cursos = await screen.findByRole('region', { name: 'Cursos' })
    const tarjetas = await within(cursos).findAllByRole('listitem')
    expect(tarjetas.map((t) => within(t).getByRole('heading').textContent)).toEqual([
      'Acuerdos claros',
      'Curso viejo',
      'Retrospectivas',
    ])
    const [enCurso, retirado, completado] = tarjetas

    expect(within(enCurso).getByText('En curso')).toBeInTheDocument()
    expect(within(enCurso).getByRole('link', { name: 'Acuerdos claros' })).toHaveAttribute(
      'href',
      '/cursos/c1',
    )
    expect(within(enCurso).getByText('Sigue con: Plantilla de acuerdos')).toBeInTheDocument()
    expect(within(enCurso).getByRole('link', { name: /Continuar/ })).toHaveAttribute(
      'href',
      '/cursos/c1/lecciones/l2',
    )
    // Un curso en curso no tiene constancia.
    expect(within(enCurso).queryByRole('link', { name: /constancia/ })).not.toBeInTheDocument()

    expect(within(retirado).getByText('Retirado')).toBeInTheDocument()
    expect(within(retirado).queryByRole('link', { name: 'Curso viejo' })).not.toBeInTheDocument()
    expect(within(retirado).getByText(/se retiró del catálogo/)).toBeInTheDocument()
    expect(within(retirado).queryByRole('link', { name: /Continuar/ })).not.toBeInTheDocument()

    expect(within(completado).getByText('Completado')).toBeInTheDocument()
    expect(within(completado).getByText(/Completado el 2 de noviembre de 2026/)).toBeInTheDocument()
    expect(
      await within(completado).findByRole('link', { name: 'Ver la constancia de Retrospectivas' }),
    ).toHaveAttribute('href', '/constancias/CO3-7KQM-4XPA')

    // "¿Qué quieres fortalecer?" ya no está aquí: vive en Rutas recomendadas.
    expect(
      screen.queryByRole('group', { name: '¿Qué quieres fortalecer?' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('sin cursos invita a explorar', async () => {
    renderEn('/mi-formacion')

    expect(await screen.findByText(/Todavía no empiezas ningún curso/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Explorar recursos' })).toHaveAttribute(
      'href',
      '/recursos',
    )
  })
})

describe('Mi formación: guardados', () => {
  it('lista los guardados en tarjetas, con opción de quitarlos', async () => {
    vi.mocked(listarRecursosGuardados).mockResolvedValue({
      recursos: [ARTICULO],
      paginacion: pagina([ARTICULO]),
    })
    const user = userEvent.setup()
    renderEn('/mi-formacion')

    const guardados = await screen.findByRole('region', { name: 'Recursos guardados' })
    expect(
      await within(guardados).findByRole('link', { name: 'Los cinco elementos' }),
    ).toHaveAttribute('href', '/recursos/r1')
    expect(within(guardados).getByText('Guardado')).toBeInTheDocument()
    expect(listarRecursosGuardados).toHaveBeenCalledWith(1, 9)

    await user.click(
      within(guardados).getByRole('button', { name: 'Quitar «Los cinco elementos» de guardados' }),
    )
    expect(cambiarGuardado).toHaveBeenCalledWith('r1', false)
  })

  it('?vista=guardados lleva a su sección, para que los enlaces de antes sigan sirviendo', async () => {
    renderEn('/mi-formacion?vista=guardados')

    await screen.findByRole('region', { name: 'Recursos guardados' })
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
  })

  it('si la página quedó vacía (se quitó su último recurso), vuelve a la última que existe', async () => {
    vi.mocked(listarRecursosGuardados).mockImplementation(async (numero) =>
      numero === 1
        ? { recursos: [ARTICULO], paginacion: { ...pagina([ARTICULO], 10), totalPaginas: 1 } }
        : { recursos: [], paginacion: { ...pagina([], 10), pagina: 2, totalPaginas: 1 } },
    )
    renderEn('/mi-formacion?vista=guardados&pagina=2')

    expect(await screen.findByRole('link', { name: 'Los cinco elementos' })).toBeInTheDocument()
    expect(screen.getByTestId('ubicacion')).toHaveTextContent('/mi-formacion?vista=guardados')
  })

  it('sin guardados lo explica', async () => {
    renderEn('/mi-formacion?vista=guardados')

    expect(await screen.findByText(/Aún no guardas recursos/)).toBeInTheDocument()
  })
})

describe('guardar un recurso', () => {
  beforeEach(() => {
    vi.mocked(obtenerRecurso).mockResolvedValue({
      ...ARTICULO,
      contenido: 'Cuerpo',
      transcripcion: '',
      fuente: 'Co3',
      licencia: 'CC BY 4.0',
    })
  })

  it('con sesión se guarda y enlaza a Mi formación', async () => {
    const user = userEvent.setup()
    renderEn('/recursos/r1')

    await user.click(await screen.findByRole('button', { name: 'Guardar para después' }))

    expect(cambiarGuardado).toHaveBeenCalledWith('r1', true)
    expect(await screen.findByRole('button', { name: 'Quitar de guardados' })).toBeInTheDocument()
    const estado = screen.getByText(/Guardado en/)
    expect(within(estado).getByRole('link', { name: 'Mi formación' })).toHaveAttribute(
      'href',
      '/mi-formacion?vista=guardados',
    )
  })

  it('sin sesión no se ofrece', async () => {
    vi.mocked(obtenerSesionActual).mockResolvedValue(null)
    renderEn('/recursos/r1')

    expect(await screen.findByText('Cuerpo')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar para después' })).not.toBeInTheDocument()
    expect(estaGuardado).not.toHaveBeenCalled()
  })
})

// ---- Rutas de aprendizaje (incremento 4) ----

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
    {
      idCurso: 'c1',
      titulo: 'Comunicación clara',
      nivel: 'inicial',
      duracionMin: 20,
      disponible: true,
    },
    {
      idCurso: 'c2',
      titulo: 'Curso no disponible',
      nivel: null,
      duracionMin: 0,
      disponible: false,
    },
    {
      idCurso: 'c3',
      titulo: 'Escucha activa',
      nivel: 'inicial',
      duracionMin: 25,
      disponible: true,
    },
  ],
}

const RECOMENDADA: RutaRecomendada = {
  idRuta: 'rc',
  puntaje: 82,
  senales: { interes: 1, brecha: 1, continuidad: 0, nivel: 1 },
  razones: [
    'Trabaja Interacción, que elegiste fortalecer.',
    'Cubre Interacción, que aún no has trabajado en ningún curso completado.',
  ],
  avance: { completados: 0, total: 2 },
  ruta: {
    ...RUTA_COMUNICACION,
    cursos: RUTA_COMUNICACION.cursos.map((c) => ({ ...c, estado: 'pendiente' as const })),
  },
}

describe('ruta recomendada en /recursos', () => {
  beforeEach(() => {
    vi.mocked(listarRutas).mockResolvedValue({
      rutas: [RUTA_DESTACADA, RUTA_COMUNICACION],
      paginacion: pagina([RUTA_DESTACADA, RUTA_COMUNICACION]),
    })
  })

  it('con sesión muestra la del recomendador, con sus razones y las demás rutas', async () => {
    vi.mocked(obtenerRecomendaciones).mockResolvedValue({
      modo: 'personalizado',
      recomendaciones: [RECOMENDADA],
    })
    vi.mocked(obtenerPreferencias).mockResolvedValue(['interaccion_promotora'])
    renderEn('/recursos')

    const seccion = await screen.findByRole('region', { name: 'Comunicación y confianza' })
    expect(within(seccion).getByText('Ruta recomendada para ti')).toBeInTheDocument()
    expect(within(seccion).getByText('Por qué te la recomendamos')).toBeInTheDocument()
    expect(
      within(seccion).getByText('Trabaja Interacción, que elegiste fortalecer.'),
    ).toBeInTheDocument()
    expect(within(seccion).getByRole('link', { name: 'Ver la ruta' })).toHaveAttribute(
      'href',
      '/rutas/rc',
    )
    expect(
      within(seccion).getByRole('link', { name: 'Organización y corresponsabilidad' }),
    ).toHaveAttribute('href', '/rutas/rd')
    expect(within(seccion).queryByText(/Elige qué quieres fortalecer/)).not.toBeInTheDocument()
  })

  it('en modo editorial no inventa razones e invita a elegir qué fortalecer', async () => {
    vi.mocked(obtenerRecomendaciones).mockResolvedValue({
      modo: 'editorial',
      recomendaciones: [
        {
          ...RECOMENDADA,
          idRuta: 'rd',
          razones: ['Ruta destacada por el equipo de contenido para empezar.'],
          ruta: {
            ...RUTA_DESTACADA,
            cursos: RUTA_DESTACADA.cursos.map((c) => ({ ...c, estado: 'pendiente' as const })),
          },
        },
      ],
    })
    renderEn('/recursos')

    const seccion = await screen.findByRole('region', { name: 'Organización y corresponsabilidad' })
    expect(within(seccion).getByText('Ruta recomendada')).toBeInTheDocument()
    expect(within(seccion).queryByText('Por qué te la recomendamos')).not.toBeInTheDocument()
    expect(
      within(seccion).getByRole('link', { name: /Elige qué quieres fortalecer/ }),
    ).toHaveAttribute('href', '#preferencias')
  })

  it('sin sesión muestra la destacada y no pide recomendaciones', async () => {
    vi.mocked(obtenerSesionActual).mockResolvedValue(null)
    renderEn('/recursos')

    const seccion = await screen.findByRole('region', { name: 'Organización y corresponsabilidad' })
    expect(within(seccion).getByText('Ruta destacada')).toBeInTheDocument()
    expect(obtenerRecomendaciones).not.toHaveBeenCalled()
  })

  it('va después del catálogo, con su propio encabezado', async () => {
    vi.mocked(obtenerSesionActual).mockResolvedValue(null)
    renderEn('/recursos')

    const rutas = await screen.findByRole('region', { name: 'Rutas recomendadas' })
    const catalogo = screen.getByRole('region', { name: 'Recursos' })
    expect(catalogo.compareDocumentPosition(rutas) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(
      within(rutas).getByRole('region', { name: 'Organización y corresponsabilidad' }),
    ).toBeInTheDocument()
  })

  it('sin rutas publicadas no hay sección', async () => {
    vi.mocked(listarRutas).mockResolvedValue({ rutas: [], paginacion: pagina([]) })
    vi.mocked(obtenerSesionActual).mockResolvedValue(null)
    renderEn('/recursos')

    expect(await screen.findByRole('region', { name: 'Recursos' })).toBeInTheDocument()
    await waitFor(() => expect(listarRutas).toHaveBeenCalled())
    expect(screen.queryByRole('region', { name: 'Rutas recomendadas' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Ruta recomendada|Ruta destacada/)).not.toBeInTheDocument()
  })
})

describe('ficha de ruta', () => {
  beforeEach(() => {
    vi.mocked(obtenerRuta).mockResolvedValue({ ...RUTA_COMUNICACION, descripcion: 'Tres pasos.' })
  })

  it('con sesión marca el avance por curso y sigue en el pendiente', async () => {
    vi.mocked(obtenerMiFormacion).mockResolvedValue(
      formacion({
        completados: [
          miCurso({
            idCurso: 'c1',
            titulo: 'Comunicación clara',
            fechaFinalizacion: '2026-11-02T12:00:00.000Z',
          }),
        ],
      }),
    )
    renderEn('/rutas/rc')

    expect(
      await screen.findByRole('heading', { name: 'Comunicación y confianza' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('1 de 2 cursos · 50 %')).toBeInTheDocument()
    expect(screen.getByText('Completado')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Seguir con la ruta' })).toHaveAttribute(
      'href',
      '/cursos/c3',
    )
    // El curso retirado no tiene enlace ni cuenta.
    expect(screen.queryByRole('link', { name: 'Curso no disponible' })).not.toBeInTheDocument()
    expect(screen.getByText(/no cuenta para terminar la ruta/)).toBeInTheDocument()
  })

  it('con la ruta terminada enlaza su constancia', async () => {
    vi.mocked(obtenerMisConstancias).mockResolvedValue({
      publicas: false,
      constancias: [
        constanciaPropia({
          folio: 'CO3-R7TA-0001',
          tipo: 'ruta',
          titulo: 'Comunicación y confianza',
          numCursos: 2,
          idCurso: null,
          idRuta: 'rc',
        }),
      ],
    })
    renderEn('/rutas/rc')

    expect(
      await screen.findByRole('link', { name: 'Ver tu constancia de la ruta' }),
    ).toHaveAttribute('href', '/constancias/CO3-R7TA-0001')
  })

  it('si no se puede leer el avance, no lo inventa: ofrece reintentar', async () => {
    vi.mocked(obtenerMiFormacion).mockRejectedValue(new Error('Sin conexión'))
    renderEn('/rutas/rc')

    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.getByText('Sin conexión')).toBeInTheDocument()
    expect(screen.queryByText(/0 %/)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /Empezar la ruta|Seguir con la ruta/ }),
    ).not.toBeInTheDocument()
  })

  it('sin sesión no hay avance y empieza por el primer curso', async () => {
    vi.mocked(obtenerSesionActual).mockResolvedValue(null)
    renderEn('/rutas/rc')

    expect(await screen.findByRole('link', { name: 'Empezar la ruta' })).toHaveAttribute(
      'href',
      '/cursos/c1',
    )
    expect(screen.queryByText('Tu avance')).not.toBeInTheDocument()
    expect(obtenerMiFormacion).not.toHaveBeenCalled()
  })
})

describe('qué quieres fortalecer', () => {
  beforeEach(() => {
    vi.mocked(listarRutas).mockResolvedValue({
      rutas: [RUTA_DESTACADA],
      paginacion: pagina([RUTA_DESTACADA]),
    })
  })

  it('vive en Rutas recomendadas y se guarda al marcar, sin botón', async () => {
    vi.mocked(obtenerPreferencias).mockResolvedValue(['responsabilidades'])
    vi.mocked(guardarPreferencias).mockResolvedValue(['responsabilidades', 'interaccion_promotora'])
    const user = userEvent.setup()
    renderEn('/recursos')

    const rutas = await screen.findByRole('region', { name: 'Rutas recomendadas' })
    const formulario = await within(rutas).findByRole('group', { name: '¿Qué quieres fortalecer?' })
    expect(within(formulario).getByLabelText('Definición de responsabilidades')).toBeChecked()
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()

    await user.click(within(formulario).getByLabelText('Interacción'))
    expect(guardarPreferencias).toHaveBeenCalledWith(
      ['responsabilidades', 'interaccion_promotora'],
      expect.anything(),
    )
    expect(await screen.findByText(/La ruta recomendada ya lo toma en cuenta/)).toBeInTheDocument()
    // Con dos elegidos, los demás se desactivan.
    expect(within(formulario).getByLabelText('Evaluación de grupo')).toBeDisabled()
  })

  it('si no se guarda, las casillas vuelven a lo que había', async () => {
    vi.mocked(obtenerPreferencias).mockResolvedValue([])
    vi.mocked(guardarPreferencias).mockRejectedValue(new Error('No se pudo guardar.'))
    const user = userEvent.setup()
    renderEn('/recursos')

    const formulario = await screen.findByRole('group', { name: '¿Qué quieres fortalecer?' })
    await user.click(within(formulario).getByLabelText('Interacción'))
    expect(await screen.findByText('No se pudo guardar.')).toBeInTheDocument()
    expect(within(formulario).getByLabelText('Interacción')).not.toBeChecked()
  })

  // Revisión del PR: las casillas no guardan una copia propia. Si lo guardado
  // cambia por fuera (otra pestaña) y la consulta se actualiza, el siguiente
  // clic parte de ahí y no pisa ese cambio.
  it('si lo guardado cambia por fuera, el siguiente clic parte de lo nuevo', async () => {
    vi.mocked(obtenerPreferencias).mockResolvedValue(['responsabilidades'])
    vi.mocked(guardarPreferencias).mockImplementation(async (elementos) => elementos)
    const user = userEvent.setup()
    const queryClient = renderEn('/recursos')

    const formulario = await screen.findByRole('group', { name: '¿Qué quieres fortalecer?' })
    expect(within(formulario).getByLabelText('Definición de responsabilidades')).toBeChecked()

    // En otra pestaña cambió a Habilidades sociales; al volver, se vuelve a pedir.
    vi.mocked(obtenerPreferencias).mockResolvedValue(['habilidades_sociales'])
    await queryClient.invalidateQueries()
    await waitFor(() =>
      expect(within(formulario).getByLabelText('Habilidades sociales')).toBeChecked(),
    )
    expect(within(formulario).getByLabelText('Definición de responsabilidades')).not.toBeChecked()

    await user.click(within(formulario).getByLabelText('Interacción'))
    expect(guardarPreferencias).toHaveBeenLastCalledWith(
      ['interaccion_promotora', 'habilidades_sociales'],
      expect.anything(),
    )
  })

  it('sin sesión no aparece', async () => {
    vi.mocked(obtenerSesionActual).mockResolvedValue(null)
    renderEn('/recursos')

    await screen.findByRole('region', { name: 'Rutas recomendadas' })
    expect(
      screen.queryByRole('group', { name: '¿Qué quieres fortalecer?' }),
    ).not.toBeInTheDocument()
    expect(obtenerPreferencias).not.toHaveBeenCalled()
  })
})
