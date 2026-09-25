import type { AccionActividad, Equipo, ListaEquipos } from '@plataforma/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerActividad } from '../actividades/actividades.api'
import type { Actividad } from '../actividades'
import type { Usuario } from '../cuentas/api'
import {
  asignarIntegrante,
  cerrarFormacion,
  crearEquipo,
  editarEquipo,
  eliminarEquipo,
  ErrorEquipos,
  generarPropuesta,
  obtenerEquipos,
  retirarIntegrante,
} from './equipos.api'
import { PantallaEquipos } from './PantallaEquipos'

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  const usuario: Usuario = {
    idUsuario: 'u1',
    nombre: 'Ana',
    apellidoPaterno: 'García',
    apellidoMaterno: 'López',
    correo: 'ana@example.com',
    tipoCuenta: 'usuario',
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

vi.mock('./equipos.api', async () => {
  const real = await vi.importActual<typeof import('./equipos.api')>('./equipos.api')
  return {
    ...real,
    obtenerEquipos: vi.fn(),
    crearEquipo: vi.fn(),
    asignarIntegrante: vi.fn(),
    retirarIntegrante: vi.fn(),
    editarEquipo: vi.fn(),
    eliminarEquipo: vi.fn(),
    cerrarFormacion: vi.fn(),
    generarPropuesta: vi.fn(),
  }
})

function renderPantalla(id = 'act-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/actividades/${id}/equipos`]}>
        <Routes>
          <Route path="/actividades/:id/equipos" element={<PantallaEquipos />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function actividad(
  sobrescribir: Partial<Actividad> & { capacidades: AccionActividad[] },
): Actividad {
  return {
    id: 'act-1',
    nombre: 'Club de robótica',
    objetivo: 'Construir un brazo robótico.',
    fase: 'formacion_equipos',
    rol: 'participante',
    numParticipantes: 3,
    fechaClave: 'Clave: ROBOT2XY',
    configuracion: { formacion_equipos: 'autogestionado' },
    ...sobrescribir,
  }
}

const YO = 'm-yo'

function equipo(id: string, nombre: string, integrantes: Equipo['integrantes'] = []): Equipo {
  return { id, nombre, descripcionActividad: null, formaDeTrabajo: null, integrantes }
}

const persona = (
  idMembresia: string,
  nombre: string,
  rol: 'participante' | 'organizador' = 'participante',
) => ({
  idMembresia,
  nombre,
  rol,
})

function lista(equipos: Equipo[], sinEquipo: ListaEquipos['sinEquipo'] = []): ListaEquipos {
  return { idMiMembresia: YO, equipos, sinEquipo }
}

describe('PantallaEquipos', () => {
  beforeEach(() => {
    for (const mock of [
      obtenerActividad,
      obtenerEquipos,
      crearEquipo,
      asignarIntegrante,
      retirarIntegrante,
      editarEquipo,
      eliminarEquipo,
      cerrarFormacion,
      generarPropuesta,
    ]) {
      vi.mocked(mock).mockReset()
    }
  })

  describe('participante con la formación autogestionada', () => {
    beforeEach(() => {
      vi.mocked(obtenerActividad).mockResolvedValue(
        actividad({ capacidades: ['elegir_equipo', 'editar_equipo'] }),
      )
      vi.mocked(obtenerEquipos).mockResolvedValue(
        lista(
          [
            equipo('e1', 'Alfa', [persona('m2', 'Luis Pérez'), persona('m3', 'Eva Ruiz')]),
            equipo('e2', 'Beta'),
          ],
          [{ idMembresia: YO, nombre: 'Ana García' }],
        ),
      )
    })

    it('explica cómo se forman los equipos y lista quiénes no tienen equipo', async () => {
      renderPantalla()

      expect(
        await screen.findByText(/Cada participante crea un equipo o se une a uno/),
      ).toBeInTheDocument()
      expect(screen.getByText('Sin equipo (1)')).toBeInTheDocument()
      expect(screen.getByText('Ana García (tú)')).toBeInTheDocument()
    })

    it('ofrece unirse a un equipo y crear uno; no ofrece acciones de quien organiza', async () => {
      renderPantalla()

      expect(
        await screen.findByRole('button', { name: 'Crear equipo y unirme' }),
      ).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: 'Unirme' })).toHaveLength(2)
      expect(screen.queryByRole('button', { name: 'Cerrar la formación' })).not.toBeInTheDocument()
      expect(screen.queryByText('Asignación de personas')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
    })

    it('unirse llama a la API con la propia membresía', async () => {
      vi.mocked(asignarIntegrante).mockResolvedValue(equipo('e2', 'Beta'))
      const usuario = userEvent.setup()
      renderPantalla()

      const botones = await screen.findAllByRole('button', { name: 'Unirme' })
      await usuario.click(botones[1])

      await waitFor(() => expect(asignarIntegrante).toHaveBeenCalledWith('e2', YO))
    })

    it('crear un equipo envía el nombre recortado', async () => {
      vi.mocked(crearEquipo).mockResolvedValue(equipo('e3', 'Gamma'))
      const usuario = userEvent.setup()
      renderPantalla()

      await usuario.type(await screen.findByLabelText('Nombre del equipo'), '  Gamma ')
      await usuario.click(screen.getByRole('button', { name: 'Crear equipo y unirme' }))

      await waitFor(() => expect(crearEquipo).toHaveBeenCalledWith('act-1', 'Gamma'))
    })

    it('muestra el mensaje del servidor si la acción falla', async () => {
      vi.mocked(crearEquipo).mockRejectedValue(
        new ErrorEquipos('Ya existe un equipo con ese nombre en esta actividad.'),
      )
      const usuario = userEvent.setup()
      renderPantalla()

      await usuario.type(await screen.findByLabelText('Nombre del equipo'), 'Alfa')
      await usuario.click(screen.getByRole('button', { name: 'Crear equipo y unirme' }))

      expect(
        await screen.findByText('Ya existe un equipo con ese nombre en esta actividad.'),
      ).toBeInTheDocument()
    })
  })

  it('un participante que ya tiene equipo no ve "Salir", solo puede moverse; y edita el suyo', async () => {
    vi.mocked(obtenerActividad).mockResolvedValue(
      actividad({ capacidades: ['elegir_equipo', 'editar_equipo'] }),
    )
    vi.mocked(obtenerEquipos).mockResolvedValue(
      lista([
        equipo('e1', 'Alfa', [persona(YO, 'Ana García'), persona('m2', 'Luis Pérez')]),
        equipo('e2', 'Beta'),
      ]),
    )
    renderPantalla()

    await screen.findByText('Ana García (tú)')
    expect(screen.queryByRole('button', { name: 'Salir del equipo' })).not.toBeInTheDocument()
    // Solo el equipo propio es editable.
    expect(screen.getAllByRole('button', { name: 'Editar' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Unirme' })).toHaveLength(1)
  })

  it('con la formación manual el participante solo consulta', async () => {
    vi.mocked(obtenerActividad).mockResolvedValue(
      actividad({
        capacidades: ['editar_equipo'],
        configuracion: { formacion_equipos: 'manual' },
      }),
    )
    vi.mocked(obtenerEquipos).mockResolvedValue(
      lista(
        [equipo('e1', 'Alfa', [persona('m2', 'Luis Pérez')])],
        [{ idMembresia: YO, nombre: 'Ana García' }],
      ),
    )
    renderPantalla()

    expect(
      await screen.findByText(/Quien organiza crea los equipos y asigna a cada persona/),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Unirme|Crear equipo/ })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre del equipo')).not.toBeInTheDocument()
  })

  describe('quien organiza', () => {
    const capacidadesOrganizador: AccionActividad[] = [
      'formar_equipos',
      'asignar_integrantes',
      'cerrar_formacion',
      'elegir_equipo',
      'editar_equipo',
    ]

    beforeEach(() => {
      vi.mocked(obtenerActividad).mockResolvedValue(
        actividad({
          rol: 'organizador',
          capacidades: capacidadesOrganizador,
          configuracion: { formacion_equipos: 'manual' },
        }),
      )
    })

    it('crea equipos sin unirse, y asigna con un selector por persona', async () => {
      vi.mocked(obtenerEquipos).mockResolvedValue(
        lista(
          [equipo('e1', 'Alfa', [persona('m2', 'Luis Pérez')]), equipo('e2', 'Beta')],
          [{ idMembresia: 'm3', nombre: 'Eva Ruiz' }],
        ),
      )
      vi.mocked(asignarIntegrante).mockResolvedValue(equipo('e2', 'Beta'))
      const usuario = userEvent.setup()
      renderPantalla()

      expect(await screen.findByRole('button', { name: 'Crear equipo' })).toBeInTheDocument()
      const selector = screen.getByLabelText('Equipo de Eva Ruiz')
      await usuario.selectOptions(selector, 'Beta')

      await waitFor(() => expect(asignarIntegrante).toHaveBeenCalledWith('e2', 'm3'))
    })

    it('a un participante con equipo no se le ofrece dejarlo sin equipo', async () => {
      vi.mocked(obtenerEquipos).mockResolvedValue(
        lista([equipo('e1', 'Alfa', [persona('m2', 'Luis Pérez')])]),
      )
      renderPantalla()

      const selector = await screen.findByLabelText('Equipo de Luis Pérez')
      expect(within(selector).getByRole('option', { name: 'Sin equipo' })).toBeDisabled()
    })

    it('el cierre de la formación se confirma y avisa a quiénes reparte', async () => {
      vi.mocked(obtenerEquipos).mockResolvedValue(
        lista(
          [equipo('e1', 'Alfa', [persona('m2', 'Luis Pérez')])],
          [
            { idMembresia: 'm3', nombre: 'Eva Ruiz' },
            { idMembresia: 'm4', nombre: 'Tomás Gil' },
          ],
        ),
      )
      vi.mocked(cerrarFormacion).mockResolvedValue(actividad({ capacidades: [] }))
      const usuario = userEvent.setup()
      renderPantalla()

      expect(await screen.findByText(/2 personas siguen sin equipo/)).toBeInTheDocument()
      await usuario.click(screen.getByRole('button', { name: 'Cerrar la formación' }))
      expect(cerrarFormacion).not.toHaveBeenCalled()
      await usuario.click(screen.getByRole('button', { name: 'Sí, cerrar la formación' }))

      await waitFor(() => expect(cerrarFormacion).toHaveBeenCalledWith('act-1'))
    })

    it('sin equipos no se puede cerrar la formación y se explica por qué', async () => {
      vi.mocked(obtenerEquipos).mockResolvedValue(lista([]))
      renderPantalla()

      expect(
        await screen.findByText('Crea al menos un equipo para poder cerrar la formación.'),
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cerrar la formación' })).toBeDisabled()
      expect(
        screen.getByText('Todavía no hay equipos. Crea el primero para empezar.'),
      ).toBeInTheDocument()
    })

    it('elimina un equipo vacío solo tras confirmar', async () => {
      vi.mocked(obtenerEquipos).mockResolvedValue(
        lista([equipo('e1', 'Alfa', [persona('m2', 'Luis Pérez')]), equipo('e2', 'Beta')]),
      )
      vi.mocked(eliminarEquipo).mockResolvedValue(undefined)
      const usuario = userEvent.setup()
      renderPantalla()

      // Solo el equipo vacío ofrece eliminar.
      await usuario.click(await screen.findByRole('button', { name: 'Eliminar' }))
      expect(eliminarEquipo).not.toHaveBeenCalled()
      await usuario.click(screen.getByRole('button', { name: 'Sí, eliminar' }))

      await waitFor(() => expect(eliminarEquipo).toHaveBeenCalledWith('e2'))
    })

    it('puede integrar un equipo y salir de él; los participantes no salen', async () => {
      vi.mocked(obtenerEquipos).mockResolvedValue(
        lista([
          equipo('e1', 'Alfa', [
            persona(YO, 'Olga Prueba', 'organizador'),
            persona('m2', 'Luis Pérez'),
          ]),
          equipo('e2', 'Beta'),
        ]),
      )
      vi.mocked(retirarIntegrante).mockResolvedValue(equipo('e1', 'Alfa'))
      const usuario = userEvent.setup()
      renderPantalla()

      expect(await screen.findByText('Olga Prueba (tú)')).toBeInTheDocument()
      expect(screen.getByText('Organiza')).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: 'Unirme a este equipo' })).toHaveLength(1)
      await usuario.click(screen.getByRole('button', { name: 'Salir del equipo' }))

      await waitFor(() => expect(retirarIntegrante).toHaveBeenCalledWith('e1', YO))
    })

    it('edita el nombre, la descripción y la forma de trabajo en un panel lateral', async () => {
      vi.mocked(obtenerEquipos).mockResolvedValue(lista([equipo('e1', 'Alfa')]))
      vi.mocked(editarEquipo).mockResolvedValue(equipo('e1', 'Alfa 2'))
      const usuario = userEvent.setup()
      renderPantalla()

      await usuario.click(await screen.findByRole('button', { name: 'Editar' }))
      const panel = await screen.findByRole('dialog')
      const nombre = within(panel).getByLabelText('Nombre del equipo')
      await usuario.clear(nombre)
      await usuario.type(nombre, 'Alfa 2')
      await usuario.type(within(panel).getByLabelText('Cómo van a trabajar'), 'Reunión semanal')
      await usuario.click(within(panel).getByRole('button', { name: 'Guardar' }))

      await waitFor(() =>
        expect(editarEquipo).toHaveBeenCalledWith('e1', {
          nombre: 'Alfa 2',
          descripcionActividad: null,
          formaDeTrabajo: 'Reunión semanal',
        }),
      )
    })
  })

  it('avisa, sin impedirlo, de un equipo con un solo integrante', async () => {
    vi.mocked(obtenerActividad).mockResolvedValue(actividad({ capacidades: [] }))
    vi.mocked(obtenerEquipos).mockResolvedValue(
      lista([equipo('e1', 'Alfa', [persona('m2', 'Luis Pérez')])]),
    )
    renderPantalla()

    expect(await screen.findByText('Un solo integrante')).toBeInTheDocument()
  })

  describe('estados vacíos: cada uno nombra su causa', () => {
    it('durante la inscripción, explica que la formación aún no empieza', async () => {
      vi.mocked(obtenerActividad).mockResolvedValue(
        actividad({ fase: 'inscripcion', capacidades: [] }),
      )
      vi.mocked(obtenerEquipos).mockResolvedValue(lista([]))
      renderPantalla()

      expect(
        await screen.findByText('La formación de equipos empieza cuando se cierra la inscripción.'),
      ).toBeInTheDocument()
    })

    it('en formación sin permiso para crear, no ofrece la acción', async () => {
      vi.mocked(obtenerActividad).mockResolvedValue(
        actividad({ capacidades: [], configuracion: { formacion_equipos: 'manual' } }),
      )
      vi.mocked(obtenerEquipos).mockResolvedValue(lista([]))
      renderPantalla()

      expect(await screen.findByText(/Todavía no hay equipos. Cuando los haya/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Crear equipo/ })).not.toBeInTheDocument()
    })
  })

  it('en una actividad archivada explica por qué no hay acciones', async () => {
    vi.mocked(obtenerActividad).mockResolvedValue(actividad({ fase: 'archivada', capacidades: [] }))
    vi.mocked(obtenerEquipos).mockResolvedValue(
      lista([equipo('e1', 'Alfa', [persona('m2', 'Luis Pérez')])]),
    )
    renderPantalla()

    expect(
      await screen.findByText(/La actividad está archivada: los equipos se pueden consultar/),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Unirme|Editar|Eliminar/ })).not.toBeInTheDocument()
  })

  describe('propuesta del sistema', () => {
    const capacidades: AccionActividad[] = [
      'formar_equipos',
      'asignar_integrantes',
      'cerrar_formacion',
      'elegir_equipo',
      'editar_equipo',
      'generar_propuesta_equipos',
    ]

    function propuesta(numeroEquipos: number, esperado: number) {
      return {
        idMiMembresia: YO,
        equipos: [],
        sinEquipo: [],
        semilla: 4242,
        numeroEquipos,
        numeroEquiposEsperado: esperado,
      }
    }

    beforeEach(() => {
      vi.mocked(obtenerActividad).mockResolvedValue(
        actividad({
          rol: 'organizador',
          capacidades,
          numeroEquiposEsperado: 3,
          configuracion: { formacion_equipos: 'propuesta_sistema' },
        }),
      )
    })

    it('sin equipos genera la propuesta directamente y muestra la semilla', async () => {
      vi.mocked(obtenerEquipos).mockResolvedValue(lista([]))
      vi.mocked(generarPropuesta).mockResolvedValue(propuesta(3, 3))
      const usuario = userEvent.setup()
      renderPantalla()

      expect(await screen.findByText(/en 3 equipos/)).toBeInTheDocument()
      await usuario.click(screen.getByRole('button', { name: 'Generar propuesta' }))

      await waitFor(() => expect(generarPropuesta).toHaveBeenCalledWith('act-1'))
      expect(
        await screen.findByText(/Propuesta generada: 3 equipos \(semilla 4242\)/),
      ).toBeInTheDocument()
    })

    it('con equipos ya creados pide confirmar el reemplazo antes de regenerar', async () => {
      vi.mocked(obtenerEquipos).mockResolvedValue(
        lista([equipo('e1', 'Alfa', [persona('m2', 'Luis Pérez')]), equipo('e2', 'Beta')]),
      )
      vi.mocked(generarPropuesta).mockResolvedValue(propuesta(3, 3))
      const usuario = userEvent.setup()
      renderPantalla()

      await usuario.click(await screen.findByRole('button', { name: 'Generar otra propuesta' }))
      expect(generarPropuesta).not.toHaveBeenCalled()
      expect(screen.getByText(/Esto reemplaza los 2 equipos actuales/)).toBeInTheDocument()
      await usuario.click(screen.getByRole('button', { name: 'Sí, generar otra propuesta' }))

      await waitFor(() => expect(generarPropuesta).toHaveBeenCalledWith('act-1'))
    })

    it('avisa cuando hubo menos participantes que equipos esperados', async () => {
      vi.mocked(obtenerEquipos).mockResolvedValue(lista([]))
      vi.mocked(generarPropuesta).mockResolvedValue(propuesta(2, 3))
      const usuario = userEvent.setup()
      renderPantalla()

      await usuario.click(await screen.findByRole('button', { name: 'Generar propuesta' }))

      expect(
        await screen.findByText(/menos participantes que los 3 equipos esperados/),
      ).toBeInTheDocument()
    })

    it('muestra el mensaje del servidor si no se puede generar', async () => {
      vi.mocked(obtenerEquipos).mockResolvedValue(lista([]))
      vi.mocked(generarPropuesta).mockRejectedValue(
        new ErrorEquipos(
          'No hay participantes activos entre quienes repartir una propuesta de equipos.',
        ),
      )
      const usuario = userEvent.setup()
      renderPantalla()

      await usuario.click(await screen.findByRole('button', { name: 'Generar propuesta' }))

      expect(await screen.findByText(/No hay participantes activos/)).toBeInTheDocument()
    })

    it('sin la capacidad no se ofrece, aunque la función esté en propuesta_sistema', async () => {
      vi.mocked(obtenerActividad).mockResolvedValue(
        actividad({
          capacidades: ['editar_equipo'],
          configuracion: { formacion_equipos: 'propuesta_sistema' },
        }),
      )
      vi.mocked(obtenerEquipos).mockResolvedValue(lista([]))
      renderPantalla()

      await screen.findByText(/Quien organiza genera una propuesta del sistema/)
      expect(screen.queryByRole('button', { name: /Generar/ })).not.toBeInTheDocument()
    })
  })

  it('muestra un aviso si no se pueden cargar los equipos', async () => {
    vi.mocked(obtenerActividad).mockResolvedValue(actividad({ capacidades: [] }))
    vi.mocked(obtenerEquipos).mockRejectedValue(new ErrorEquipos('No pudimos cargar los equipos.'))
    renderPantalla()

    expect(await screen.findByText('No pudimos cargar los equipos.')).toBeInTheDocument()
  })

  it('muestra un aviso si la actividad no existe o no se es miembro', async () => {
    vi.mocked(obtenerActividad).mockRejectedValue(new Error('no'))
    vi.mocked(obtenerEquipos).mockRejectedValue(new Error('no'))
    renderPantalla()

    expect(
      await screen.findByText('No encontramos esta actividad, o ya no formas parte de ella.'),
    ).toBeInTheDocument()
  })
})
