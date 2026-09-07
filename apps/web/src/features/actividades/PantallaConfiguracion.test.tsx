import { CONFIGURACION_POR_DEFECTO } from '@plataforma/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Usuario } from '../cuentas/api'
import { configurarFuncion, ErrorActividad, obtenerActividad } from './actividades.api'
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
  }
  return {
    ...real,
    obtenerSesionActual: vi.fn().mockResolvedValue(usuario),
    cerrarSesion: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock('./actividades.api', async () => {
  const real = await vi.importActual<typeof import('./actividades.api')>('./actividades.api')
  return { ...real, obtenerActividad: vi.fn(), configurarFuncion: vi.fn() }
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
  capacidades: ['configurar_funciones', 'cerrar_inscripcion', 'agregar_coorganizador'],
  configuracion: { ...CONFIGURACION_POR_DEFECTO },
}

describe('PantallaConfiguracion', () => {
  beforeEach(() => {
    vi.mocked(obtenerActividad).mockReset()
    vi.mocked(configurarFuncion).mockReset()
  })

  it('muestra un aviso cuando la actividad no existe', async () => {
    vi.mocked(obtenerActividad).mockRejectedValueOnce(new Error('No encontramos esta actividad.'))

    renderPantalla('no-existe')

    expect(
      await screen.findByText('No encontramos esta actividad, o ya no formas parte de ella.'),
    ).toBeInTheDocument()
  })

  it('bloquea la pantalla a quien no tiene la capacidad de configurar', async () => {
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

  it('muestra el valor actual de cada función, tomado de la configuración de la actividad', async () => {
    vi.mocked(obtenerActividad).mockResolvedValueOnce(ACTIVIDAD_BASE)

    renderPantalla(ACTIVIDAD_BASE.id)

    const select = (await screen.findByLabelText('Formación de equipos')) as HTMLSelectElement
    expect(select.value).toBe('autogestionado')
  })

  it('guarda un cambio simple y muestra el indicador de guardado', async () => {
    const usuario = userEvent.setup()
    vi.mocked(obtenerActividad).mockResolvedValue(ACTIVIDAD_BASE)
    vi.mocked(configurarFuncion).mockResolvedValueOnce({
      ...ACTIVIDAD_BASE,
      configuracion: { ...ACTIVIDAD_BASE.configuracion, bitacora_individual: 'habilitada' },
    })

    renderPantalla(ACTIVIDAD_BASE.id)

    const select = await screen.findByLabelText('Bitácora individual')
    await usuario.selectOptions(select, 'Habilitada')

    await waitFor(() =>
      expect(configurarFuncion).toHaveBeenCalledWith(ACTIVIDAD_BASE.id, 'bitacora_individual', {
        estado: 'habilitada',
      }),
    )
    expect(await screen.findByText('Guardado')).toBeInTheDocument()
  })

  it('muestra el error inline si el guardado falla', async () => {
    const usuario = userEvent.setup()
    vi.mocked(obtenerActividad).mockResolvedValue(ACTIVIDAD_BASE)
    vi.mocked(configurarFuncion).mockRejectedValueOnce(
      new ErrorActividad('La configuración no puede modificarse en esta fase.'),
    )

    renderPantalla(ACTIVIDAD_BASE.id)

    const select = await screen.findByLabelText('Bitácora individual')
    await usuario.selectOptions(select, 'Habilitada')

    expect(
      await screen.findByText('La configuración no puede modificarse en esta fase.'),
    ).toBeInTheDocument()
  })

  it('espacio_equipo: cambiar un elemento envía los tres campos, preservando los otros valores actuales', async () => {
    const usuario = userEvent.setup()
    vi.mocked(obtenerActividad).mockResolvedValue(ACTIVIDAD_BASE)
    vi.mocked(configurarFuncion).mockResolvedValueOnce(ACTIVIDAD_BASE)

    renderPantalla(ACTIVIDAD_BASE.id)

    const selectMetas = await screen.findByLabelText('Metas')
    await usuario.selectOptions(selectMetas, 'Obligatorio')

    await waitFor(() =>
      expect(configurarFuncion).toHaveBeenCalledWith(ACTIVIDAD_BASE.id, 'espacio_equipo', {
        metas: 'obligatorio',
        avances: 'opcional',
        recursos: 'opcional',
      }),
    )
  })
})
