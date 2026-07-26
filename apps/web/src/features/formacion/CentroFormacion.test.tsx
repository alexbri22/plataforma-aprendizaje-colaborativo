import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CentroFormacion } from './CentroFormacion'

describe('CentroFormacion', () => {
  it('presenta cursos de formación colaborativa sin elementos de otras áreas', () => {
    render(<CentroFormacion />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Mejora la forma en que colaboras' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Comunicación y confianza' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Aprende a tu ritmo' })).toBeInTheDocument()
    expect(screen.queryByText(/insignia/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/desempeño del grupo/i)).not.toBeInTheDocument()
  })

  it('filtra el catálogo por habilidad y por búsqueda', async () => {
    const user = userEvent.setup()
    render(<CentroFormacion />)

    await user.click(screen.getByRole('button', { name: 'Decisiones' }))

    const catalogo = screen.getByRole('region', { name: 'Aprende a tu ritmo' })
    expect(within(catalogo).getByRole('heading', { name: 'Resolver desacuerdos con respeto' })).toBeVisible()
    expect(
      within(catalogo).queryByRole('heading', { name: 'Comunicación clara en equipos' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Todos' }))
    await user.type(screen.getByRole('searchbox', { name: 'Buscar en el catálogo' }), 'retrospectiva')

    expect(within(catalogo).getByRole('heading', { name: 'Retrospectivas para mejorar' })).toBeVisible()
    expect(
      within(catalogo).queryByRole('heading', { name: 'Escucha activa y preguntas útiles' }),
    ).not.toBeInTheDocument()
  })
})
