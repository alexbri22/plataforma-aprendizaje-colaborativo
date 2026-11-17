import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { BarraFormato } from './BarraFormato'
import { ACCIONES, aplicarFormato } from './formatoMarkdown'

function accion(id: string) {
  const a = ACCIONES.find((x) => x.id === id)
  if (!a) throw new Error(`Sin acción ${id}`)
  return a.accion
}

describe('aplicarFormato', () => {
  it('envuelve lo seleccionado en negritas', () => {
    expect(aplicarFormato('hola mundo', 5, 10, accion('negritas'))).toEqual({
      valor: 'hola **mundo**',
      inicio: 7,
      fin: 12,
    })
  })

  it('sin selección, deja un texto de ejemplo seleccionado para reemplazarlo', () => {
    const r = aplicarFormato('', 0, 0, accion('enlace'))
    expect(r.valor).toBe('[texto del enlace](https://)')
    expect(r.valor.slice(r.inicio, r.fin)).toBe('texto del enlace')
  })

  it('pone el subtítulo al inicio de la línea del cursor', () => {
    expect(aplicarFormato('uno\ndos', 5, 5, accion('subtitulo')).valor).toBe('uno\n## dos')
  })

  // Revisión del PR: con el cursor en 0 y un texto que empieza con un salto,
  // el prefijo va en la primera línea (la vacía), no en la siguiente.
  it('al inicio de un texto que empieza con un salto, no toca la línea siguiente', () => {
    expect(aplicarFormato('\nHola', 0, 0, accion('subtitulo')).valor).toBe('## \nHola')
    expect(aplicarFormato('\nHola', 0, 0, accion('lista')).valor).toBe('- \nHola')
    expect(aplicarFormato('\nHola', 0, 0, accion('cita')).valor).toBe('> \nHola')
  })

  it('numera cada línea seleccionada, sin tocar la siguiente', () => {
    expect(aplicarFormato('a\nb\nc', 0, 4, accion('numerada')).valor).toBe('1. a\n2. b\nc')
  })

  it('la tabla va en su propio párrafo', () => {
    expect(aplicarFormato('Intro', 5, 5, accion('tabla')).valor).toBe(
      'Intro\n\n| Columna 1 | Columna 2 |\n| --- | --- |\n| Dato | Dato |',
    )
  })
})

function Campo({ inicial }: { inicial: string }) {
  const [valor, setValor] = useState(inicial)
  return (
    <>
      <BarraFormato idCampo="campo" valor={valor} onCambiar={setValor} maxLength={40} />
      <textarea
        id="campo"
        aria-label="Contenido"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
      />
    </>
  )
}

describe('BarraFormato', () => {
  it('aplica el formato a lo seleccionado en el campo', async () => {
    const user = userEvent.setup()
    render(<Campo inicial="Acuerdos claros" />)
    const campo = screen.getByLabelText<HTMLTextAreaElement>('Contenido')
    campo.setSelectionRange(0, 8)

    await user.click(screen.getByRole('button', { name: 'Negritas' }))
    expect(campo).toHaveValue('**Acuerdos** claros')
  })

  it('no pasa del largo máximo', async () => {
    const user = userEvent.setup()
    render(<Campo inicial="x" />)

    await user.click(screen.getByRole('button', { name: 'Tabla' }))
    expect(screen.getByLabelText('Contenido')).toHaveValue('x')
  })
})
