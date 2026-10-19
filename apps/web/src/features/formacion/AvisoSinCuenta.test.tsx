import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerSesionActual, type Usuario } from '../cuentas/api'
import { listarRecursos } from './formacion.api'
import { PantallaRecursos } from './PantallaRecursos'

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  return { ...real, obtenerSesionActual: vi.fn() }
})

vi.mock('./formacion.api', async () => {
  const real = await vi.importActual<typeof import('./formacion.api')>('./formacion.api')
  return { ...real, listarRecursos: vi.fn() }
})

const ANA: Usuario = {
  idUsuario: 'u1',
  nombre: 'Ana',
  apellidoPaterno: 'García',
  apellidoMaterno: 'López',
  correo: 'ana@example.com',
  tipoCuenta: 'usuario',
  fotoUrl: null,
}

function renderPantalla() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/recursos']}>
        <PantallaRecursos />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AvisoSinCuenta', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.mocked(listarRecursos).mockResolvedValue({
      recursos: [],
      paginacion: { pagina: 1, porPagina: 9, total: 0, totalPaginas: 0 },
    })
  })

  it('sin sesión avisa que el progreso no se guarda y ofrece ingresar', async () => {
    vi.mocked(obtenerSesionActual).mockResolvedValue(null)
    renderPantalla()

    const aviso = await screen.findByRole('complementary', { name: 'Estás explorando sin cuenta' })
    expect(aviso).toHaveTextContent('no guardaremos tu progreso')
    expect(screen.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/ingresar')
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute(
      'href',
      '/registrarse',
    )
  })

  it('con sesión no se muestra', async () => {
    vi.mocked(obtenerSesionActual).mockResolvedValue(ANA)
    renderPantalla()

    expect(await screen.findByRole('heading', { name: 'Recursos', level: 1 })).toBeInTheDocument()
    expect(screen.queryByText('Estás explorando sin cuenta')).not.toBeInTheDocument()
  })

  it('se puede cerrar y no reaparece durante la visita', async () => {
    const user = userEvent.setup()
    vi.mocked(obtenerSesionActual).mockResolvedValue(null)
    renderPantalla()

    await user.click(await screen.findByRole('button', { name: 'Cerrar aviso' }))
    expect(screen.queryByText('Estás explorando sin cuenta')).not.toBeInTheDocument()
    expect(sessionStorage.getItem('co3.recursos.avisoSinCuenta.cerrado')).toBe('true')
  })
})
