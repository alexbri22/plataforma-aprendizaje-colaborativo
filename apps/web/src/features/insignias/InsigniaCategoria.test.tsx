import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CATEGORIAS_INSIGNIA } from '@plataforma/shared'
import { InsigniaCategoria } from './InsigniaCategoria'
import { VitrinaInsignias } from './VitrinaInsignias'

describe('InsigniaCategoria', () => {
  it('nombra la categoría y el nivel alcanzado', () => {
    render(<InsigniaCategoria categoria="liderazgo" puntos={20} />)

    expect(screen.getByRole('figure', { name: 'Liderazgo, nivel Oro' })).toBeInTheDocument()
  })

  it('anuncia la categoría sin nivel cuando no llega al primer umbral', () => {
    render(<InsigniaCategoria categoria="ideas" puntos={2} />)

    expect(screen.getByRole('figure', { name: 'Ideas, sin nivel todavía' })).toBeInTheDocument()
  })

  it('pinta el arte del nivel derivado de los puntos', () => {
    const { container, rerender } = render(<InsigniaCategoria categoria="compromiso" puntos={8} />)
    const imagen = () => container.querySelector('img')

    expect(imagen()?.getAttribute('src')).toContain('plata')

    rerender(<InsigniaCategoria categoria="compromiso" puntos={60} />)
    expect(imagen()?.getAttribute('src')).toContain('diamante')
  })

  it('nunca muestra arte de un rango en una categoría sin nivel', () => {
    // Vale igual con el respaldo provisional, que no dibuja marco, que con el
    // arte definitivo, que dibuja el PNG de sin-rango: lo que no puede pasar es
    // que una categoría en cero se lea como si tuviera un rango ganado.
    const { container } = render(<InsigniaCategoria categoria="compromiso" puntos={0} />)
    const src = container.querySelector('img')?.getAttribute('src') ?? ''

    for (const nivel of ['bronce', 'plata', 'oro', 'platino', 'diamante']) {
      expect(src).not.toContain(nivel)
    }
  })

  it('la imagen es decorativa: no aporta nombre accesible propio', () => {
    const { container } = render(<InsigniaCategoria categoria="comunicacion" puntos={18} />)

    expect(container.querySelector('img')).toHaveAttribute('alt', '')
  })

  it('muestra el nivel en texto visible cuando se pide etiqueta', () => {
    render(<InsigniaCategoria categoria="companerismo" puntos={35} mostrarEtiqueta />)

    expect(screen.getByText('Compañerismo')).toBeVisible()
    expect(screen.getByText('Platino')).toBeVisible()
  })
})

describe('VitrinaInsignias', () => {
  it('muestra las seis categorías aunque falten puntos de algunas', () => {
    render(<VitrinaInsignias puntos={{ liderazgo: 10 }} />)

    expect(screen.getAllByRole('figure')).toHaveLength(CATEGORIAS_INSIGNIA.length)
  })

  it('trata una categoría ausente como cero, no como error', () => {
    render(<VitrinaInsignias puntos={{ liderazgo: 10 }} />)

    const vitrina = screen.getByRole('list')
    expect(within(vitrina).getByRole('figure', { name: /Liderazgo, nivel Plata/ })).toBeVisible()
    expect(within(vitrina).getByRole('figure', { name: /Ideas, sin nivel/ })).toBeVisible()
  })
})
