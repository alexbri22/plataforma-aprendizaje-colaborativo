import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PerfilBasico, Usuario } from '../cuentas/api'
import { obtenerPerfilDeUsuario, obtenerSesionActual } from '../cuentas/api'
import { PantallaPerfilDeUsuario } from './PantallaPerfilDeUsuario'

const YO: Usuario = {
  idUsuario: 'u1',
  nombre: 'Ana',
  apellidoPaterno: 'García',
  apellidoMaterno: 'López',
  correo: 'ana@example.com',
  tipoCuenta: 'usuario',
  fotoUrl: null,
}

const OTRA: PerfilBasico = {
  idUsuario: 'u2',
  nombre: 'Bruno',
  apellidoPaterno: 'Ruiz',
  apellidoMaterno: 'Mena',
  fotoUrl: 'http://api.test/api/usuarios/u2/foto?v=1',
  acumulado: { companerismo: 9 },
}

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  return {
    ...real,
    obtenerSesionActual: vi.fn(),
    cerrarSesion: vi.fn().mockResolvedValue(undefined),
    obtenerPerfilDeUsuario: vi.fn(),
  }
})

function renderPantalla(id: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/usuarios/${id}`]}>
        <Routes>
          <Route path="/usuarios/:id" element={<PantallaPerfilDeUsuario />} />
          <Route path="/perfil" element={<p>Mi perfil propio</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PantallaPerfilDeUsuario', () => {
  beforeEach(() => {
    vi.mocked(obtenerSesionActual).mockResolvedValue(YO)
    vi.mocked(obtenerPerfilDeUsuario).mockReset()
  })

  it('muestra nombre, foto y rangos de otra persona, sin datos de contacto', async () => {
    vi.mocked(obtenerPerfilDeUsuario).mockResolvedValue(OTRA)

    renderPantalla('u2')

    expect(await screen.findByRole('heading', { name: 'Bruno Ruiz Mena' })).toBeInTheDocument()
    expect(screen.getByRole('figure', { name: 'Compañerismo, nivel Plata' })).toBeInTheDocument()
    // La vitrina ajena no se abre: no hay botones de insignia.
    expect(screen.queryByRole('button', { name: /Compañerismo/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/@/)).not.toBeInTheDocument()
    expect(
      document.querySelector('img[src="http://api.test/api/usuarios/u2/foto?v=1"]'),
    ).not.toBeNull()
  })

  it('el propio id redirige a Mi perfil', async () => {
    vi.mocked(obtenerPerfilDeUsuario).mockResolvedValue({ ...OTRA, idUsuario: 'u1' })

    renderPantalla('u1')

    expect(await screen.findByText('Mi perfil propio')).toBeInTheDocument()
  })

  it('avisa cuando la persona no existe', async () => {
    vi.mocked(obtenerPerfilDeUsuario).mockRejectedValue(new Error('No encontramos a esta persona.'))

    renderPantalla('nadie')

    expect(await screen.findByText('No encontramos a esta persona.')).toBeInTheDocument()
  })
})
