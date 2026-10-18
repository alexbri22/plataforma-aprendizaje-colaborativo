import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerSesionActual, type Usuario } from '../cuentas/api'
import {
  ErrorFormacion,
  actualizarRecurso,
  crearRecurso,
  listarRecursosAdmin,
  obtenerRecursoAdmin,
  type RecursoAdmin,
} from '../formacion/formacion.api'
import { PantallaContenido } from './PantallaContenido'
import { PantallaEditarRecurso } from './PantallaEditarRecurso'

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
    obtenerRecursoAdmin: vi.fn(),
    listarRecursosAdmin: vi.fn(),
    actualizarRecurso: vi.fn(),
    crearRecurso: vi.fn(),
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

const RECURSO: RecursoAdmin = {
  idRecurso: 'r1',
  seccion: 'como_colaborar',
  titulo: 'Acuerdos que se recuerdan',
  resumen: 'Qué anotar después de una reunión.',
  tipoRecurso: 'texto',
  contenido: 'Texto',
  transcripcion: '',
  area: 'coordinacion',
  elementos: ['responsabilidades'],
  duracionMin: 4,
  fuente: 'Co3',
  licencia: 'CC BY 4.0',
  orden: 0,
  estatus: 'publicado',
  fechaCreacion: '2026-09-01T00:00:00.000Z',
  fechaActualizacion: '2026-09-01T00:00:00.000Z',
  archivo: null,
  autor: null,
}

function renderEn(ruta: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/admin/contenido" element={<PantallaContenido />} />
          <Route path="/admin/contenido/nuevo" element={<PantallaEditarRecurso />} />
          <Route path="/admin/contenido/:id" element={<PantallaEditarRecurso />} />
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
  vi.mocked(obtenerSesionActual).mockResolvedValue(ADMIN)
  vi.mocked(obtenerRecursoAdmin).mockResolvedValue(RECURSO)
  vi.mocked(listarRecursosAdmin).mockResolvedValue({
    recursos: [RECURSO],
    paginacion: { pagina: 1, porPagina: 20, total: 1, totalPaginas: 1 },
  })
  vi.mocked(actualizarRecurso).mockReset()
  vi.mocked(crearRecurso).mockReset()
})

describe('PantallaEditarRecurso', () => {
  it('al guardar cambios vuelve a la lista y confirma qué se guardó', async () => {
    const user = userEvent.setup()
    vi.mocked(actualizarRecurso).mockResolvedValue({ ...RECURSO, titulo: 'Acuerdos claros' })
    renderEn('/admin/contenido/r1')

    const titulo = await screen.findByLabelText('Título')
    await user.clear(titulo)
    await user.type(titulo, 'Acuerdos claros')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    const aviso = await screen.findByRole('status')
    expect(within(aviso).getByText('Cambios guardados')).toBeInTheDocument()
    expect(within(aviso).getByText(/«Acuerdos claros»/)).toBeInTheDocument()
    expect(within(aviso).getByRole('link', { name: 'Ver en Recursos' })).toHaveAttribute(
      'href',
      '/recursos/r1',
    )
    expect(screen.getByRole('table', { name: 'Recursos formativos' })).toBeInTheDocument()
  })

  it('un borrador nuevo vuelve a la lista avisando que todavía no es público', async () => {
    const user = userEvent.setup()
    vi.mocked(crearRecurso).mockResolvedValue({
      ...RECURSO,
      idRecurso: 'r2',
      titulo: 'Nuevo',
      estatus: 'borrador',
    })
    renderEn('/admin/contenido/nuevo')

    await user.type(await screen.findByLabelText('Título'), 'Nuevo')
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }))

    const aviso = await screen.findByRole('status')
    expect(within(aviso).getByText('Borrador guardado')).toBeInTheDocument()
    expect(within(aviso).getByText(/Todavía no aparece en Recursos/)).toBeInTheDocument()
  })

  it('si falta algo, se queda, lleva al primer campo con error y lista lo que falta', async () => {
    const user = userEvent.setup()
    vi.mocked(crearRecurso).mockRejectedValue(
      new ErrorFormacion('La petición no es válida.', 400, {
        licencia: 'Indica la licencia o derechos de uso antes de publicar.',
        resumen: 'Escribe un resumen antes de publicar.',
      }),
    )
    renderEn('/admin/contenido/nuevo')

    await user.type(await screen.findByLabelText('Título'), 'Incompleto')
    await user.click(screen.getByRole('button', { name: 'Publicar' }))

    const resumen = await screen.findByRole('alert')
    expect(within(resumen).getByText(/No se pudo publicar porque faltan datos/)).toBeInTheDocument()
    // En el orden del formulario, no en el de la respuesta.
    expect(
      within(resumen)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Resumen', 'Licencia o derechos de uso'])
    expect(screen.getByLabelText('Resumen')).toHaveFocus()

    await user.click(within(resumen).getByRole('button', { name: 'Licencia o derechos de uso' }))
    expect(screen.getByLabelText('Licencia o derechos de uso')).toHaveFocus()
  })
})
