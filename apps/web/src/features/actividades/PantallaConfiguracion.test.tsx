import { CONFIGURACION_POR_DEFECTO, type PeriodoReporte } from '@plataforma/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Usuario } from '../cuentas/api'
import {
  actualizarPeriodo,
  configurarFuncion,
  definirPeriodos,
  ErrorActividad,
  obtenerActividad,
  obtenerPeriodos,
} from './actividades.api'
import { formatearFecha } from './formato'
import { PantallaConfiguracion } from './PantallaConfiguracion'
import type { Actividad } from './tipos'

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

vi.mock('./actividades.api', async () => {
  const real = await vi.importActual<typeof import('./actividades.api')>('./actividades.api')
  return {
    ...real,
    obtenerActividad: vi.fn(),
    configurarFuncion: vi.fn(),
    obtenerPeriodos: vi.fn(),
    definirPeriodos: vi.fn(),
    actualizarPeriodo: vi.fn(),
  }
})

function renderPantalla(id: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/actividades/${id}/configuracion`]}>
        <Routes>
          <Route path="/actividades/:id/configuracion" element={<PantallaConfiguracion />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const ACTIVIDAD_BASE: Actividad = {
  id: 'act-1',
  nombre: 'Club de robótica',
  objetivo: 'Construir un brazo robótico.',
  fase: 'inscripcion',
  rol: 'organizador',
  numParticipantes: 1,
  fechaClave: 'Clave: ROBOT2XY',
  claveIngreso: 'ROBOT2XY',
  capacidades: [
    'configurar_funciones',
    'ajustar_periodos',
    'cerrar_inscripcion',
    'agregar_coorganizador',
  ],
  configuracion: { ...CONFIGURACION_POR_DEFECTO },
}

function periodo(
  orden: number,
  fechaInicio: string,
  fechaFin: string,
  estado: PeriodoReporte['estado'] = 'activo',
): PeriodoReporte {
  return { id: `per-${orden}`, orden, fechaInicio, fechaFin, estado }
}

// Calendario semanal reconocible: tres periodos de siete días y uno recortado.
const CALENDARIO_SEMANAL = [
  periodo(1, '2026-09-10', '2026-09-16'),
  periodo(2, '2026-09-17', '2026-09-23'),
  periodo(3, '2026-09-24', '2026-09-30'),
  periodo(4, '2026-10-01', '2026-10-03'),
]

describe('PantallaConfiguracion', () => {
  beforeEach(() => {
    vi.mocked(obtenerActividad).mockReset()
    vi.mocked(configurarFuncion).mockReset()
    vi.mocked(obtenerPeriodos).mockReset().mockResolvedValue([])
    vi.mocked(definirPeriodos).mockReset()
    vi.mocked(actualizarPeriodo).mockReset()
  })

  it('muestra un aviso cuando la actividad no existe', async () => {
    vi.mocked(obtenerActividad).mockRejectedValueOnce(new Error('No encontramos esta actividad.'))

    renderPantalla('no-existe')

    expect(
      await screen.findByText('No encontramos esta actividad, o ya no formas parte de ella.'),
    ).toBeInTheDocument()
  })

  it('bloquea la pantalla a quien no tiene ninguna capacidad de configurar', async () => {
    vi.mocked(obtenerActividad).mockResolvedValueOnce({
      ...ACTIVIDAD_BASE,
      rol: 'participante',
      capacidades: [],
    })

    renderPantalla(ACTIVIDAD_BASE.id)

    expect(
      await screen.findByText('No tienes permiso para configurar esta actividad.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Formación de equipos')).not.toBeInTheDocument()
  })

  it('separa la configuración en General y Proyecto colaborativo', async () => {
    vi.mocked(obtenerActividad).mockResolvedValueOnce(ACTIVIDAD_BASE)

    renderPantalla(ACTIVIDAD_BASE.id)

    const general = await screen.findByRole('region', { name: 'General' })
    const proyecto = screen.getByRole('region', { name: 'Proyecto colaborativo' })
    expect(within(general).getByLabelText('Formación de equipos')).toBeInTheDocument()
    expect(within(general).getByLabelText('Bitácora individual')).toBeInTheDocument()
    expect(within(general).queryByLabelText('Estado de Metas')).not.toBeInTheDocument()
    expect(within(proyecto).getByLabelText('Estado de Metas')).toBeInTheDocument()
    expect(within(proyecto).getByLabelText('Estado de Avances')).toBeInTheDocument()
    expect(within(proyecto).getByLabelText('Estado de Recursos')).toBeInTheDocument()
  })

  it('el reporte de trabajo ya no es una función aparte: no aparece en General', async () => {
    vi.mocked(obtenerActividad).mockResolvedValueOnce(ACTIVIDAD_BASE)

    renderPantalla(ACTIVIDAD_BASE.id)

    await screen.findByRole('region', { name: 'General' })
    expect(screen.queryByText('Reporte de trabajo')).not.toBeInTheDocument()
  })

  it('muestra el valor actual de cada función, tomado de la configuración de la actividad', async () => {
    vi.mocked(obtenerActividad).mockResolvedValueOnce(ACTIVIDAD_BASE)

    renderPantalla(ACTIVIDAD_BASE.id)

    const select = (await screen.findByLabelText('Formación de equipos')) as HTMLSelectElement
    expect(select.value).toBe('autogestionado')
  })

  it('guarda un cambio simple y no deja ninguna etiqueta de éxito', async () => {
    const usuario = userEvent.setup()
    vi.mocked(obtenerActividad).mockResolvedValue(ACTIVIDAD_BASE)
    vi.mocked(configurarFuncion).mockResolvedValueOnce({
      ...ACTIVIDAD_BASE,
      configuracion: { ...ACTIVIDAD_BASE.configuracion, bitacora_individual: 'habilitada' },
    })

    renderPantalla(ACTIVIDAD_BASE.id)

    const interruptor = await screen.findByLabelText('Bitácora individual')
    await usuario.click(interruptor)

    await waitFor(() =>
      expect(configurarFuncion).toHaveBeenCalledWith(ACTIVIDAD_BASE.id, 'bitacora_individual', {
        estado: 'habilitada',
      }),
    )
    // Sin etiqueta de éxito: al terminar solo desaparece "Guardando…".
    await waitFor(() => expect(screen.queryByText('Guardando…')).not.toBeInTheDocument())
    expect(screen.queryByText('Guardado')).not.toBeInTheDocument()
  })

  it('muestra el error inline si el guardado falla', async () => {
    const usuario = userEvent.setup()
    vi.mocked(obtenerActividad).mockResolvedValue(ACTIVIDAD_BASE)
    vi.mocked(configurarFuncion).mockRejectedValueOnce(
      new ErrorActividad('La configuración no puede modificarse en esta fase.'),
    )

    renderPantalla(ACTIVIDAD_BASE.id)

    const interruptor = await screen.findByLabelText('Bitácora individual')
    await usuario.click(interruptor)

    expect(
      await screen.findByText('La configuración no puede modificarse en esta fase.'),
    ).toBeInTheDocument()
  })

  describe('Proyecto colaborativo: estado de metas, avances y recursos', () => {
    it('cambiar un elemento envía los tres campos, preservando los otros valores actuales', async () => {
      const usuario = userEvent.setup()
      vi.mocked(obtenerActividad).mockResolvedValue(ACTIVIDAD_BASE)
      vi.mocked(configurarFuncion).mockResolvedValueOnce(ACTIVIDAD_BASE)

      renderPantalla(ACTIVIDAD_BASE.id)

      await usuario.selectOptions(await screen.findByLabelText('Estado de Metas'), 'Obligatorio')

      await waitFor(() =>
        expect(configurarFuncion).toHaveBeenCalledWith(ACTIVIDAD_BASE.id, 'espacio_equipo', {
          metas: 'obligatorio',
          avances: 'opcional',
          recursos: 'opcional',
        }),
      )
    })

    it('cualquiera de los tres elementos puede deshabilitarse', async () => {
      const usuario = userEvent.setup()
      vi.mocked(obtenerActividad).mockResolvedValue(ACTIVIDAD_BASE)
      vi.mocked(configurarFuncion).mockResolvedValueOnce(ACTIVIDAD_BASE)

      renderPantalla(ACTIVIDAD_BASE.id)

      await usuario.selectOptions(
        await screen.findByLabelText('Estado de Recursos'),
        'Deshabilitado',
      )

      await waitFor(() =>
        expect(configurarFuncion).toHaveBeenCalledWith(ACTIVIDAD_BASE.id, 'espacio_equipo', {
          metas: 'opcional',
          avances: 'opcional',
          recursos: 'deshabilitado',
        }),
      )
    })

    it('solo Avances tiene periodicidad y calendario', async () => {
      vi.mocked(obtenerActividad).mockResolvedValueOnce(ACTIVIDAD_BASE)

      renderPantalla(ACTIVIDAD_BASE.id)

      await screen.findByLabelText('Periodicidad de Avances')
      expect(screen.getAllByRole('combobox', { name: /^Periodicidad/ })).toHaveLength(1)
      expect(screen.getAllByRole('button', { name: 'Editar calendario' })).toHaveLength(1)
    })

    it('con Avances deshabilitado no ofrece calendario y explica por qué', async () => {
      vi.mocked(obtenerActividad).mockResolvedValueOnce({
        ...ACTIVIDAD_BASE,
        configuracion: {
          ...ACTIVIDAD_BASE.configuracion,
          espacio_equipo: JSON.stringify({
            metas: 'opcional',
            avances: 'deshabilitado',
            recursos: 'opcional',
          }),
        },
      })

      renderPantalla(ACTIVIDAD_BASE.id)

      expect(
        await screen.findByText('Habilita Avances para definir su calendario.'),
      ).toBeInTheDocument()
      expect(screen.queryByLabelText('Periodicidad de Avances')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Editar calendario' })).not.toBeInTheDocument()
    })
  })

  describe('Proyecto colaborativo: calendario de avances', () => {
    it('sin calendario muestra "Sin calendario" y no permite editar', async () => {
      vi.mocked(obtenerActividad).mockResolvedValueOnce(ACTIVIDAD_BASE)

      renderPantalla(ACTIVIDAD_BASE.id)

      const select = (await screen.findByLabelText('Periodicidad de Avances')) as HTMLSelectElement
      await waitFor(() => expect(select.value).toBe('ninguna'))
      expect(screen.getByRole('button', { name: 'Editar calendario' })).toBeDisabled()
    })

    it('con calendario deduce la periodicidad y muestra las fechas de los avances activos', async () => {
      vi.mocked(obtenerActividad).mockResolvedValueOnce(ACTIVIDAD_BASE)
      vi.mocked(obtenerPeriodos).mockResolvedValue(CALENDARIO_SEMANAL)

      renderPantalla(ACTIVIDAD_BASE.id)

      const select = (await screen.findByLabelText('Periodicidad de Avances')) as HTMLSelectElement
      await waitFor(() => expect(select.value).toBe('semanal'))
      expect(screen.getByText(formatearFecha('2026-09-10'))).toBeInTheDocument()
      expect(screen.getByText(formatearFecha('2026-10-03'))).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Editar calendario' })).toBeEnabled()
    })

    it('elegir una periodicidad sin calendario previo lo genera sin pedir confirmación', async () => {
      const usuario = userEvent.setup()
      vi.mocked(obtenerActividad).mockResolvedValue(ACTIVIDAD_BASE)
      vi.mocked(definirPeriodos).mockResolvedValueOnce(CALENDARIO_SEMANAL)

      renderPantalla(ACTIVIDAD_BASE.id)

      await usuario.selectOptions(
        await screen.findByLabelText('Periodicidad de Avances'),
        'Semanal',
      )

      await waitFor(() =>
        expect(definirPeriodos).toHaveBeenCalledWith(ACTIVIDAD_BASE.id, 'semanal'),
      )
    })

    it('con calendario previo pide confirmación antes de reemplazarlo', async () => {
      const usuario = userEvent.setup()
      vi.mocked(obtenerActividad).mockResolvedValue(ACTIVIDAD_BASE)
      vi.mocked(obtenerPeriodos).mockResolvedValue(CALENDARIO_SEMANAL)
      vi.mocked(definirPeriodos).mockResolvedValueOnce([])

      renderPantalla(ACTIVIDAD_BASE.id)

      const select = await screen.findByLabelText('Periodicidad de Avances')
      await waitFor(() => expect(select).toHaveValue('semanal'))
      await usuario.selectOptions(select, 'Mensual')

      expect(
        screen.getByText(
          /reemplaza los 4 avances actuales, incluidos los que ajustaste o cancelaste/,
        ),
      ).toBeInTheDocument()
      expect(definirPeriodos).not.toHaveBeenCalled()

      await usuario.click(screen.getByRole('button', { name: 'Reemplazar calendario' }))

      await waitFor(() =>
        expect(definirPeriodos).toHaveBeenCalledWith(ACTIVIDAD_BASE.id, 'mensual'),
      )
    })

    it('"Mantener el actual" descarta el cambio sin llamar al servidor', async () => {
      const usuario = userEvent.setup()
      vi.mocked(obtenerActividad).mockResolvedValue(ACTIVIDAD_BASE)
      vi.mocked(obtenerPeriodos).mockResolvedValue(CALENDARIO_SEMANAL)

      renderPantalla(ACTIVIDAD_BASE.id)

      const select = await screen.findByLabelText('Periodicidad de Avances')
      await waitFor(() => expect(select).toHaveValue('semanal'))
      await usuario.selectOptions(select, 'Quincenal')
      await usuario.click(screen.getByRole('button', { name: 'Mantener el actual' }))

      expect(definirPeriodos).not.toHaveBeenCalled()
      expect(
        screen.queryByRole('button', { name: 'Reemplazar calendario' }),
      ).not.toBeInTheDocument()
    })

    it('quitar el calendario avisa que borra los avances actuales', async () => {
      const usuario = userEvent.setup()
      vi.mocked(obtenerActividad).mockResolvedValue(ACTIVIDAD_BASE)
      vi.mocked(obtenerPeriodos).mockResolvedValue(CALENDARIO_SEMANAL)
      vi.mocked(definirPeriodos).mockResolvedValueOnce([])

      renderPantalla(ACTIVIDAD_BASE.id)

      const select = await screen.findByLabelText('Periodicidad de Avances')
      await waitFor(() => expect(select).toHaveValue('semanal'))
      await usuario.selectOptions(select, 'Sin calendario')

      expect(
        screen.getByText('Quitar el calendario borra los 4 avances actuales.'),
      ).toBeInTheDocument()
      await usuario.click(screen.getByRole('button', { name: 'Reemplazar calendario' }))
      await waitFor(() =>
        expect(definirPeriodos).toHaveBeenCalledWith(ACTIVIDAD_BASE.id, 'ninguna'),
      )
    })

    it('muestra el error del servidor si no puede generar el calendario', async () => {
      const usuario = userEvent.setup()
      vi.mocked(obtenerActividad).mockResolvedValue(ACTIVIDAD_BASE)
      vi.mocked(definirPeriodos).mockRejectedValueOnce(
        new ErrorActividad('Esa periodicidad genera más de 120 periodos.'),
      )

      renderPantalla(ACTIVIDAD_BASE.id)

      await usuario.selectOptions(
        await screen.findByLabelText('Periodicidad de Avances'),
        'Semanal',
      )

      expect(
        await screen.findByText('Esa periodicidad genera más de 120 periodos.'),
      ).toBeInTheDocument()
    })
  })

  describe('panel de calendario de avances', () => {
    async function abrirPanel(periodos = CALENDARIO_SEMANAL) {
      const usuario = userEvent.setup()
      vi.mocked(obtenerActividad).mockResolvedValue(ACTIVIDAD_BASE)
      vi.mocked(obtenerPeriodos).mockResolvedValue(periodos)
      renderPantalla(ACTIVIDAD_BASE.id)

      const boton = await screen.findByRole('button', { name: 'Editar calendario' })
      await waitFor(() => expect(boton).toBeEnabled())
      await usuario.click(boton)
      return {
        usuario,
        panel: await screen.findByRole('dialog', { name: 'Calendario de avances' }),
      }
    }

    it('lista cada avance con sus fechas', async () => {
      const { panel } = await abrirPanel()

      const avance2 = within(panel).getByRole('group', { name: 'Avance 2' })
      expect(within(avance2).getByLabelText('Inicio')).toHaveValue('2026-09-17')
      expect(within(avance2).getByLabelText('Fin')).toHaveValue('2026-09-23')
      expect(within(panel).getAllByRole('group')).toHaveLength(4)
    })

    it('cancela un avance sin borrarlo: sigue visible y se puede reactivar', async () => {
      const { usuario, panel } = await abrirPanel([
        CALENDARIO_SEMANAL[0],
        periodo(2, '2026-09-17', '2026-09-23', 'cancelado'),
        ...CALENDARIO_SEMANAL.slice(2),
      ])
      vi.mocked(actualizarPeriodo).mockResolvedValue(
        periodo(3, '2026-09-24', '2026-09-30', 'cancelado'),
      )

      const avance2 = within(panel).getByRole('group', { name: 'Avance 2' })
      expect(within(avance2).getByText('Cancelado')).toBeInTheDocument()
      expect(within(avance2).getByLabelText('Inicio')).toBeDisabled()

      await usuario.click(within(avance2).getByRole('button', { name: 'Reactivar avance 2' }))
      await waitFor(() =>
        expect(actualizarPeriodo).toHaveBeenCalledWith(ACTIVIDAD_BASE.id, 'per-2', {
          estado: 'activo',
        }),
      )

      const avance3 = within(panel).getByRole('group', { name: 'Avance 3' })
      await usuario.click(within(avance3).getByRole('button', { name: 'Cancelar avance 3' }))
      await waitFor(() =>
        expect(actualizarPeriodo).toHaveBeenCalledWith(ACTIVIDAD_BASE.id, 'per-3', {
          estado: 'cancelado',
        }),
      )
    })

    it('guarda las fechas nuevas de un avance solo cuando cambiaron y son válidas', async () => {
      const { usuario, panel } = await abrirPanel()
      vi.mocked(actualizarPeriodo).mockResolvedValue(CALENDARIO_SEMANAL[0])

      const avance1 = within(panel).getByRole('group', { name: 'Avance 1' })
      const guardar = within(avance1).getByRole('button', { name: 'Guardar fechas del avance 1' })
      expect(guardar).toBeDisabled()

      fireEvent.change(within(avance1).getByLabelText('Fin'), { target: { value: '2026-09-01' } })
      expect(guardar).toBeDisabled()
      expect(within(avance1).getByText('Debe ser igual o posterior al inicio.')).toBeInTheDocument()

      fireEvent.change(within(avance1).getByLabelText('Fin'), { target: { value: '2026-09-14' } })
      expect(guardar).toBeEnabled()
      await usuario.click(guardar)

      await waitFor(() =>
        expect(actualizarPeriodo).toHaveBeenCalledWith(ACTIVIDAD_BASE.id, 'per-1', {
          fechaInicio: '2026-09-10',
          fechaFin: '2026-09-14',
        }),
      )
    })

    it('muestra el error del servidor, por ejemplo un traslape', async () => {
      const { usuario, panel } = await abrirPanel()
      vi.mocked(actualizarPeriodo).mockRejectedValueOnce(
        new ErrorActividad('Estas fechas se traslapan con el periodo 2.'),
      )

      const avance1 = within(panel).getByRole('group', { name: 'Avance 1' })
      fireEvent.change(within(avance1).getByLabelText('Fin'), { target: { value: '2026-09-20' } })
      await usuario.click(
        within(avance1).getByRole('button', { name: 'Guardar fechas del avance 1' }),
      )

      expect(
        await within(panel).findByText('Estas fechas se traslapan con el periodo 2.'),
      ).toBeInTheDocument()
    })

    it('se cierra con el botón Cerrar', async () => {
      const { usuario, panel } = await abrirPanel()

      await usuario.click(within(panel).getByRole('button', { name: 'Cerrar' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('en desarrollo: solo se puede ajustar el calendario', () => {
    const EN_DESARROLLO: Actividad = {
      ...ACTIVIDAD_BASE,
      fase: 'desarrollo',
      capacidades: ['ajustar_periodos', 'agregar_coorganizador'],
    }

    it('deshabilita las funciones y los estados, y lo explica', async () => {
      vi.mocked(obtenerActividad).mockResolvedValueOnce(EN_DESARROLLO)
      vi.mocked(obtenerPeriodos).mockResolvedValue(CALENDARIO_SEMANAL)

      renderPantalla(ACTIVIDAD_BASE.id)

      expect(await screen.findByLabelText('Formación de equipos')).toBeDisabled()
      expect(screen.getByLabelText('Bitácora individual')).toBeDisabled()
      expect(screen.getByLabelText('Estado de Metas')).toBeDisabled()
      expect(await screen.findByLabelText('Periodicidad de Avances')).toBeDisabled()
      expect(
        screen.getByText(/Las funciones ya no pueden cambiarse en esta fase/),
      ).toBeInTheDocument()
    })

    it('pero permite abrir el calendario y cancelar un avance', async () => {
      const usuario = userEvent.setup()
      vi.mocked(obtenerActividad).mockResolvedValueOnce(EN_DESARROLLO)
      vi.mocked(obtenerPeriodos).mockResolvedValue(CALENDARIO_SEMANAL)
      vi.mocked(actualizarPeriodo).mockResolvedValue(CALENDARIO_SEMANAL[2])

      renderPantalla(ACTIVIDAD_BASE.id)

      const boton = await screen.findByRole('button', { name: 'Editar calendario' })
      await waitFor(() => expect(boton).toBeEnabled())
      await usuario.click(boton)
      await usuario.click(screen.getByRole('button', { name: 'Cancelar avance 3' }))

      await waitFor(() =>
        expect(actualizarPeriodo).toHaveBeenCalledWith(ACTIVIDAD_BASE.id, 'per-3', {
          estado: 'cancelado',
        }),
      )
    })
  })
})
