import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('dispara onClick al hacer clic', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Continuar</Button>)

    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('no dispara onClick cuando está disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} disabled>
        Continuar
      </Button>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(onClick).not.toHaveBeenCalled()
  })
})
