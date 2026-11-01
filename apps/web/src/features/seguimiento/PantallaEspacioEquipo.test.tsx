import { serializarEstadoEspacioEquipo, type ElementoDeEspacioEquipo } from '@plataforma/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerActividad } from '../actividades/actividades.api'
import type { Actividad } from '../actividades'
import { obtenerEquipoConActividad, type EquipoConActividad } from '../equipos/equipos.api'
import type { Usuario } from '../cuentas/api'
import {
  crearElemento,
  editarElemento,
  eliminarElemento,
  ErrorElemento,
  obtenerElementos,
} from './elementos.api'
import { PantallaEspacioEquipo } from './PantallaEspacioEquipo'

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  const usuario: Usuario = {
    idUsuario: 'u1',
    nombre: 'Ana',
    apellidoPaterno: 'García',
    apellidoMaterno: 'López',
    correo: 'ana@example.com',
    tipoCuenta: 'usuario',
    fotoUrl: null,
  }
  return {
    ...real,
    obtenerSesionActual: vi.fn().mockResolvedValue(usuario),
    cerrarSesion: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock('../actividades/actividades.api', async () => {
  const real = await vi.importActual<typeof import('../actividades/actividades.api')>(
    '../actividades/actividades.api',
  )
  return { ...real, obtenerActividad: vi.fn() }
})

vi.mock('../equipos/equipos.api', async () => {
  const real =
    await vi.importActual<typeof import('../equipos/equipos.api')>('../equipos/equipos.api')
  return { ...real, obtenerEquipoConActividad: vi.fn() }
})

vi.mock('./elementos.api', async () => {
  const real = await vi.importActual<typeof import('./elementos.api')>('./elementos.api')
  return {
    ...real,
    obtenerElementos: vi.fn(),
    crearElemento: vi.fn(),
    editarElemento: vi.fn(),
    eliminarElemento: vi.fn(),
  }
})

function renderPantalla(idEquipo = 'e1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/equipos/${idEquipo}/metas`]}>
        <Routes>
          <Route path="/equipos/:idEquipo/metas" element={<PantallaEspacioEquipo tipo="metas" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function actividad(sobrescribir: Partial<Actividad> = {}): Actividad {
  return {
    id: 'act-1',
    nombre: 'Club de robótica',
    objetivo: 'Construir un brazo robótico.',
    fase: 'desarrollo',
    rol: 'participante',
    numParticipantes: 3,
    fechaClave: 'Clave: ROBOT2XY',
    nombreOrganizador: 'Olga Prueba',
    fechaTermino: '2026-12-01',
    capacidades: ['usar_espacio_equipo'],
    configuracion: {
      espacio_equipo: serializarEstadoEspacioEquipo({
        metas: 'opcional',
        avances: 'opcional',
        recursos: 'opcional',
      }),
    },
    ...sobrescribir,
  }
}

function equipo(sobrescribir: Partial<EquipoConActividad> = {}): EquipoConActividad {
  return {
    id: 'e1',
    nombre: 'Alfa',
    descripcionActividad: null,
    formaDeTrabajo: null,
    integrantes: [
      { idMembresia: 'yo', idUsuario: 'u1', nombre: 'Ana García', rol: 'participante' },
    ],
    idActividad: 'act-1',
    idMiMembresia: 'yo',
    ...sobrescribir,
  }
}

function elemento(sobrescribir: Partial<ElementoDeEspacioEquipo> = {}): ElementoDeEspacioEquipo {
  return {
    id: 'el-1',
    tipo: 'metas',
    contenido: 'Entregar el reporte final',
    idMembresiaAutor: 'yo',
    autor: 'Ana García',
    fechaCreacion: '2026-10-01T10:00:00.000Z',
    fechaActualizacion: '2026-10-01T10:00:00.000Z',
    ...sobrescribir,
  }
}

describe('PantallaEspacioEquipo', () => {
  beforeEach(() => {
    for (const mock of [
      obtenerActividad,
      obtenerEquipoConActividad,
      obtenerElementos,
      crearElemento,
      editarElemento,
      eliminarElemento,
    ]) {
      vi.mocked(mock).mockReset()
    }
  })

  it('un integrante ve el contenido, el nombre del equipo en el shell, y puede agregar', async () => {
    vi.mocked(obtenerEquipoConActividad).mockResolvedValue(equipo())
    vi.mocked(obtenerActividad).mockResolvedValue(actividad())
    vi.mocked(obtenerElementos).mockResolvedValue([elemento()])
    vi.mocked(crearElemento).mockResolvedValue(elemento({ id: 'el-2', contenido: 'Nueva meta' }))
    const usuario = userEvent.setup()
    renderPantalla()

    expect(await screen.findByText('Entregar el reporte final')).toBeInTheDocument()
    expect(screen.getByText('Club de robótica')).toBeInTheDocument()
    expect(screen.getByText('Alfa')).toBeInTheDocument()

    await usuario.type(screen.getByLabelText('Agregar a metas'), 'Nueva meta')
    await usuario.click(screen.getByRole('button', { name: 'Agregar' }))

    await waitFor(() => expect(crearElemento).toHaveBeenCalledWith('e1', 'metas', 'Nueva meta'))
  })

  it('cualquier integrante puede editar o eliminar un elemento ajeno', async () => {
    vi.mocked(obtenerEquipoConActividad).mockResolvedValue(equipo())
    vi.mocked(obtenerActividad).mockResolvedValue(actividad())
    vi.mocked(obtenerElementos).mockResolvedValue([
      elemento({ idMembresiaAutor: 'otra', autor: 'Luis Pérez' }),
    ])
    vi.mocked(eliminarElemento).mockResolvedValue(undefined)
    const usuario = userEvent.setup()
    renderPantalla()

    await usuario.click(await screen.findByText('Entregar el reporte final'))
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => expect(eliminarElemento).toHaveBeenCalledWith('el-1'))
  })

  it('tras eliminar el único elemento de la última página, la paginación muestra un rango válido', async () => {
    // TAMANO_PAGINA es 20 (PantallaEspacioEquipo.tsx): 41 elementos dejan
    // una tercera página con un solo elemento, igual que antes con 21 y
    // tamaño 10 — mismo caso, escalado al tamaño de página actual.
    const elementos41 = Array.from({ length: 41 }, (_, i) =>
      elemento({ id: `el-${i + 1}`, contenido: `Meta ${i + 1}` }),
    )
    vi.mocked(obtenerEquipoConActividad).mockResolvedValue(equipo())
    vi.mocked(obtenerActividad).mockResolvedValue(actividad())
    vi.mocked(obtenerElementos)
      .mockResolvedValueOnce(elementos41)
      .mockResolvedValueOnce(elementos41.slice(0, 40))
    vi.mocked(eliminarElemento).mockResolvedValue(undefined)
    const usuario = userEvent.setup()
    renderPantalla()

    await screen.findByText('Meta 1')
    await usuario.click(await screen.findByRole('button', { name: 'Siguiente' }))
    await screen.findByText('Meta 21')
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText('Meta 41')

    // La tarjeta nace colapsada: hay que expandirla para llegar a Eliminar.
    await usuario.click(screen.getByText('Meta 41'))
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(eliminarElemento).toHaveBeenCalledWith('el-41'))

    // rebanar corrigió la página (ya no existe la 3ª, con un solo elemento
    // que se acaba de borrar): el rango vuelve a la última página real, no
    // "41–40 de 40".
    await waitFor(() => expect(screen.getByText('Meta 21')).toBeInTheDocument())
    expect(screen.getByText('21–40 de 40')).toBeInTheDocument()
  })

  it('quien no integra el equipo ve el contenido pero no puede escribir', async () => {
    vi.mocked(obtenerEquipoConActividad).mockResolvedValue(
      equipo({
        idMiMembresia: 'organizador-1',
        integrantes: [
          { idMembresia: 'otra', idUsuario: 'u2', nombre: 'Luis', rol: 'participante' },
        ],
      }),
    )
    vi.mocked(obtenerActividad).mockResolvedValue(
      actividad({ rol: 'organizador', capacidades: ['formar_equipos'] }),
    )
    vi.mocked(obtenerElementos).mockResolvedValue([elemento()])
    renderPantalla()

    await screen.findByText('Entregar el reporte final')
    expect(screen.queryByLabelText('Agregar a metas')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
  })

  it('una sección deshabilitada en la configuración muestra el aviso y no el formulario', async () => {
    vi.mocked(obtenerEquipoConActividad).mockResolvedValue(equipo())
    vi.mocked(obtenerActividad).mockResolvedValue(
      actividad({
        configuracion: {
          espacio_equipo: serializarEstadoEspacioEquipo({
            metas: 'deshabilitado',
            avances: 'opcional',
            recursos: 'opcional',
          }),
        },
      }),
    )
    vi.mocked(obtenerElementos).mockResolvedValue([])
    renderPantalla()

    expect(
      await screen.findByText('Metas no está habilitado en esta actividad.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Agregar a metas')).not.toBeInTheDocument()
  })

  it('muestra el mensaje del servidor si la creación falla', async () => {
    vi.mocked(obtenerEquipoConActividad).mockResolvedValue(equipo())
    vi.mocked(obtenerActividad).mockResolvedValue(actividad())
    vi.mocked(obtenerElementos).mockResolvedValue([])
    vi.mocked(crearElemento).mockRejectedValue(new ErrorElemento('No pudimos guardar esto.'))
    const usuario = userEvent.setup()
    renderPantalla()

    await usuario.type(await screen.findByLabelText('Agregar a metas'), 'Algo')
    await usuario.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(await screen.findByText('No pudimos guardar esto.')).toBeInTheDocument()
  })
})
