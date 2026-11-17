import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CampoPeso } from './CampoPeso'
import { guardarPeso } from './ponderacion.api'

vi.mock('./ponderacion.api', async () => {
  const real = await vi.importActual<typeof import('./ponderacion.api')>('./ponderacion.api')
  return { ...real, guardarPeso: vi.fn() }
})

function renderCampo() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <CampoPeso
        idActividad="act-1"
        parte="aspecto"
        id="a1"
        nombre="Metas"
        peso={20}
        apagado={false}
        puedeEditar
      />
    </QueryClientProvider>,
  )
}

describe('CampoPeso', () => {
  beforeEach(() => {
    vi.mocked(guardarPeso).mockReset()
  })

  it('Enter guarda una sola vez, aunque después se salga del campo', async () => {
    const usuario = userEvent.setup()
    vi.mocked(guardarPeso).mockResolvedValue({ componentes: [] })
    renderCampo()

    const campo = screen.getByLabelText('Porcentaje de Metas')
    await usuario.clear(campo)
    await usuario.type(campo, '35{Enter}')
    await usuario.tab()

    await waitFor(() => expect(guardarPeso).toHaveBeenCalledTimes(1))
    expect(guardarPeso).toHaveBeenCalledWith('act-1', 'aspecto', 'a1', 35)
  })

  it('mientras guarda no se puede editar, para no perder lo que se escriba', async () => {
    const usuario = userEvent.setup()
    vi.mocked(guardarPeso).mockReturnValue(new Promise(() => undefined))
    renderCampo()

    const campo = screen.getByLabelText('Porcentaje de Metas')
    await usuario.clear(campo)
    await usuario.type(campo, '35{Enter}')

    await waitFor(() => expect(campo).toBeDisabled())
  })
})
