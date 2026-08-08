import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PantallaRegistrarse } from './PantallaRegistrarse'
import { ErrorCuenta, registrarUsuario } from './api'

vi.mock('./api', async () => {
  const real = await vi.importActual<typeof import('./api')>('./api')
  return { ...real, registrarUsuario: vi.fn() }
})

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const real = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...real, useNavigate: () => navigateMock }
})

function renderPantalla() {
  return render(
    <MemoryRouter>
      <PantallaRegistrarse />
    </MemoryRouter>,
  )
}

async function llenarFormularioValido() {
  await userEvent.type(screen.getByLabelText('Nombre'), 'Ana')
  await userEvent.type(screen.getByLabelText('Apellido paterno'), 'García')
  await userEvent.type(screen.getByLabelText('Apellido materno'), 'López')
  await userEvent.selectOptions(screen.getByLabelText('Nivel de estudios'), 'Licenciatura')
  await userEvent.type(screen.getByLabelText('Institución educativa'), 'UNAM')
  await userEvent.type(screen.getByLabelText('Correo'), 'ana@example.com')
  await userEvent.type(screen.getByLabelText('Contraseña'), 'clave1234')
  await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'clave1234')
}

describe('PantallaRegistrarse', () => {
  beforeEach(() => {
    vi.mocked(registrarUsuario).mockReset()
    navigateMock.mockReset()
  })

  it('expone los ocho campos de datos requeridos', () => {
    renderPantalla()

    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
    expect(screen.getByLabelText('Apellido paterno')).toBeInTheDocument()
    expect(screen.getByLabelText('Apellido materno')).toBeInTheDocument()
    expect(screen.getByLabelText('Nivel de estudios')).toBeInTheDocument()
    expect(screen.getByLabelText('Institución educativa')).toBeInTheDocument()
    expect(screen.getByLabelText('Correo')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument()
  })

  it('bloquea el envío del formulario vacío', async () => {
    renderPantalla()

    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findAllByText('Este campo es obligatorio.')).not.toHaveLength(0)
    expect(registrarUsuario).not.toHaveBeenCalled()
  })

  it('marca error cuando las contraseñas no coinciden', async () => {
    renderPantalla()

    await userEvent.type(screen.getByLabelText('Contraseña'), 'clave1234')
    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'otraClave')
    await userEvent.tab()

    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument()
  })

  it('revalida la confirmación cuando la contraseña cambia después', async () => {
    renderPantalla()

    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'clave1234')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'clave1234')

    expect(screen.queryByText('Las contraseñas no coinciden.')).not.toBeInTheDocument()
  })

  it('envía los datos de registro (sin la confirmación) y navega al inicio', async () => {
    vi.mocked(registrarUsuario).mockResolvedValueOnce(undefined)
    renderPantalla()

    await llenarFormularioValido()
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    await waitFor(() =>
      expect(registrarUsuario).toHaveBeenCalledWith({
        nombre: 'Ana',
        apellidoPaterno: 'García',
        apellidoMaterno: 'López',
        nivelEstudios: 'Licenciatura',
        institucionEducativa: 'UNAM',
        correo: 'ana@example.com',
        contrasena: 'clave1234',
      }),
    )
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/'))
  })

  it('muestra un aviso cuando el correo ya está registrado', async () => {
    vi.mocked(registrarUsuario).mockRejectedValueOnce(
      new ErrorCuenta('Ya existe una cuenta con este correo.'),
    )
    renderPantalla()

    await llenarFormularioValido()
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya existe una cuenta con este correo.',
    )
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
