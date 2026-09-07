import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { PantallaInicio } from './PantallaInicio'

vi.mock('../cuentas/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../cuentas/api')>()),
  obtenerSesion: vi.fn(() => Promise.resolve(null)),
}))

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
    expect(screen.getByRole('link', { name: 'Registrarse' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Insignias' })).toBeInTheDocument()
    // Recursos sigue siendo un botón inerte: el contenido formativo público
    // todavía no existe, así que no hay destino al que enlazarlo.
    expect(screen.getByRole('button', { name: 'Recursos' })).toBeInTheDocument()
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

    expect(screen.getByRole('link', { name: 'Registrarse' })).toHaveAttribute(
      'href',
      '/registrarse',
    )
    expect(screen.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/ingresar')
  })

  it('enlaza Insignias desde la navegación principal', () => {
    renderPantallaInicio()

    expect(screen.getByRole('link', { name: 'Insignias' })).toHaveAttribute('href', '/insignias')
  })
})
