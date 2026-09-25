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

const SIN_LIMITES = { minimo: null, maximo: null }

function lista(equipos: Equipo[], sinEquipo: ListaEquipos['sinEquipo'] = []): ListaEquipos {
  return { idMiMembresia: YO, limites: SIN_LIMITES, equipos, sinEquipo }
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

    it('nombra cómo se forman los equipos y lista quiénes no tienen equipo', async () => {
      renderPantalla()

      expect(await screen.findByText('Autogestionada')).toBeInTheDocument()
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

    expect(await screen.findByText('Asignación manual')).toBeInTheDocument()
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

    it('el cierre de la formación se confirma y resume cuántos quedan sin equipo', async () => {
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

      expect(await screen.findByText('2 sin equipo')).toBeInTheDocument()
      await usuario.click(screen.getByRole('button', { name: 'Cerrar la formación' }))
      expect(cerrarFormacion).not.toHaveBeenCalled()
      await usuario.click(screen.getByRole('button', { name: 'Confirmar cierre' }))

      await waitFor(() => expect(cerrarFormacion).toHaveBeenCalledWith('act-1'))
    })

    it('sin equipos no se puede cerrar la formación', async () => {
      vi.mocked(obtenerEquipos).mockResolvedValue(lista([]))
      renderPantalla()

      expect(await screen.findByText('Crea un equipo para poder cerrar.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cerrar la formación' })).toBeDisabled()
      expect(screen.getByText('Aún no hay equipos.')).toBeInTheDocument()
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
      expect(screen.getAllByRole('button', { name: 'Unirme' })).toHaveLength(1)
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
    it('durante la inscripción, dice que la formación aún no empieza', async () => {
      vi.mocked(obtenerActividad).mockResolvedValue(
        actividad({ fase: 'inscripcion', capacidades: [] }),
      )
      vi.mocked(obtenerEquipos).mockResolvedValue(lista([]))
      renderPantalla()

      expect(
        await screen.findByText('La formación empieza al cerrar la inscripción.'),
      ).toBeInTheDocument()
    })

    it('en formación sin permiso para crear, no ofrece la acción', async () => {
      vi.mocked(obtenerActividad).mockResolvedValue(
        actividad({ capacidades: [], configuracion: { formacion_equipos: 'manual' } }),
      )
      vi.mocked(obtenerEquipos).mockResolvedValue(lista([]))
      renderPantalla()

      expect(await screen.findByText('Aún no hay equipos.')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Crear equipo/ })).not.toBeInTheDocument()
    })
  })

  it('en una actividad archivada indica que es de solo lectura', async () => {
    vi.mocked(obtenerActividad).mockResolvedValue(actividad({ fase: 'archivada', capacidades: [] }))
    vi.mocked(obtenerEquipos).mockResolvedValue(
      lista([equipo('e1', 'Alfa', [persona('m2', 'Luis Pérez')])]),
    )
    renderPantalla()

    expect(await screen.findByText('Actividad archivada: solo lectura.')).toBeInTheDocument()
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
        limites: SIN_LIMITES,
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

    it('sin equipos genera la propuesta directamente, sin mostrar la semilla', async () => {
      vi.mocked(obtenerEquipos).mockResolvedValue(lista([]))
      vi.mocked(generarPropuesta).mockResolvedValue(propuesta(3, 3))
      const usuario = userEvent.setup()
      renderPantalla()

      await usuario.click(await screen.findByRole('button', { name: 'Generar propuesta' }))

      await waitFor(() => expect(generarPropuesta).toHaveBeenCalledWith('act-1'))
      expect(await screen.findByText('Propuesta generada: 3 equipos.')).toBeInTheDocument()
      expect(screen.queryByText(/semilla/i)).not.toBeInTheDocument()
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
      expect(screen.getByText('Reemplaza los 2 equipos actuales.')).toBeInTheDocument()
      await usuario.click(screen.getByRole('button', { name: 'Reemplazar' }))

      await waitFor(() => expect(generarPropuesta).toHaveBeenCalledWith('act-1'))
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

      await screen.findByText('Propuesta del sistema')
      expect(screen.queryByRole('button', { name: /Generar/ })).not.toBeInTheDocument()
    })
  })

  describe('tamaño de los equipos', () => {
    const conLimites = (
      equipos: Equipo[],
      sinEquipo: ListaEquipos['sinEquipo'] = [],
    ): ListaEquipos => ({
      idMiMembresia: YO,
      limites: { minimo: 2, maximo: 3 },
      equipos,
      sinEquipo,
    })

    it('muestra cuántos caben, avisa de los que están bajo el mínimo y bloquea unirse a uno lleno', async () => {
      vi.mocked(obtenerActividad).mockResolvedValue(
        actividad({ capacidades: ['elegir_equipo', 'editar_equipo'] }),
      )
      vi.mocked(obtenerEquipos).mockResolvedValue(
        conLimites(
          [
            equipo('e1', 'Lleno', [
              persona('m1', 'Ana A'),
              persona('m2', 'Bea B'),
              persona('m3', 'Cai C'),
            ]),
            equipo('e2', 'Solo', [persona('m4', 'Dan D')]),
          ],
          [{ idMembresia: YO, nombre: 'Yo Mismo' }],
        ),
      )
      renderPantalla()

      expect(await screen.findByText('3 de 3 integrantes')).toBeInTheDocument()
      expect(screen.getByText('1 de 3 integrantes')).toBeInTheDocument()
      expect(screen.getByText('Menos del mínimo de 2')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Equipo lleno' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Unirme' })).toBeEnabled()
    })

    it('un equipo que excede el máximo, porque se bajó después, se marca sin desarmarlo', async () => {
      vi.mocked(obtenerActividad).mockResolvedValue(actividad({ capacidades: [] }))
      vi.mocked(obtenerEquipos).mockResolvedValue({
        ...conLimites([
          equipo('e1', 'Grande', [
            persona('m1', 'A A'),
            persona('m2', 'B B'),
            persona('m3', 'C C'),
          ]),
        ]),
        limites: { minimo: null, maximo: 2 },
      })
      renderPantalla()

      expect(await screen.findByText('Por encima del máximo')).toBeInTheDocument()
      expect(screen.getByText('3 de 2 integrantes')).toBeInTheDocument()
    })

    it('muestra los límites como etiquetas junto al nombre de la formación', async () => {
      vi.mocked(obtenerActividad).mockResolvedValue(actividad({ capacidades: [] }))
      vi.mocked(obtenerEquipos).mockResolvedValue(conLimites([]))
      renderPantalla()

      expect(await screen.findByText('Máx. 3')).toBeInTheDocument()
      expect(screen.getByText('Mín. 2')).toBeInTheDocument()
    })

    it('al cerrar avisa de los equipos nuevos que hará falta crear y de los que están bajo el mínimo', async () => {
      vi.mocked(obtenerActividad).mockResolvedValue(
        actividad({
          rol: 'organizador',
          capacidades: [
            'formar_equipos',
            'asignar_integrantes',
            'cerrar_formacion',
            'elegir_equipo',
          ],
          configuracion: { formacion_equipos: 'manual' },
        }),
      )
      vi.mocked(obtenerEquipos).mockResolvedValue(
        conLimites(
          [
            equipo('e1', 'Alfa', [
              persona('m1', 'A A'),
              persona('m2', 'B B'),
              persona('m3', 'C C'),
            ]),
            equipo('e2', 'Beta', [persona('m4', 'D D')]),
          ],
          [
            { idMembresia: 'm5', nombre: 'E E' },
            { idMembresia: 'm6', nombre: 'F F' },
            { idMembresia: 'm7', nombre: 'G G' },
          ],
        ),
      )
      renderPantalla()

      // Caben 2 más en Beta; la tercera persona abre un equipo nuevo.
      expect(await screen.findByText('+1 equipo nuevo')).toBeInTheDocument()
      expect(screen.getByText('1 equipo bajo el mínimo')).toBeInTheDocument()
    })
  })

  describe('listas largas de personas', () => {
    const muchas = Array.from({ length: 25 }, (_, n) => ({
      idMembresia: `m${n + 1}`,
      nombre: `Persona ${String(n + 1).padStart(2, '0')}`,
    }))

    it('la asignación pagina de 10 en 10 y conserva la página al cambiar a otra', async () => {
      vi.mocked(obtenerActividad).mockResolvedValue(
        actividad({
          rol: 'organizador',
          capacidades: ['formar_equipos', 'asignar_integrantes'],
          configuracion: { formacion_equipos: 'manual' },
        }),
      )
      vi.mocked(obtenerEquipos).mockResolvedValue(lista([equipo('e1', 'Alfa')], muchas))
      const usuario = userEvent.setup()
      renderPantalla()

      const asignacion = (await screen.findByText('Asignación de personas')).closest(
        'div',
      ) as HTMLElement
      expect(within(asignacion).getAllByRole('combobox')).toHaveLength(10)
      expect(within(asignacion).getByText('1–10 de 25')).toBeInTheDocument()
      expect(within(asignacion).getByLabelText('Equipo de Persona 10')).toBeInTheDocument()
      expect(within(asignacion).queryByLabelText('Equipo de Persona 11')).not.toBeInTheDocument()

      await usuario.click(within(asignacion).getByRole('button', { name: 'Siguiente' }))
      expect(within(asignacion).getByText('11–20 de 25')).toBeInTheDocument()
      expect(within(asignacion).getByLabelText('Equipo de Persona 11')).toBeInTheDocument()
    })

    it('quienes no tienen equipo también se paginan, y con pocas no aparece la paginación', async () => {
      vi.mocked(obtenerActividad).mockResolvedValue(actividad({ capacidades: [] }))
      vi.mocked(obtenerEquipos).mockResolvedValue(lista([equipo('e1', 'Alfa')], muchas))
      renderPantalla()

      expect(await screen.findByText('Sin equipo (25)')).toBeInTheDocument()
      expect(screen.getByText('1–10 de 25')).toBeInTheDocument()
      expect(screen.queryByText('Persona 11')).not.toBeInTheDocument()
    })

    it('con 10 o menos personas no se muestra la paginación', async () => {
      vi.mocked(obtenerActividad).mockResolvedValue(actividad({ capacidades: [] }))
      vi.mocked(obtenerEquipos).mockResolvedValue(
        lista([equipo('e1', 'Alfa')], muchas.slice(0, 10)),
      )
      renderPantalla()

      await screen.findByText('Sin equipo (10)')
      expect(
        screen.queryByRole('navigation', { name: 'Personas sin equipo' }),
      ).not.toBeInTheDocument()
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
