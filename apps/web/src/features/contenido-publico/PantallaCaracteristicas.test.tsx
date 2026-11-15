import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { obtenerSesionActual, type Usuario } from '../cuentas/api'
import { PantallaCaracteristicas } from './PantallaCaracteristicas'

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

function renderPantalla() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PantallaCaracteristicas />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PantallaCaracteristicas', () => {
  it('explica Organizo y Participo y, sin sesión, ofrece crear cuenta', async () => {
    renderPantalla()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Características de Co3' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Organizo' })).toHaveTextContent(
      /organizar y dar seguimiento/,
    )
    expect(screen.getByRole('region', { name: 'Participo' })).toHaveTextContent(
      /Proyecto colaborativo y Proceso colaborativo/,
    )
    expect(await screen.findByRole('link', { name: 'Crear cuenta' })).toHaveAttribute(
      'href',
      '/registrarse',
    )
    expect(screen.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/ingresar')
    expect(screen.queryByRole('link', { name: 'Ir a Organizo' })).not.toBeInTheDocument()
  })

  it('con sesión, cada función lleva a su sección', async () => {
    vi.mocked(obtenerSesionActual).mockResolvedValueOnce(USUARIO)
    renderPantalla()

    expect(await screen.findByRole('link', { name: 'Ir a Organizo' })).toHaveAttribute(
      'href',
      '/actividades/organizo',
    )
    expect(screen.getByRole('link', { name: 'Ir a Participo' })).toHaveAttribute(
      'href',
      '/actividades/participo',
    )
    expect(screen.queryByRole('link', { name: 'Crear cuenta' })).not.toBeInTheDocument()
  })
})
