import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { obtenerSesionActual, type Usuario } from '../cuentas/api'
import { PantallaInicio } from './PantallaInicio'

vi.mock('../cuentas/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../cuentas/api')>()),
  obtenerSesionActual: vi.fn(() => Promise.resolve(null)),
}))

const USUARIO: Usuario = {
  idUsuario: 'u1',
  nombre: 'Ana',
  apellidoPaterno: 'García',
  apellidoMaterno: 'López',
  correo: 'ana@example.com',
  tipoCuenta: 'usuario',
  fotoUrl: null,
}

function renderPantallaInicio() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PantallaInicio />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PantallaInicio', () => {
  it('expone las acciones de cuenta y el contenido público sin sesión', () => {
    renderPantallaInicio()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Conecta. Colabora. Construye.' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ingresar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument()
    // La muestra de insignias es interna: ya no se enlaza desde aquí.
    expect(screen.queryByRole('link', { name: 'Insignias' })).not.toBeInTheDocument()
    // El contenido formativo es público: Recursos enlaza sin pedir sesión.
    expect(screen.getByRole('link', { name: 'Recursos' })).toHaveAttribute('href', '/recursos')
    expect(
      screen.getByRole('heading', { level: 2, name: 'Características de Co3' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Aprender colaborando' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Ver más/ })).toHaveLength(2)
  })

  it('enlaza las acciones de cuenta a sus pantallas', () => {
    renderPantallaInicio()

    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute(
      'href',
      '/registrarse',
    )
    expect(screen.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/ingresar')
  })

  it('con sesión, ofrece ir a las actividades en lugar de crear cuenta o ingresar', async () => {
    vi.mocked(obtenerSesionActual).mockResolvedValueOnce(USUARIO)
    renderPantallaInicio()

    expect(await screen.findByRole('link', { name: 'Ir a mis actividades' })).toHaveAttribute(
      'href',
      '/actividades',
    )
    expect(screen.queryByRole('link', { name: 'Crear cuenta' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ingresar' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mis actividades' })).toHaveAttribute(
      'href',
      '/actividades',
    )
  })
})
