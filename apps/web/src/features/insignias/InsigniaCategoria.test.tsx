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

  it('pinta el emblema de la categoría en el nivel derivado de los puntos', () => {
    const { container, rerender } = render(<InsigniaCategoria categoria="compromiso" puntos={8} />)
    // La primera imagen es el marco, que MarcoRango dibuja antes; la segunda es
    // el emblema. Afirmar sobre la primera dejaría pasar que el emblema pida el
    // nivel equivocado o caiga al vectorial, porque el marco acierta igual.
    const emblema = () => container.querySelectorAll('img')[1]

    expect(emblema()?.getAttribute('src')).toContain('compromiso_plata')

    rerender(<InsigniaCategoria categoria="compromiso" puntos={60} />)
    expect(emblema()?.getAttribute('src')).toContain('compromiso_diamante')
  })

  it('nunca muestra arte de un rango en una categoría sin nivel', () => {
    // Sin nivel no se dibuja ninguna imagen: el marco cede al hueco punteado y
    // el emblema al vectorial. Lo que no puede pasar es que una categoría en
    // cero se lea como si tuviera un rango ganado.
    const { container } = render(<InsigniaCategoria categoria="compromiso" puntos={0} />)
    const fuentes = [...container.querySelectorAll('img')].map((i) => i.getAttribute('src') ?? '')

    for (const nivel of ['bronce', 'plata', 'oro', 'platino', 'diamante']) {
      expect(fuentes.some((src) => src.includes(nivel))).toBe(false)
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
