import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RutaAdmin } from './RutaAdmin'
import { obtenerSesion } from '../cuentas/api'

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  return { ...real, obtenerSesion: vi.fn() }
})

const ADMIN = {
  idUsuario: 'a1',
  nombre: 'Grace',
  apellidoPaterno: 'Hopper',
  apellidoMaterno: 'Murray',
  correo: 'grace@ejemplo.com',
  tipoCuenta: 'administrador' as const,
}

const USUARIO = { ...ADMIN, idUsuario: 'u1', tipoCuenta: 'usuario' as const }

function renderRuta() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/cuentas']}>
        <Routes>
          <Route path="/" element={<p>Inicio público</p>} />
          <Route path="/ingresar" element={<p>Pantalla de ingreso</p>} />
          <Route
            path="/admin/cuentas"
            element={
              <RutaAdmin>
                <p>Panel de administración</p>
              </RutaAdmin>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('RutaAdmin', () => {
  beforeEach(() => {
    vi.mocked(obtenerSesion).mockReset()
  })

  it('muestra el panel a un administrador', async () => {
    vi.mocked(obtenerSesion).mockResolvedValue(ADMIN)
    renderRuta()
    expect(await screen.findByText('Panel de administración')).toBeInTheDocument()
  })

  it('redirige al inicio a una cuenta de usuario', async () => {
    vi.mocked(obtenerSesion).mockResolvedValue(USUARIO)
    renderRuta()
    expect(await screen.findByText('Inicio público')).toBeInTheDocument()
    expect(screen.queryByText('Panel de administración')).not.toBeInTheDocument()
  })

  it('redirige al ingreso cuando no hay sesión', async () => {
    vi.mocked(obtenerSesion).mockResolvedValue(null)
    renderRuta()
    expect(await screen.findByText('Pantalla de ingreso')).toBeInTheDocument()
  })
})
