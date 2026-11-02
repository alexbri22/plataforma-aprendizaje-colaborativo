import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PantallaCuentas } from './PantallaCuentas'
import {
  ErrorAdmin,
  aprobarSolicitudNombre,
  listarCuentas,
  listarSolicitudesNombre,
  rechazarSolicitudNombre,
  restablecerContrasena,
  type CuentaAdmin,
  type SolicitudNombreAdmin,
} from './api'

vi.mock('./api', async () => {
  const real = await vi.importActual<typeof import('./api')>('./api')
  return {
    ...real,
    listarCuentas: vi.fn(),
    restablecerContrasena: vi.fn(),
    listarSolicitudesNombre: vi.fn(),
    aprobarSolicitudNombre: vi.fn(),
    rechazarSolicitudNombre: vi.fn(),
  }
})

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  return { ...real, obtenerSesionActual: vi.fn(() => Promise.resolve(null)) }
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

const SOLICITUD: SolicitudNombreAdmin = {
  idSolicitud: 's1',
  creadaEn: '2026-11-02T10:00:00.000Z',
  solicitado: { nombre: 'Ada', apellidoPaterno: 'King', apellidoMaterno: 'Byron' },
  usuario: {
    idUsuario: 'u1',
    nombre: 'Ada',
    apellidoPaterno: 'Lovelace',
    apellidoMaterno: 'Byron',
    correo: 'ada@ejemplo.com',
  },
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
    vi.mocked(listarSolicitudesNombre).mockReset().mockResolvedValue([])
    vi.mocked(aprobarSolicitudNombre).mockReset()
    vi.mocked(rechazarSolicitudNombre).mockReset()
  })

  it('sin solicitudes de cambio de nombre no muestra la sección', async () => {
    vi.mocked(listarCuentas).mockResolvedValue([CUENTA_ACTIVA])
    renderPantalla()

    await screen.findByRole('link', { name: 'Ada Lovelace Byron' })
    expect(screen.queryByText(/Solicitudes de cambio de nombre/)).not.toBeInTheDocument()
  })

  it('aprueba una solicitud de cambio de nombre y vuelve a cargar', async () => {
    vi.mocked(listarCuentas).mockResolvedValue([CUENTA_ACTIVA])
    vi.mocked(listarSolicitudesNombre).mockResolvedValue([SOLICITUD])
    vi.mocked(aprobarSolicitudNombre).mockResolvedValue(undefined)
    const usuario = userEvent.setup()
    renderPantalla()

    expect(
      await screen.findByRole('heading', { name: 'Solicitudes de cambio de nombre (1)' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Ada King Byron')).toBeInTheDocument()

    vi.mocked(listarSolicitudesNombre).mockResolvedValue([])
    await usuario.click(screen.getByRole('button', { name: 'Aprobar el cambio a Ada King Byron' }))

    expect(aprobarSolicitudNombre).toHaveBeenCalledWith('s1')
    await waitFor(() =>
      expect(screen.queryByText(/Solicitudes de cambio de nombre/)).not.toBeInTheDocument(),
    )
  })

  it('si la solicitud ya no estaba pendiente, el error sigue a la vista aunque la lista se vacíe', async () => {
    vi.mocked(listarCuentas).mockResolvedValue([CUENTA_ACTIVA])
    vi.mocked(listarSolicitudesNombre).mockResolvedValue([SOLICITUD])
    vi.mocked(aprobarSolicitudNombre).mockRejectedValue(
      new ErrorAdmin('Esta solicitud ya no está pendiente.'),
    )
    const usuario = userEvent.setup()
    renderPantalla()

    vi.mocked(listarSolicitudesNombre).mockResolvedValue([])
    await usuario.click(
      await screen.findByRole('button', { name: 'Aprobar el cambio a Ada King Byron' }),
    )

    await waitFor(() =>
      expect(screen.queryByText(/Solicitudes de cambio de nombre/)).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Esta solicitud ya no está pendiente.')
  })

  it('si otro administrador resuelve una solicitud, la tabla de cuentas se relee', async () => {
    vi.mocked(listarCuentas).mockResolvedValue([CUENTA_ACTIVA])
    vi.mocked(listarSolicitudesNombre).mockResolvedValue([SOLICITUD])
    renderPantalla()

    await screen.findByRole('heading', { name: 'Solicitudes de cambio de nombre (1)' })
    expect(listarCuentas).toHaveBeenCalledTimes(1)

    vi.mocked(listarSolicitudesNombre).mockResolvedValue([])
    await waitFor(() => expect(listarCuentas).toHaveBeenCalledTimes(2), { timeout: 4000 })
  })

  it('rechaza una solicitud con motivo', async () => {
    vi.mocked(listarCuentas).mockResolvedValue([CUENTA_ACTIVA])
    vi.mocked(listarSolicitudesNombre).mockResolvedValue([SOLICITUD])
    vi.mocked(rechazarSolicitudNombre).mockResolvedValue(undefined)
    const usuario = userEvent.setup()
    renderPantalla()

    await usuario.click(
      await screen.findByRole('button', { name: 'Rechazar el cambio a Ada King Byron' }),
    )
    const dialogo = screen.getByRole('dialog', { name: 'Rechazar cambio de nombre' })
    await usuario.type(
      within(dialogo).getByLabelText(/Motivo/),
      '  Usa tu nombre como aparece en tu identificación.  ',
    )
    await usuario.click(within(dialogo).getByRole('button', { name: 'Rechazar solicitud' }))

    expect(rechazarSolicitudNombre).toHaveBeenCalledWith(
      's1',
      'Usa tu nombre como aparece en tu identificación.',
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('lista las cuentas con su estado', async () => {
    vi.mocked(listarCuentas).mockResolvedValue([CUENTA_ACTIVA, CUENTA_DESACTIVADA])
    renderPantalla()

    expect(await screen.findByRole('link', { name: 'Ada Lovelace Byron' })).toHaveAttribute(
      'href',
      '/usuarios/u1',
    )
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
