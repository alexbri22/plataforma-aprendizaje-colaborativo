import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RitualReconocimiento, type IntegranteEquipo } from './RitualReconocimiento'

// Seis integrantes en total: cinco compañeros más quien reconoce. El 33 % de
// seis, sin contarse y redondeado hacia arriba, son dos reconocimientos.
const COMPANEROS: IntegranteEquipo[] = [
  { id: 'm-2', nombre: 'Andrea' },
  { id: 'm-3', nombre: 'Bruno' },
  { id: 'm-4', nombre: 'Camila' },
  { id: 'm-5', nombre: 'Diego' },
  { id: 'm-6', nombre: 'Elena' },
]

function montar(onEnviar = vi.fn()) {
  const usuario = userEvent.setup()
  render(<RitualReconocimiento companeros={COMPANEROS} onEnviar={onEnviar} />)
  return { usuario, onEnviar }
}

describe('RitualReconocimiento', () => {
  it('deriva el presupuesto del tamaño del equipo, sin recibirlo por props', () => {
    montar()

    expect(screen.getByText('Te quedan 2 de 2 reconocimientos')).toBeInTheDocument()
  })

  it('descuenta del presupuesto al reconocer y lo devuelve al quitar', async () => {
    const { usuario } = montar()

    await usuario.click(screen.getAllByRole('button', { name: 'Reconocer' })[0])
    await usuario.click(screen.getByRole('button', { name: /Reconocer a Andrea/ }))

    expect(screen.getByText('Te quedan 1 de 2 reconocimientos')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Quitar' }))
    expect(screen.getByText('Te quedan 2 de 2 reconocimientos')).toBeInTheDocument()
  })

  it('impide repartir más de lo que el presupuesto permite', async () => {
    const { usuario } = montar()

    for (const indice of [0, 1]) {
      await usuario.click(screen.getAllByRole('button', { name: 'Reconocer' })[indice])
      await usuario.click(screen.getByRole('button', { name: /^Reconocer a / }))
    }

    expect(screen.getByText('Repartiste los 2 reconocimientos')).toBeInTheDocument()
    for (const boton of screen.getAllByRole('button', { name: 'Reconocer' })) {
      expect(boton).toBeDisabled()
    }
  })

  it('no deja dar dos veces la misma insignia a la misma persona', async () => {
    const { usuario } = montar()

    await usuario.click(screen.getAllByRole('button', { name: 'Reconocer' })[0])
    const primera = screen.getByRole('radio', { name: /Liderazgo/ })
    await usuario.click(primera)
    await usuario.click(screen.getByRole('button', { name: /Reconocer a Andrea/ }))

    await usuario.click(screen.getAllByRole('button', { name: 'Reconocer' })[0])
    expect(screen.getByRole('radio', { name: /Liderazgo/ })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /Compañerismo/ })).toBeEnabled()
  })

  it('acompaña cada reconocimiento con una frase, prellenada por omisión', async () => {
    const { usuario, onEnviar } = montar()

    await usuario.click(screen.getAllByRole('button', { name: 'Reconocer' })[0])
    await usuario.click(screen.getByRole('button', { name: /Reconocer a Andrea/ }))
    await usuario.click(screen.getByRole('button', { name: 'Enviar reconocimientos' }))

    expect(onEnviar).toHaveBeenCalledTimes(1)
    const [enviados] = onEnviar.mock.calls[0] as [{ frase: string; integranteId: string }[]]
    expect(enviados).toHaveLength(1)
    expect(enviados[0].integranteId).toBe('m-2')
    expect(enviados[0].frase).not.toBe('')
  })

  it('exige texto cuando se elige escribir la frase propia', async () => {
    const { usuario } = montar()

    await usuario.click(screen.getAllByRole('button', { name: 'Reconocer' })[0])
    await usuario.selectOptions(screen.getByLabelText('Por qué'), 'propia')

    expect(screen.getByRole('button', { name: /Reconocer a Andrea/ })).toBeDisabled()

    await usuario.type(screen.getByLabelText('Tu frase'), 'Nos sacó del atasco')
    expect(screen.getByRole('button', { name: /Reconocer a Andrea/ })).toBeEnabled()
  })

  it('no permite enviar sin haber repartido nada', () => {
    montar()

    expect(screen.getByRole('button', { name: 'Enviar reconocimientos' })).toBeDisabled()
  })

  it('avisa desde el principio que el reconocimiento llega sin autoría', () => {
    // El anonimato entre pares cambia lo que la gente se atreve a escribir, así
    // que decirlo después de enviar llegaría tarde.
    montar()

    expect(screen.getByText(/no quién se la dio/i)).toBeInTheDocument()
  })
})
