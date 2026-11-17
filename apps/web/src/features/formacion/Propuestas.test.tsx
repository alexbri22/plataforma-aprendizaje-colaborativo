import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from '../../components/AppShell'
import { obtenerSesionActual } from '../cuentas/api'
import {
  actualizarPropuestaRecurso,
  cancelarEnvioPropuesta,
  contarAvisosPropuestas,
  crearPropuestaRecurso,
  enviarPropuesta,
  listarMisPropuestas,
  marcarAvisoVisto,
  obtenerPropuestaRecurso,
  type PropuestaRecurso,
} from './formacion.api'
import { PantallaMiFormacion } from './PantallaMiFormacion'
import { PantallaPropuestaRecurso } from './PantallaPropuesta'
import { ProveedorMarcasNav } from './ProveedorMarcasNav'

// Autoría abierta del lado del autor (nota del incremento 6): Mis propuestas,
// el editor en modo autor y el aviso en la barra lateral.

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  return { ...real, obtenerSesionActual: vi.fn() }
})

vi.mock('./formacion.api', async () => {
  const real = await vi.importActual<typeof import('./formacion.api')>('./formacion.api')
  return {
    ...real,
    listarMisPropuestas: vi.fn(),
    contarAvisosPropuestas: vi.fn(),
    obtenerPropuestaRecurso: vi.fn(),
    crearPropuestaRecurso: vi.fn(),
    actualizarPropuestaRecurso: vi.fn(),
    enviarPropuesta: vi.fn(),
    cancelarEnvioPropuesta: vi.fn(),
    marcarAvisoVisto: vi.fn(),
    // Mi formación pide también lo suyo; aquí basta con que no falle.
    obtenerMiFormacion: vi.fn().mockResolvedValue({ enCurso: [], completados: [] }),
    obtenerPreferencias: vi.fn().mockResolvedValue([]),
    obtenerMisConstancias: vi.fn().mockResolvedValue({ constancias: [], publicas: false }),
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

function propuesta(parcial: Partial<PropuestaRecurso> = {}): PropuestaRecurso {
  return {
    idRecurso: 'p1',
    seccion: 'como_colaborar',
    titulo: 'Cómo dar retroalimentación',
    resumen: 'Una guía breve.',
    tipoRecurso: 'texto',
    contenido: 'Contenido',
    transcripcion: '',
    area: 'comunicacion',
    elementos: ['interaccion_promotora'],
    duracionMin: 5,
    fuente: 'Ana',
    licencia: 'CC BY 4.0',
    orden: 3,
    estatus: 'borrador',
    origen: 'propuesta',
    versionFicha: 2,
    fechaCreacion: '2026-11-01T00:00:00.000Z',
    fechaActualizacion: '2026-11-02T00:00:00.000Z',
    archivo: null,
    autor: { idUsuario: 'u1', nombre: 'Ana García' },
    usadoEn: [],
    revision: { fechaEnvio: null, decisionSinVer: false, historial: [] },
    ...parcial,
  }
}

function Ubicacion() {
  const { pathname, search } = useLocation()
  return <p data-testid="ubicacion">{`${pathname}${search}`}</p>
}

function renderEn(ruta: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/mi-formacion" element={<PantallaMiFormacion />} />
          <Route path="/propuestas/recursos/nuevo" element={<PantallaPropuestaRecurso />} />
          <Route path="/propuestas/recursos/:id" element={<PantallaPropuestaRecurso />} />
        </Routes>
        <Ubicacion />
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
  vi.mocked(obtenerSesionActual).mockResolvedValue(ANA)
  vi.mocked(contarAvisosPropuestas).mockResolvedValue(0)
  vi.mocked(listarMisPropuestas).mockResolvedValue({ propuestas: [], avisosPendientes: 0 })
  vi.mocked(obtenerPropuestaRecurso).mockResolvedValue(propuesta())
})

describe('Mis propuestas', () => {
  it('muestra el estado y el motivo de la última decisión, y dice si es nueva', async () => {
    vi.mocked(contarAvisosPropuestas).mockResolvedValue(1)
    vi.mocked(listarMisPropuestas).mockResolvedValue({
      avisosPendientes: 1,
      propuestas: [
        {
          tipo: 'recurso',
          id: 'p1',
          titulo: 'Cómo dar retroalimentación',
          estatus: 'cambios_solicitados',
          fechaActualizacion: '2026-11-02T00:00:00.000Z',
          fechaEnvio: null,
          decisionSinVer: true,
          ultimaDecision: {
            accion: 'cambios_solicitados',
            motivo: 'Agrega un ejemplo situado.',
            fecha: '2026-11-03T00:00:00.000Z',
          },
        },
      ],
    })
    renderEn('/mi-formacion?vista=propuestas')

    // Sin pestañas: la sección lleva el aviso en su título y ?vista=propuestas
    // la trae a la vista.
    expect(
      await screen.findByRole('heading', { name: 'Mis propuestas (1 nueva)' }),
    ).toBeInTheDocument()
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    const enlace = await screen.findByRole('link', { name: 'Cómo dar retroalimentación' })
    expect(enlace).toHaveAttribute('href', '/propuestas/recursos/p1')
    expect(screen.getByText('Decisión nueva')).toBeInTheDocument()
    expect(screen.getByText('Agrega un ejemplo situado.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Proponer un curso' })).toHaveAttribute(
      'href',
      '/propuestas/cursos/nuevo',
    )
  })
})

describe('el editor del autor', () => {
  it('no ofrece el orden ni publicar; crear deja la propuesta en su editor', async () => {
    vi.mocked(crearPropuestaRecurso).mockResolvedValue(propuesta({ idRecurso: 'p9' }))
    const user = userEvent.setup()
    renderEn('/propuestas/recursos/nuevo')

    expect(await screen.findByText(/un administrador la revisa/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Orden en la lista')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publicar' })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Título'), 'Mi recurso')
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }))

    expect(crearPropuestaRecurso).toHaveBeenCalledWith(
      expect.not.objectContaining({ orden: expect.anything() }),
    )
    // ubicacion siempre existe: hay que esperar a que cambie, no a que aparezca.
    await waitFor(() =>
      expect(screen.getByTestId('ubicacion')).toHaveTextContent('/propuestas/recursos/p9'),
    )
  })

  it('enviar guarda lo escrito, lo manda a revisión y vuelve a Mis propuestas', async () => {
    vi.mocked(actualizarPropuestaRecurso).mockResolvedValue(propuesta())
    vi.mocked(enviarPropuesta).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderEn('/propuestas/recursos/p1')

    await user.click(await screen.findByRole('button', { name: 'Enviar a revisión' }))

    expect(actualizarPropuestaRecurso).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ versionFicha: 2 }),
    )
    expect(enviarPropuesta).toHaveBeenCalledWith('recurso', 'p1')
    await waitFor(() =>
      expect(screen.getByTestId('ubicacion')).toHaveTextContent('/mi-formacion?vista=propuestas'),
    )
    expect(
      await screen.findByText(/Enviaste «Cómo dar retroalimentación» a revisión/),
    ).toBeInTheDocument()
  })

  it('guardar dos veces seguidas manda la versión que dejó el primer guardado', async () => {
    vi.mocked(actualizarPropuestaRecurso)
      .mockResolvedValueOnce(propuesta({ versionFicha: 3 }))
      .mockResolvedValueOnce(propuesta({ versionFicha: 4 }))
    const user = userEvent.setup()
    renderEn('/propuestas/recursos/p1')

    const guardar = await screen.findByRole('button', { name: 'Guardar borrador' })
    await user.click(guardar)
    await screen.findByText('Borrador guardado.')
    await user.click(guardar)

    await vi.waitFor(() => expect(actualizarPropuestaRecurso).toHaveBeenCalledTimes(2))
    expect(vi.mocked(actualizarPropuestaRecurso).mock.calls.map((c) => c[1].versionFicha)).toEqual([
      2, 3,
    ])
  })

  it('en revisión se lee sin editar y se puede cancelar el envío', async () => {
    vi.mocked(obtenerPropuestaRecurso).mockResolvedValue(
      propuesta({
        estatus: 'en_revision',
        revision: { fechaEnvio: '2026-11-03T00:00:00.000Z', decisionSinVer: false, historial: [] },
      }),
    )
    vi.mocked(cancelarEnvioPropuesta).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderEn('/propuestas/recursos/p1')

    expect(await screen.findByLabelText('Título')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Enviar a revisión' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancelar el envío' }))
    const dialogo = await screen.findByRole('dialog')
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar el envío' }))
    expect(cancelarEnvioPropuesta).toHaveBeenCalledWith('recurso', 'p1')
  })

  it('una decisión nueva se muestra con su motivo y se marca como vista', async () => {
    vi.mocked(obtenerPropuestaRecurso).mockResolvedValue(
      propuesta({
        estatus: 'cambios_solicitados',
        revision: {
          fechaEnvio: null,
          decisionSinVer: true,
          historial: [
            { accion: 'enviada', motivo: '', criterios: [], fecha: '2026-11-02T00:00:00.000Z' },
            {
              accion: 'cambios_solicitados',
              motivo: 'Agrega un ejemplo situado.',
              criterios: [],
              fecha: '2026-11-03T00:00:00.000Z',
            },
          ],
        },
      }),
    )
    renderEn('/propuestas/recursos/p1')

    expect(await screen.findByRole('heading', { name: 'Te pidieron cambios' })).toBeInTheDocument()
    expect(screen.getAllByText(/Agrega un ejemplo situado/).length).toBeGreaterThan(0)
    await vi.waitFor(() => expect(marcarAvisoVisto).toHaveBeenCalledWith('recurso', 'p1'))
    // Con cambios solicitados se vuelve a editar.
    expect(screen.getByLabelText('Título')).toBeEnabled()
  })
})

describe('el aviso en la barra lateral', () => {
  it('Mi formación lleva una marca que se explica con texto', async () => {
    vi.mocked(contarAvisosPropuestas).mockResolvedValue(2)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ProveedorMarcasNav>
            <AppShell seccionActiva="recursos" titulo="Recursos">
              <p>Contenido</p>
            </AppShell>
          </ProveedorMarcasNav>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(
      await screen.findByRole('link', { name: /Mi formación.*2 decisiones nuevas/ }),
    ).toBeInTheDocument()
  })
})
