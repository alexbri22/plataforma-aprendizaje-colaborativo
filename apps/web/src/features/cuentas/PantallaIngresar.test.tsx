import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PantallaIngresar } from './PantallaIngresar'
import { ErrorCuenta, iniciarSesion } from './api'

vi.mock('./api', async () => {
  const real = await vi.importActual<typeof import('./api')>('./api')
  return { ...real, iniciarSesion: vi.fn() }
})

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const real = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...real, useNavigate: () => navigateMock }
})

function renderPantalla() {
  return render(
    <MemoryRouter>
      <PantallaIngresar />
    </MemoryRouter>,
  )
}

describe('PantallaIngresar', () => {
  beforeEach(() => {
    vi.mocked(iniciarSesion).mockReset()
    navigateMock.mockReset()
  })

  it('bloquea el envío y marca los campos obligatorios vacíos', async () => {
    renderPantalla()

    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findAllByText('Este campo es obligatorio.')).toHaveLength(2)
    expect(screen.getByLabelText('Correo')).toHaveFocus()
    expect(iniciarSesion).not.toHaveBeenCalled()
  })

  it('valida el formato de correo al salir del campo', async () => {
    renderPantalla()

    await userEvent.type(screen.getByLabelText('Correo'), 'no-es-un-correo')
    await userEvent.tab()

    expect(await screen.findByText('Ingresa un correo válido.')).toBeInTheDocument()
  })

  it('alterna la visibilidad de la contraseña', async () => {
    renderPantalla()

    const campo = screen.getByLabelText('Contraseña')
    expect(campo).toHaveAttribute('type', 'password')

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(campo).toHaveAttribute('type', 'text')

    await userEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(campo).toHaveAttribute('type', 'password')
  })

  it('envía las credenciales y navega al inicio tras un ingreso exitoso', async () => {
    vi.mocked(iniciarSesion).mockResolvedValueOnce(undefined)
    renderPantalla()

    await userEvent.type(screen.getByLabelText('Correo'), 'ana@example.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'clave1234')
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    await waitFor(() =>
      expect(iniciarSesion).toHaveBeenCalledWith({
        correo: 'ana@example.com',
        contrasena: 'clave1234',
      }),
    )
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/'))
  })

  it('muestra un aviso cuando el servidor rechaza las credenciales', async () => {
    vi.mocked(iniciarSesion).mockRejectedValueOnce(
      new ErrorCuenta('Correo o contraseña incorrectos.'),
    )
    renderPantalla()

    await userEvent.type(screen.getByLabelText('Correo'), 'ana@example.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'clave1234')
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.')
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
