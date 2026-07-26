import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PantallaInicio } from './PantallaInicio'

describe('PantallaInicio', () => {
  it('expone las acciones de cuenta y el contenido público sin sesión', () => {
    render(<PantallaInicio />)

    expect(screen.getByRole('heading', { level: 1, name: 'Qué es Co3' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrarse' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Insignias' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recursos' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Características de Co3' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Aprender colaborando' })).toBeInTheDocument()
  })

  it('atribuye la ilustración del hero según lo exige su licencia', () => {
    render(<PantallaInicio />)

    const credito = screen.getByRole('link', { name: /pch\.vector/i })
    expect(credito).toBeInTheDocument()
    expect(credito).toHaveAttribute('href', 'https://www.magnific.com')
  })

  it('abre el centro de formación desde Recursos y permite volver al inicio', async () => {
    const user = userEvent.setup()
    render(<PantallaInicio />)

    await user.click(screen.getByRole('button', { name: 'Recursos' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'Mejora la forma en que colaboras' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recursos' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.queryByRole('heading', { level: 1, name: 'Qué es Co3' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ir al inicio de Co3' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Qué es Co3' })).toBeInTheDocument()
  })
})
