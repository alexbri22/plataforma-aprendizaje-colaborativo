import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PantallaInicio } from './PantallaInicio'

describe('PantallaInicio', () => {
  it('expone las acciones de cuenta y el contenido público sin sesión', () => {
    render(<PantallaInicio />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Conecta. Colabora. Construye.' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrarse' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Insignias' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recursos' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Características de Co3' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Aprender colaborando' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Ver más/ })).toHaveLength(2)
  })
})
