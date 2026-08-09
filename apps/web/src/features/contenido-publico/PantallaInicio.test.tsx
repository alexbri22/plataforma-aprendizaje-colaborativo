import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PantallaInicio } from './PantallaInicio'

function renderPantallaInicio() {
  return render(
    <MemoryRouter>
      <PantallaInicio />
    </MemoryRouter>,
  )
}

describe('PantallaInicio', () => {
  it('expone las acciones de cuenta y el contenido público sin sesión', () => {
    renderPantallaInicio()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Conecta. Colabora. Construye.' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ingresar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Registrarse' })).toBeInTheDocument()
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

  it('enlaza las acciones de cuenta a sus pantallas', () => {
    renderPantallaInicio()

    expect(screen.getByRole('link', { name: 'Registrarse' })).toHaveAttribute(
      'href',
      '/registrarse',
    )
    expect(screen.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/ingresar')
  })
})
