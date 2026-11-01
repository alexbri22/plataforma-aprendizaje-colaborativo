import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerSesionActual, type Usuario } from '../cuentas/api'
import {
  ErrorFormacion,
  actualizarCurso,
  actualizarLeccion,
  agregarLeccion,
  crearCurso,
  eliminarLeccion,
  listarCursosAdmin,
  listarRecursosAdmin,
  obtenerCursoAdmin,
  reordenarLecciones,
  type CursoAdmin,
  type LeccionAdmin,
  type RecursoAdmin,
} from '../formacion/formacion.api'
import { PantallaCursos } from './PantallaCursos'
import { PantallaEditarCurso } from './PantallaEditarCurso'

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
    actualizarCurso: vi.fn(),
    actualizarLeccion: vi.fn(),
    agregarLeccion: vi.fn(),
    crearCurso: vi.fn(),
    eliminarLeccion: vi.fn(),
    listarCursosAdmin: vi.fn(),
    listarRecursosAdmin: vi.fn(),
    obtenerCursoAdmin: vi.fn(),
    reordenarLecciones: vi.fn(),
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

const PRACTICA: LeccionAdmin = {
  idLeccion: 'l1',
  orden: 0,
  titulo: 'Redacta tu acuerdo',
  tipo: 'practica',
  contenido: 'Instrucciones',
  obligatoria: true,
  duracionMin: 10,
  duracionEfectivaMin: 10,
  recurso: null,
}

const DE_RECURSO: LeccionAdmin = {
  idLeccion: 'l2',
  orden: 1,
  titulo: '',
  tipo: 'recurso',
  contenido: '',
  obligatoria: true,
  duracionMin: null,
  duracionEfectivaMin: 4,
  recurso: {
    idRecurso: 'r1',
    titulo: 'Plantilla de acuerdos',
    tipoRecurso: 'plantilla',
    estatus: 'publicado',
    duracionMin: 4,
  },
}

const CURSO: CursoAdmin = {
  idCurso: 'c1',
  titulo: 'Acuerdos claros',
  resumen: 'Resumen',
  objetivo: 'Objetivo',
  practicaFinal: 'Un acuerdo',
  area: 'organizacion',
  nivel: 'inicial',
  elementos: ['responsabilidades'],
  estatus: 'borrador',
  orden: 0,
  numLecciones: 2,
  duracionMin: 14,
  versionFicha: 3,
  fechaCreacion: '2026-09-01T00:00:00.000Z',
  fechaActualizacion: '2026-09-01T00:00:00.000Z',
  autor: null,
  lecciones: [PRACTICA, DE_RECURSO],
}

function renderEn(ruta: string, queryClient = clienteDePrueba()) {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/admin/cursos" element={<PantallaCursos />} />
          <Route path="/admin/cursos/nuevo" element={<PantallaEditarCurso />} />
          <Route path="/admin/cursos/:id" element={<PantallaEditarCurso />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function clienteDePrueba() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

beforeAll(() => {
  // jsdom no implementa el desplazamiento.
  Element.prototype.scrollIntoView = vi.fn()
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(obtenerSesionActual).mockResolvedValue(ADMIN)
  vi.mocked(obtenerCursoAdmin).mockResolvedValue(CURSO)
  vi.mocked(listarCursosAdmin).mockResolvedValue({
    cursos: [CURSO],
    paginacion: { pagina: 1, porPagina: 20, total: 1, totalPaginas: 1 },
  })
})

describe('PantallaEditarCurso', () => {
  it('un curso nuevo se queda en el editor para agregarle lecciones', async () => {
    const user = userEvent.setup()
    vi.mocked(crearCurso).mockResolvedValue({ ...CURSO, lecciones: [] })
    renderEn('/admin/cursos/nuevo')

    await user.type(await screen.findByLabelText('Título'), 'Acuerdos claros')
    await user.click(screen.getByRole('button', { name: 'Crear curso' }))

    expect(await screen.findByText(/Ahora agrega sus lecciones/)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Agregar recurso' })).toBeEnabled()
  })

  it('la lista de requisitos dice qué falta para publicar', async () => {
    renderEn('/admin/cursos/c1')

    const requisitos = await screen.findByRole('complementary', {
      name: 'Publicación del curso',
    })
    expect(within(requisitos).getByText(/Una práctica/)).toHaveTextContent('cumplido')
    expect(within(requisitos).getByText(/Una reflexión/)).toHaveTextContent('pendiente')
  })

  it('si no se puede publicar, lleva a lo que falta y marca la lección', async () => {
    const user = userEvent.setup()
    vi.mocked(actualizarCurso).mockRejectedValue(
      new ErrorFormacion('La petición no es válida.', 400, {
        lecciones: 'El curso necesita una lección de reflexión.',
        'lecciones.l2': 'El recurso de esta lección no está publicado.',
      }),
    )
    renderEn('/admin/cursos/c1')

    await user.click(await screen.findByRole('button', { name: 'Publicar' }))

    const resumen = await screen.findByRole('alert')
    expect(within(resumen).getByText(/No se pudo publicar/)).toBeInTheDocument()
    expect(within(resumen).getByRole('button', { name: 'Lección 2' })).toBeInTheDocument()
    await waitFor(() => expect(document.getElementById('campo-lecciones')).toHaveFocus())

    const leccion = document.getElementById('leccion-l2') as HTMLElement
    expect(within(leccion).getByText(/no está publicado/)).toBeInTheDocument()
  })

  it('al guardar vuelve a la lista con la confirmación', async () => {
    const user = userEvent.setup()
    vi.mocked(actualizarCurso).mockResolvedValue({ ...CURSO, estatus: 'publicado' })
    renderEn('/admin/cursos/c1')

    await user.click(await screen.findByRole('button', { name: 'Publicar' }))

    const aviso = await screen.findByRole('status')
    expect(within(aviso).getByText('Curso publicado')).toBeInTheDocument()
    expect(within(aviso).getByRole('link', { name: 'Ver en Recursos' })).toHaveAttribute(
      'href',
      '/cursos/c1',
    )
  })

  it('reordena con las flechas y no deja subir la primera', async () => {
    const user = userEvent.setup()
    vi.mocked(reordenarLecciones).mockResolvedValue(CURSO)
    renderEn('/admin/cursos/c1')

    expect(await screen.findByRole('button', { name: 'Subir lección 1' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Bajar lección 1' }))

    await waitFor(() => expect(reordenarLecciones).toHaveBeenCalledWith('c1', ['l2', 'l1']))
  })

  it('agrega un recurso desde la biblioteca, sin ofrecer los que ya están', async () => {
    const user = userEvent.setup()
    const recurso = (idRecurso: string, titulo: string) =>
      ({ idRecurso, titulo, tipoRecurso: 'texto', duracionMin: 5 }) as RecursoAdmin
    vi.mocked(listarRecursosAdmin).mockResolvedValue({
      recursos: [recurso('r1', 'Plantilla de acuerdos'), recurso('r2', 'Escucha activa')],
      paginacion: { pagina: 1, porPagina: 6, total: 2, totalPaginas: 1 },
    })
    vi.mocked(agregarLeccion).mockResolvedValue(CURSO)
    renderEn('/admin/cursos/c1')

    await user.click(await screen.findByRole('button', { name: 'Agregar recurso' }))

    expect(await screen.findByText('Ya está en el curso')).toBeInTheDocument()
    expect(listarRecursosAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ estatus: 'publicado' }),
    )
    await user.click(screen.getByRole('button', { name: 'Agregar Escucha activa' }))

    await waitFor(() =>
      expect(agregarLeccion).toHaveBeenCalledWith('c1', { tipo: 'recurso', idRecurso: 'r2' }),
    )
  })

  it('pide confirmación antes de quitar una lección', async () => {
    const user = userEvent.setup()
    vi.mocked(eliminarLeccion).mockResolvedValue(CURSO)
    renderEn('/admin/cursos/c1')

    await user.click(await screen.findByRole('button', { name: 'Quitar lección 2' }))
    expect(eliminarLeccion).not.toHaveBeenCalled()

    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByText(/sigue en la biblioteca/)).toBeInTheDocument()
    await user.click(within(dialogo).getByRole('button', { name: 'Quitar' }))

    await waitFor(() => expect(eliminarLeccion).toHaveBeenCalledWith('c1', 'l2'))
  })

  it('avisa si el recurso de una lección se retiró', async () => {
    vi.mocked(obtenerCursoAdmin).mockResolvedValue({
      ...CURSO,
      lecciones: [
        PRACTICA,
        { ...DE_RECURSO, recurso: { ...DE_RECURSO.recurso!, estatus: 'retirado' } },
      ],
    })
    renderEn('/admin/cursos/c1')

    expect(await screen.findByText(/se ve como no disponible/)).toBeInTheDocument()
  })

  it('llena el formulario con la lectura fresca, no con la copia en caché', async () => {
    const queryClient = clienteDePrueba()
    queryClient.setQueryData(['cursos', 'admin', 'detalle', 'c1'], {
      ...CURSO,
      resumen: 'Copia vieja',
    })
    vi.mocked(obtenerCursoAdmin).mockResolvedValue({ ...CURSO, resumen: 'Versión actual' })
    renderEn('/admin/cursos/c1', queryClient)

    expect(await screen.findByLabelText('Resumen')).toHaveValue('Versión actual')
  })

  it('guarda con la versión que leyó y explica si otro modificó el curso', async () => {
    const user = userEvent.setup()
    vi.mocked(actualizarCurso).mockRejectedValue(
      new ErrorFormacion('Otro modificó.', 409, undefined, 'curso_desactualizado'),
    )
    renderEn('/admin/cursos/c1')

    await user.click(await screen.findByRole('button', { name: 'Guardar borrador' }))

    expect(await screen.findByText(/Otro administrador modificó este curso/)).toBeInTheDocument()
    expect(actualizarCurso).toHaveBeenCalledWith('c1', expect.objectContaining({ versionFicha: 3 }))

    vi.mocked(obtenerCursoAdmin).mockResolvedValue({ ...CURSO, resumen: 'Lo del otro' })
    await user.click(screen.getByRole('button', { name: 'Cargar la versión actual' }))

    await waitFor(() => expect(screen.getByLabelText('Resumen')).toHaveValue('Lo del otro'))
    expect(screen.queryByText(/Otro administrador modificó/)).not.toBeInTheDocument()
  })

  it('el modal muestra los errores que no corresponden a un campo', async () => {
    const user = userEvent.setup()
    vi.mocked(actualizarLeccion).mockRejectedValue(
      new ErrorFormacion('La petición no es válida.', 400, {
        lecciones: 'El curso necesita una lección de reflexión.',
      }),
    )
    renderEn('/admin/cursos/c1')

    await user.click(await screen.findByRole('button', { name: 'Editar lección 1' }))
    const dialogo = await screen.findByRole('dialog')
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar lección' }))

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'El curso necesita una lección de reflexión.',
    )
  })

  it('cambia el recurso de una lección existente sin agregar otra', async () => {
    const user = userEvent.setup()
    vi.mocked(listarRecursosAdmin).mockResolvedValue({
      recursos: [
        { idRecurso: 'r2', titulo: 'Escucha activa', tipoRecurso: 'texto' } as RecursoAdmin,
      ],
      paginacion: { pagina: 1, porPagina: 6, total: 1, totalPaginas: 1 },
    })
    vi.mocked(actualizarLeccion).mockResolvedValue(CURSO)
    vi.mocked(obtenerCursoAdmin).mockResolvedValue({
      ...CURSO,
      lecciones: [
        PRACTICA,
        { ...DE_RECURSO, recurso: { ...DE_RECURSO.recurso!, estatus: 'retirado' } },
      ],
    })
    renderEn('/admin/cursos/c1')

    await user.click(await screen.findByRole('button', { name: 'Cambiar recurso' }))
    await user.click(await screen.findByRole('button', { name: 'Usar Escucha activa' }))

    await waitFor(() =>
      expect(actualizarLeccion).toHaveBeenCalledWith('c1', 'l2', { idRecurso: 'r2' }),
    )
    expect(agregarLeccion).not.toHaveBeenCalled()
  })
})
