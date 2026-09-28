import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Usuario } from '../features/cuentas'
import { PantallaProximamente } from './PantallaProximamente'

const useSesionMock = vi.fn()
// Se mockea el módulo useSesion y no el índice de cuentas: Encabezado también
// consume useSesion y llega al índice por un import circular
// (cuentas → PantallaAutenticacion → Encabezado → cuentas), con lo que un mock
// del índice no le alcanza.
vi.mock('../features/cuentas/useSesion', async () => {
  const real = await vi.importActual<typeof import('../features/cuentas/useSesion')>(
    '../features/cuentas/useSesion',
  )
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
  fotoUrl: null,
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

  it('el sidebar muestra Cuentas solo a administradores', () => {
    useSesionMock.mockReturnValue({ usuario: USUARIO_PRUEBA, cargando: false })
    const { unmount } = renderPantalla(false)
    expect(screen.queryByRole('link', { name: 'Cuentas' })).not.toBeInTheDocument()
    unmount()

    useSesionMock.mockReturnValue({
      usuario: { ...USUARIO_PRUEBA, tipoCuenta: 'administrador' },
      cargando: false,
    })
    renderPantalla(false)
    expect(screen.getByRole('link', { name: 'Cuentas' })).toHaveAttribute('href', '/admin/cuentas')
  })

  it('el grupo Administración se pliega y se despliega', async () => {
    localStorage.clear()
    useSesionMock.mockReturnValue({
      usuario: { ...USUARIO_PRUEBA, tipoCuenta: 'administrador' },
      cargando: false,
    })
    renderPantalla(false)

    const encabezado = screen.getByRole('button', { name: 'Administración' })
    expect(encabezado).toHaveAttribute('aria-expanded', 'true')

    await userEvent.click(encabezado)
    expect(encabezado).toHaveAttribute('aria-expanded', 'false')
    // Plegado, el panel queda inert: fuera del árbol accesible y del orden de
    // tabulación (jsdom no lo aplica, así que se comprueba el atributo).
    const panel = document.getElementById(encabezado.getAttribute('aria-controls')!)!
    expect(panel).toHaveAttribute('inert')

    await userEvent.click(encabezado)
    expect(encabezado).toHaveAttribute('aria-expanded', 'true')
    expect(panel).not.toHaveAttribute('inert')
  })
})
