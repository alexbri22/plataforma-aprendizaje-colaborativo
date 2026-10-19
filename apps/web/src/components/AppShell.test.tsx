import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Usuario } from '../features/cuentas'
import { AppShell, type SeccionApp } from './AppShell'

// Mismo mock que PantallaProximamente.test.tsx, por el mismo import circular.
vi.mock('../features/cuentas/useSesion', async () => {
  const real = await vi.importActual<typeof import('../features/cuentas/useSesion')>(
    '../features/cuentas/useSesion',
  )
  const usuario: Usuario = {
    idUsuario: 'u1',
    nombre: 'Ana',
    apellidoPaterno: 'García',
    apellidoMaterno: 'López',
    correo: 'ana@example.com',
    tipoCuenta: 'usuario',
    fotoUrl: null,
  }
  return {
    ...real,
    useSesion: () => ({ usuario, cargando: false }),
    useCerrarSesionMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  }
})

function montar(seccionActiva: SeccionApp) {
  return render(
    <MemoryRouter>
      <AppShell seccionActiva={seccionActiva} titulo="Pantalla">
        <p>contenido</p>
      </AppShell>
    </MemoryRouter>,
  )
}

describe('AppShell', () => {
  it('no ofrece Mi perfil en la navegación principal', () => {
    montar('recursos')

    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(nav).queryByRole('link', { name: /perfil/i })).not.toBeInTheDocument()
  })

  it('el nombre de la cuenta lleva al perfil', () => {
    montar('recursos')

    const enlace = screen.getByRole('link', { name: 'Ana García, ver mi perfil' })
    expect(enlace).toHaveAttribute('href', '/perfil')
    expect(enlace).not.toHaveAttribute('aria-current')
  })

  it('en Mi perfil, el nombre se marca como la página actual', () => {
    montar('perfil')

    expect(screen.getByRole('link', { name: 'Ana García, ver mi perfil' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })
})
