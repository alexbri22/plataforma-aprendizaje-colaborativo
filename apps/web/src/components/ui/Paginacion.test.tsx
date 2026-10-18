import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Paginacion } from './Paginacion'
import { paginasVisibles } from './paginasVisibles'

describe('paginasVisibles', () => {
  it('muestra todas cuando son pocas', () => {
    expect(paginasVisibles(1, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('resume con huecos y conserva primera, última y vecinas', () => {
    expect(paginasVisibles(5, 10)).toEqual([1, 'hueco', 4, 5, 6, 'hueco', 10])
    expect(paginasVisibles(1, 10)).toEqual([1, 2, 'hueco', 10])
    // Un hueco de una sola página se muestra como número, no como "…".
    expect(paginasVisibles(4, 10)).toEqual([1, 2, 3, 4, 5, 'hueco', 10])
  })
})

describe('Paginacion', () => {
  it('no se muestra con una sola página', () => {
    const { container } = render(<Paginacion pagina={1} totalPaginas={1} onCambiar={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('marca la página actual y avisa el cambio', async () => {
    const user = userEvent.setup()
    const onCambiar = vi.fn()
    render(<Paginacion pagina={1} totalPaginas={3} onCambiar={onCambiar} />)

    expect(screen.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: /Anterior/ })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /Siguiente/ }))
    await user.click(screen.getByRole('button', { name: 'Página 3' }))
    expect(onCambiar.mock.calls).toEqual([[2], [3]])
  })
})
