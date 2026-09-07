import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PantallaCuentas } from './PantallaCuentas'
import { ErrorAdmin, listarCuentas, restablecerContrasena, type CuentaAdmin } from './api'

vi.mock('./api', async () => {
  const real = await vi.importActual<typeof import('./api')>('./api')
  return { ...real, listarCuentas: vi.fn(), restablecerContrasena: vi.fn() }
})

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  return { ...real, obtenerSesion: vi.fn(() => Promise.resolve(null)) }
})

const CUENTA_ACTIVA: CuentaAdmin = {
  idUsuario: 'u1',
  nombre: 'Ada',
  apellidoPaterno: 'Lovelace',
  apellidoMaterno: 'Byron',
  correo: 'ada@ejemplo.com',
  tipoCuenta: 'usuario',
  estadoCuenta: 'activa',
  fechaRegistro: '2026-01-15T10:00:00.000Z',
}

const CUENTA_DESACTIVADA: CuentaAdmin = {
  ...CUENTA_ACTIVA,
  idUsuario: 'u2',
  nombre: 'Alan',
  apellidoPaterno: 'Turing',
  apellidoMaterno: 'Mathison',
  correo: 'alan@ejemplo.com',
  estadoCuenta: 'desactivada',
}

function renderPantalla() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PantallaCuentas />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PantallaCuentas', () => {
  beforeEach(() => {
    vi.mocked(listarCuentas).mockReset()
    vi.mocked(restablecerContrasena).mockReset()
  })

  it('lista las cuentas con su estado', async () => {
    vi.mocked(listarCuentas).mockResolvedValue([CUENTA_ACTIVA, CUENTA_DESACTIVADA])
    renderPantalla()

    expect(await screen.findByText('Ada Lovelace Byron')).toBeInTheDocument()
    expect(screen.getByText('ada@ejemplo.com')).toBeInTheDocument()
    expect(screen.getByText('Activa')).toBeInTheDocument()
    expect(screen.getByText('Alan Turing Mathison')).toBeInTheDocument()
    expect(screen.getByText('Desactivada')).toBeInTheDocument()
  })

  it('muestra un aviso cuando la carga falla', async () => {
    vi.mocked(listarCuentas).mockRejectedValue(new ErrorAdmin('No pudimos cargar las cuentas.'))
    renderPantalla()

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar las cuentas.')
  })

  it('restablece la contraseña de una cuenta y confirma el resultado', async () => {
    vi.mocked(listarCuentas).mockResolvedValue([CUENTA_ACTIVA])
    vi.mocked(restablecerContrasena).mockResolvedValue(undefined)
    renderPantalla()

    await userEvent.click(await screen.findByRole('button', { name: 'Restablecer contraseña' }))

    const dialogo = screen.getByRole('dialog')
    await userEvent.type(within(dialogo).getByLabelText('Nueva contraseña'), 'contrasena-nueva')
    await userEvent.type(within(dialogo).getByLabelText('Confirmar contraseña'), 'contrasena-nueva')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Restablecer contraseña' }))

    await waitFor(() =>
      expect(restablecerContrasena).toHaveBeenCalledWith('u1', 'contrasena-nueva'),
    )
    expect(await screen.findByRole('status')).toHaveTextContent('Contraseña restablecida')
  })

  it('valida longitud mínima y coincidencia sin llamar al servidor', async () => {
    vi.mocked(listarCuentas).mockResolvedValue([CUENTA_ACTIVA])
    renderPantalla()

    await userEvent.click(await screen.findByRole('button', { name: 'Restablecer contraseña' }))
    const dialogo = screen.getByRole('dialog')

    // Demasiado corta.
    await userEvent.type(within(dialogo).getByLabelText('Nueva contraseña'), 'corta')
    await userEvent.type(within(dialogo).getByLabelText('Confirmar contraseña'), 'corta')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Restablecer contraseña' }))
    expect(
      await within(dialogo).findByText('La contraseña debe tener al menos 8 caracteres.'),
    ).toBeInTheDocument()

    // Longitud válida pero sin coincidir.
    await userEvent.clear(within(dialogo).getByLabelText('Nueva contraseña'))
    await userEvent.type(within(dialogo).getByLabelText('Nueva contraseña'), 'contrasena-larga')
    await userEvent.type(within(dialogo).getByLabelText('Confirmar contraseña'), '-distinta')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Restablecer contraseña' }))
    expect(await within(dialogo).findByText('Las contraseñas no coinciden.')).toBeInTheDocument()

    expect(restablecerContrasena).not.toHaveBeenCalled()
  })
})
