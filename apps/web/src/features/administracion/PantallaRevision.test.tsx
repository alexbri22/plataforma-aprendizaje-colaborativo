import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { CRITERIOS_PUBLICACION } from '@plataforma/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerSesionActual, type Usuario } from '../cuentas/api'
import {
  ErrorFormacion,
  decidirRevision,
  listarColaRevision,
  obtenerRevision,
  type RecursoAdminDetalle,
} from '../formacion/formacion.api'
import { PantallaRevision } from './PantallaRevision'
import { PantallaRevisiones } from './PantallaRevisiones'

// La cola de revisión y la decisión del administrador (nota del incremento 6
// de Formación).

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
    listarColaRevision: vi.fn(),
    obtenerRevision: vi.fn(),
    decidirRevision: vi.fn(),
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

const RECURSO: RecursoAdminDetalle = {
  idRecurso: 'p1',
  seccion: 'como_colaborar',
  titulo: 'Cómo dar retroalimentación',
  resumen: 'Una guía breve.',
  tipoRecurso: 'texto',
  contenido: 'El **contenido** del artículo.',
  transcripcion: '',
  area: 'comunicacion',
  elementos: ['interaccion_promotora'],
  duracionMin: 5,
  fuente: 'Ana',
  licencia: 'CC BY 4.0',
  orden: 0,
  estatus: 'en_revision',
  origen: 'propuesta',
  versionFicha: 1,
  fechaCreacion: '2026-11-01T00:00:00.000Z',
  fechaActualizacion: '2026-11-02T00:00:00.000Z',
  archivo: null,
  autor: { idUsuario: 'u1', nombre: 'Ana García' },
  usadoEn: [],
}

function renderEn(ruta: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/admin/revisiones" element={<PantallaRevisiones />} />
          <Route path="/admin/revisiones/:tipo/:id" element={<PantallaRevision />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(obtenerSesionActual).mockResolvedValue(ADMIN)
  vi.mocked(listarColaRevision).mockResolvedValue([
    {
      tipo: 'recurso',
      id: 'p1',
      titulo: RECURSO.titulo,
      autor: 'Ana García López',
      fechaEnvio: '2026-11-02T00:00:00.000Z',
    },
  ])
  vi.mocked(obtenerRevision).mockResolvedValue({
    tipo: 'recurso',
    recurso: RECURSO,
    historial: [
      {
        accion: 'enviada',
        motivo: '',
        criterios: [],
        fecha: '2026-11-02T00:00:00.000Z',
        actor: 'Ana García López',
      },
    ],
  })
})

describe('cola de revisión', () => {
  it('lista lo enviado con su autor y lleva a revisarlo', async () => {
    renderEn('/admin/revisiones')
    const tabla = await screen.findByRole('table', { name: 'Propuestas en revisión' })
    expect(within(tabla).getByText('Ana García López')).toBeInTheDocument()
    expect(within(tabla).getByRole('link', { name: RECURSO.titulo })).toHaveAttribute(
      'href',
      '/admin/revisiones/recursos/p1',
    )
  })
})

describe('revisar una propuesta', () => {
  it('muestra la vista previa y el historial', async () => {
    renderEn('/admin/revisiones/recursos/p1')
    expect(await screen.findByRole('heading', { name: RECURSO.titulo })).toBeInTheDocument()
    expect(screen.getByText('contenido')).toBeInTheDocument()
    expect(screen.getByText('Enviada a revisión')).toBeInTheDocument()
  })

  it('aprobar pide los siete criterios y vuelve a la cola con un aviso', async () => {
    vi.mocked(decidirRevision).mockResolvedValue('publicado')
    const user = userEvent.setup()
    renderEn('/admin/revisiones/recursos/p1')

    await user.click(await screen.findByLabelText(/Aprobar y publicar/))
    for (const criterio of CRITERIOS_PUBLICACION) {
      await user.click(screen.getByLabelText(criterio.etiqueta))
    }
    await user.click(screen.getByRole('button', { name: 'Guardar la decisión' }))

    expect(decidirRevision).toHaveBeenCalledWith('recurso', 'p1', {
      decision: 'aprobar',
      motivo: '',
      criterios: CRITERIOS_PUBLICACION.map((c) => c.id),
    })
    expect(
      await screen.findByText(/aprobar y publicar\. Su autor verá la decisión/),
    ).toBeInTheDocument()
  })

  it('pedir cambios pide motivo; el error del servidor se muestra junto al campo', async () => {
    vi.mocked(decidirRevision).mockRejectedValue(
      new ErrorFormacion('Datos inválidos', 400, { motivo: 'Explica qué hay que cambiar.' }),
    )
    const user = userEvent.setup()
    renderEn('/admin/revisiones/recursos/p1')

    await user.click(await screen.findByLabelText(/Pedir cambios/))
    expect(screen.getByLabelText(/Motivo \(lo verá su autor\)/)).toBeRequired()
    await user.click(screen.getByRole('button', { name: 'Guardar la decisión' }))
    expect(await screen.findByText('Explica qué hay que cambiar.')).toBeInTheDocument()
  })

  it('si la propuesta cambió mientras tanto, lo dice y ofrece recargarla', async () => {
    vi.mocked(decidirRevision).mockRejectedValue(
      new ErrorFormacion('Cambió', 409, undefined, 'revision_desactualizada'),
    )
    const user = userEvent.setup()
    renderEn('/admin/revisiones/recursos/p1')

    await user.click(await screen.findByLabelText(/Rechazar/))
    await user.type(screen.getByLabelText(/Motivo/), 'No trata de colaboración.')
    await user.click(screen.getByRole('button', { name: 'Guardar la decisión' }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(/cambió de estado mientras la revisabas/)
    expect(within(alerta).getByRole('button', { name: 'Volver a cargarla' })).toBeInTheDocument()
  })
})
