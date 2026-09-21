import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PanelLateral } from './PanelLateral'

function Prueba({ onCerrar = () => {} }: { onCerrar?: () => void }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <button onClick={() => setAbierto(true)}>Abrir</button>
      <PanelLateral
        abierto={abierto}
        titulo="Calendario"
        descripcion="Ajusta las fechas."
        onCerrar={() => {
          onCerrar()
          setAbierto(false)
        }}
      >
        <button>Primero</button>
        <button>Último</button>
      </PanelLateral>
    </>
  )
}

describe('PanelLateral', () => {
  it('no pinta nada mientras está cerrado', () => {
    render(<Prueba />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('al abrir muestra un diálogo modal con su título y descripción, y mueve el foco dentro', async () => {
    render(<Prueba />)

    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))

    const dialogo = screen.getByRole('dialog', { name: 'Calendario' })
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText('Ajusta las fechas.')).toBeInTheDocument()
    expect(dialogo).toHaveFocus()
  })

  it('Esc lo cierra y el foco vuelve al botón que lo abrió', async () => {
    const onCerrar = vi.fn()
    render(<Prueba onCerrar={onCerrar} />)
    const abrir = screen.getByRole('button', { name: 'Abrir' })

    await userEvent.click(abrir)
    await userEvent.keyboard('{Escape}')

    expect(onCerrar).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(abrir).toHaveFocus()
  })

  it('el botón Cerrar y el clic en el fondo también lo cierran', async () => {
    const onCerrar = vi.fn()
    render(<Prueba onCerrar={onCerrar} />)

    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onCerrar).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))
    await userEvent.click(screen.getByRole('dialog').parentElement as HTMLElement)
    expect(onCerrar).toHaveBeenCalledTimes(2)
  })

  it('Tab no sale del panel: del último elemento vuelve al primero', async () => {
    render(<Prueba />)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))

    screen.getByRole('button', { name: 'Último' }).focus()
    await userEvent.tab()

    expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus()
  })

  it('no deja desplazar la página de fondo mientras está abierto', async () => {
    render(<Prueba />)

    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))
    expect(document.body.style.overflow).toBe('hidden')

    await userEvent.keyboard('{Escape}')
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})
