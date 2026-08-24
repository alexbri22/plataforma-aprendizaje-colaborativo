import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Usuario } from '../features/cuentas'
import { PantallaProximamente } from './PantallaProximamente'

const useSesionMock = vi.fn()
vi.mock('../features/cuentas', async () => {
  const real = await vi.importActual<typeof import('../features/cuentas')>('../features/cuentas')
  return {
    ...real,
    useSesion: () => useSesionMock(),
    useCerrarSesionMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  }
})

const USUARIO_PRUEBA: Usuario = {
  idUsuario: 'u1',
  nombre: 'Ana',
  apellidoPaterno: 'García',
  apellidoMaterno: 'López',
  correo: 'ana@example.com',
  tipoCuenta: 'usuario',
}

function renderPantalla(publica: boolean) {
  return render(
    <MemoryRouter>
      <PantallaProximamente
        publica={publica}
        seccionActiva="recursos"
        titulo="Recursos"
        descripcion="Todavía no está construido."
      />
    </MemoryRouter>,
  )
}

describe('PantallaProximamente', () => {
  it('sin publica, siempre usa el shell autenticado aunque no haya sesión', () => {
    useSesionMock.mockReturnValue({ usuario: null, cargando: false })
    renderPantalla(false)

    expect(screen.getByRole('link', { name: 'Mis actividades' })).toBeInTheDocument()
  })

  it('con publica, muestra un indicador de carga mientras se resuelve la sesión', () => {
    useSesionMock.mockReturnValue({ usuario: null, cargando: true })
    renderPantalla(true)

    expect(screen.getByRole('status', { name: 'Cargando' })).toBeInTheDocument()
  })

  it('con publica y sin sesión, muestra el encabezado público sin el sidebar', () => {
    useSesionMock.mockReturnValue({ usuario: null, cargando: false })
    renderPantalla(true)

    expect(screen.queryByRole('link', { name: 'Mis actividades' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Recursos' })).toBeInTheDocument()
  })

  it('con publica y con sesión, muestra el dashboard', () => {
    useSesionMock.mockReturnValue({ usuario: USUARIO_PRUEBA, cargando: false })
    renderPantalla(true)

    expect(screen.getByRole('link', { name: 'Mis actividades' })).toBeInTheDocument()
  })
})
