import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorPerfil, cambiarContrasena } from '../cuentas/api'
import { FormularioContrasena } from './FormularioContrasena'

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  return { ...real, cambiarContrasena: vi.fn() }
})

function montar() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const usuario = userEvent.setup()
  render(
    <QueryClientProvider client={queryClient}>
      <FormularioContrasena />
    </QueryClientProvider>,
  )
  return { usuario }
}

async function llenar(
  usuario: ReturnType<typeof userEvent.setup>,
  actual: string,
  nueva: string,
  confirmacion = nueva,
) {
  if (actual) await usuario.type(screen.getByLabelText('Contraseña actual'), actual)
  if (nueva) await usuario.type(screen.getByLabelText('Contraseña nueva'), nueva)
  if (confirmacion) {
    await usuario.type(screen.getByLabelText('Confirmar contraseña nueva'), confirmacion)
  }
  await usuario.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
}

describe('FormularioContrasena', () => {
  beforeEach(() => {
    vi.mocked(cambiarContrasena).mockReset()
  })

  it('exige la contraseña actual', async () => {
    const { usuario } = montar()

    await llenar(usuario, '', 'otra-contrasena-larga')

    expect(screen.getByText('Escribe tu contraseña actual.')).toBeInTheDocument()
    expect(cambiarContrasena).not.toHaveBeenCalled()
  })

  it('exige confirmación coincidente y que la nueva sea distinta de la actual', async () => {
    const { usuario } = montar()

    await llenar(usuario, 'contrasena-larga', 'contrasena-larga', 'no-coincide')

    expect(
      screen.getByText('La contraseña nueva debe ser distinta de la actual.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument()
    expect(cambiarContrasena).not.toHaveBeenCalled()
  })

  it('muestra el error por campo que devuelve el servidor', async () => {
    vi.mocked(cambiarContrasena).mockRejectedValue(
      new ErrorPerfil('La petición no es válida.', {
        contrasenaActual: 'La contraseña actual no es correcta.',
      }),
    )
    const { usuario } = montar()

    await llenar(usuario, 'equivocada', 'otra-contrasena-larga')

    expect(await screen.findByText('La contraseña actual no es correcta.')).toBeInTheDocument()
  })

  it('al completarse vacía los campos y lo confirma', async () => {
    vi.mocked(cambiarContrasena).mockResolvedValue(undefined)
    const { usuario } = montar()

    await llenar(usuario, 'contrasena-larga', 'otra-contrasena-larga')

    expect(cambiarContrasena).toHaveBeenCalledWith({
      contrasenaActual: 'contrasena-larga',
      contrasenaNueva: 'otra-contrasena-larga',
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Contraseña cambiada.')
    expect(screen.getByLabelText('Contraseña actual')).toHaveValue('')
    expect(screen.getByLabelText('Contraseña nueva')).toHaveValue('')
  })
})
