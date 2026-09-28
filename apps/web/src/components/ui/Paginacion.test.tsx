import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Paginacion } from './Paginacion'
import { rebanar } from './rebanar'

const renderizar = (props: Partial<Parameters<typeof Paginacion>[0]> = {}) => {
  const onCambiar = vi.fn()
  render(
    <MemoryRouter>
      <Paginacion
        total={25}
        tamano={10}
        pagina={0}
        onCambiar={onCambiar}
        etiqueta="Personas"
        {...props}
      />
    </MemoryRouter>,
  )
  return onCambiar
}

describe('Paginacion', () => {
  it('muestra el rango y deshabilita Anterior en la primera página', () => {
    renderizar()
    expect(screen.getByText('1–10 de 25')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Personas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled()
  })

  it('en la última página recorta el rango y deshabilita Siguiente', () => {
    renderizar({ pagina: 2 })
    expect(screen.getByText('21–25 de 25')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
  })

  it('avisa la página a la que se quiere ir', async () => {
    const onCambiar = renderizar({ pagina: 1 })
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await userEvent.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(onCambiar).toHaveBeenNthCalledWith(1, 2)
    expect(onCambiar).toHaveBeenNthCalledWith(2, 0)
  })

  it('no se pinta si todo cabe en una página', () => {
    renderizar({ total: 10 })
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})

describe('rebanar', () => {
  const lista = Array.from({ length: 25 }, (_, i) => i + 1)

  it('devuelve la página pedida', () => {
    expect(rebanar(lista, 1, 10)).toEqual({ visibles: lista.slice(10, 20), pagina: 1 })
  })

  it('si la página ya no existe, muestra la última en vez de una vacía', () => {
    expect(rebanar(lista.slice(0, 12), 2, 10)).toEqual({ visibles: [11, 12], pagina: 1 })
    expect(rebanar([], 3, 10)).toEqual({ visibles: [], pagina: 0 })
  })
})
