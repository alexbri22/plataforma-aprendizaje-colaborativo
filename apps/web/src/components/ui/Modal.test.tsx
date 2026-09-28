import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

function renderModal(props: Partial<Parameters<typeof Modal>[0]> = {}) {
  const onCerrar = props.onCerrar ?? vi.fn()
  render(
    <Modal abierto titulo="Título del diálogo" onCerrar={onCerrar} {...props}>
      <button type="button">Interno</button>
    </Modal>,
  )
  return { onCerrar }
}

describe('Modal', () => {
  it('expone un diálogo modal con nombre accesible', () => {
    renderModal()
    const dialogo = screen.getByRole('dialog')
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    expect(dialogo).toHaveAccessibleName('Título del diálogo')
  })

  it('no renderiza nada cuando está cerrado', () => {
    render(
      <Modal abierto={false} titulo="Cerrado" onCerrar={vi.fn()}>
        <p>Contenido</p>
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('mueve el foco al primer elemento enfocable al abrir', async () => {
    renderModal()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Interno' })).toHaveFocus())
  })

  it('cierra con la tecla Escape', async () => {
    const { onCerrar } = renderModal()
    await userEvent.keyboard('{Escape}')
    expect(onCerrar).toHaveBeenCalledTimes(1)
  })

  it('cierra al hacer clic en el fondo, no al hacer clic dentro', () => {
    const { onCerrar } = renderModal()
    const dialogo = screen.getByRole('dialog')

    fireEvent.mouseDown(dialogo)
    expect(onCerrar).not.toHaveBeenCalled()

    fireEvent.mouseDown(dialogo.parentElement as HTMLElement)
    expect(onCerrar).toHaveBeenCalledTimes(1)
  })
})
