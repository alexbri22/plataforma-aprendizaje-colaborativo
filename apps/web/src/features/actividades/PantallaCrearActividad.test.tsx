import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Usuario } from '../cuentas/api'
import { _reiniciarDatosDePrueba } from './actividades.api'
import { PantallaCrearActividad } from './PantallaCrearActividad'

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

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const real = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...real, useNavigate: () => navigateMock }
})

function renderPantalla() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PantallaCrearActividad />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const CAMPOS_OBLIGATORIOS = [
  'Nombre de la actividad',
  'Objetivo',
  'Información general',
  'Fecha de inicio',
  'Fecha de término',
  'Fecha límite de inscripción',
  'Plazo de cierre (días)',
  'Número de equipos esperado',
]

async function llenarFormularioValido() {
  await userEvent.type(screen.getByLabelText('Nombre de la actividad'), 'Club de robótica')
  await userEvent.type(screen.getByLabelText('Objetivo'), 'Construir un brazo robótico.')
  await userEvent.type(
    screen.getByLabelText('Información general'),
    'Prototipo funcional con reporte técnico.',
  )
  fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2026-09-01' } })
  fireEvent.change(screen.getByLabelText('Fecha de término'), { target: { value: '2026-11-01' } })
  fireEvent.change(screen.getByLabelText('Fecha límite de inscripción'), {
    target: { value: '2026-09-05' },
  })
  fireEvent.change(screen.getByLabelText('Plazo de cierre (días)'), { target: { value: '10' } })
  fireEvent.change(screen.getByLabelText('Número de equipos esperado'), {
    target: { value: '3' },
  })
}

describe('PantallaCrearActividad', () => {
  beforeEach(() => {
    _reiniciarDatosDePrueba()
    navigateMock.mockReset()
  })

  it('pide los ocho campos como obligatorios', () => {
    renderPantalla()

    for (const etiqueta of CAMPOS_OBLIGATORIOS) {
      expect(screen.getByLabelText(etiqueta)).toBeRequired()
    }
  })

  it('ofrece los tres checkboxes de autopercepción, sin marcar por defecto', () => {
    renderPantalla()

    for (const etiqueta of ['Dirigida', 'Semi-dirigida', 'Autodirigida']) {
      expect(screen.getByRole('checkbox', { name: etiqueta })).not.toBeChecked()
    }
  })

  it('bloquea el envío y marca todos los campos obligatorios si están vacíos', async () => {
    renderPantalla()

    await userEvent.click(screen.getByRole('button', { name: 'Crear actividad' }))

    expect(await screen.findAllByText('Este campo es obligatorio.')).toHaveLength(
      CAMPOS_OBLIGATORIOS.length,
    )
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('exige que la fecha de término sea posterior a la de inicio', async () => {
    renderPantalla()

    fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText('Fecha de término'), { target: { value: '2026-09-01' } })
    fireEvent.blur(screen.getByLabelText('Fecha de término'))

    expect(await screen.findByText('Debe ser posterior a la fecha de inicio.')).toBeInTheDocument()
  })

  it('crea la actividad y navega a su resumen', async () => {
    renderPantalla()

    await llenarFormularioValido()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Autodirigida' }))
    await userEvent.click(screen.getByRole('button', { name: 'Crear actividad' }))

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith(expect.stringMatching(/^\/actividades\/.+/)),
    )
  })
})
