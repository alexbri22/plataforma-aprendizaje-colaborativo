import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { analizarBloques } from './analizarMarkdown'
import { Markdown } from './Markdown'

describe('analizarBloques', () => {
  it('reconoce encabezados, listas, citas, tablas y párrafos', () => {
    const bloques = analizarBloques(
      '## Título\n\nUna línea\ncontinuada.\n\n- uno\n- dos\n\n1. a\n2. b\n\n> cita\n\n| A | B |\n| --- | --- |\n| 1 | 2 |',
    )
    expect(bloques.map((b) => b.tipo)).toEqual([
      'encabezado',
      'parrafo',
      'lista',
      'lista',
      'cita',
      'tabla',
    ])
    expect(bloques[1]).toEqual({ tipo: 'parrafo', texto: 'Una línea continuada.' })
    expect(bloques[5]).toEqual({ tipo: 'tabla', encabezados: ['A', 'B'], filas: [['1', '2']] })
  })
})

describe('Markdown', () => {
  it('baja un nivel los encabezados para no competir con el h1 de la página', () => {
    render(<Markdown fuente={'# Uno\n\n## Dos'} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Uno' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Dos' })).toBeInTheDocument()
  })

  it('nunca interpreta HTML: el marcado se muestra como texto', () => {
    const { container } = render(<Markdown fuente={'<img src=x onerror="alert(1)"> **hola**'} />)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText(/<img src=x/)).toBeInTheDocument()
    expect(screen.getByText('hola').tagName).toBe('STRONG')
  })

  it('solo enlaza direcciones https y las abre aparte', () => {
    render(<Markdown fuente={'[seguro](https://ejemplo.com) y [peligroso](javascript:alert(1))'} />)
    const enlace = screen.getByRole('link', { name: 'seguro' })
    expect(enlace).toHaveAttribute('href', 'https://ejemplo.com')
    expect(enlace).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.queryByRole('link', { name: 'peligroso' })).not.toBeInTheDocument()
    expect(screen.getByText(/peligroso/)).toBeInTheDocument()
  })
})
