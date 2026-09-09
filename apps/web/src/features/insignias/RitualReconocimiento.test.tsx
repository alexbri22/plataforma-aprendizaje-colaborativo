import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RitualReconocimiento, type IntegranteEquipo } from './RitualReconocimiento'

// Seis integrantes en total: cinco compañeros más quien reconoce. El 33 % de
// seis, sin contarse y redondeado hacia arriba, son dos compañeros.
const COMPANEROS: IntegranteEquipo[] = [
  { id: 'm-2', nombre: 'Andrea' },
  { id: 'm-3', nombre: 'Bruno' },
  { id: 'm-4', nombre: 'Camila' },
  { id: 'm-5', nombre: 'Diego' },
  { id: 'm-6', nombre: 'Elena' },
]

const CIERRE = new Date(2026, 10, 14)

function montar(onGuardar = vi.fn()) {
  const usuario = userEvent.setup()
  render(
    <RitualReconocimiento companeros={COMPANEROS} fechaLimite={CIERRE} onGuardar={onGuardar} />,
  )
  return { usuario, onGuardar }
}

describe('RitualReconocimiento', () => {
  it('deriva el presupuesto del tamaño del equipo, sin recibirlo por props', () => {
    montar()

    expect(screen.getByText('Puedes reconocer a 2 compañeros más, de 2')).toBeInTheDocument()
  })

  it('descuenta del presupuesto al reconocer y lo devuelve al quitar', async () => {
    const { usuario } = montar()

    await usuario.click(screen.getAllByRole('button', { name: 'Reconocer' })[0])
    await usuario.click(screen.getByRole('checkbox', { name: /Liderazgo/ }))
    await usuario.click(screen.getByRole('button', { name: /Reconocer a Andrea/ }))

    expect(screen.getByText('Puedes reconocer a 1 compañero más, de 2')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Quitar' }))
    expect(screen.getByText('Puedes reconocer a 2 compañeros más, de 2')).toBeInTheDocument()
  })

  it('impide elegir a más compañeros de los que el presupuesto permite', async () => {
    const { usuario } = montar()

    for (const indice of [0, 1]) {
      await usuario.click(screen.getAllByRole('button', { name: 'Reconocer' })[indice])
      await usuario.click(screen.getByRole('checkbox', { name: /Liderazgo/ }))
      await usuario.click(screen.getByRole('button', { name: /^Reconocer a / }))
    }

    expect(screen.getByText('Ya elegiste a tus 2 compañeros')).toBeInTheDocument()
    // Los tres que quedan sin reconocer ya no son alcanzables.
    for (const boton of screen.getAllByRole('button', { name: 'Reconocer' }).slice(2)) {
      expect(boton).toBeDisabled()
    }
  })

  it('no deja dar dos veces la misma insignia a la misma persona', async () => {
    const { usuario } = montar()

    await usuario.click(screen.getAllByRole('button', { name: 'Reconocer' })[0])
    await usuario.click(screen.getByRole('checkbox', { name: /Liderazgo/ }))
    await usuario.click(screen.getByRole('button', { name: /Reconocer a Andrea/ }))

    await usuario.click(screen.getAllByRole('button', { name: 'Reconocer' })[0])
    expect(screen.getByRole('checkbox', { name: /Liderazgo/ })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: /Compañerismo/ })).toBeEnabled()
  })

  it('permite varias insignias a la misma persona, cada una con su frase', async () => {
    const { usuario, onGuardar } = montar()

    await usuario.click(screen.getAllByRole('button', { name: 'Reconocer' })[0])
    await usuario.click(screen.getByRole('checkbox', { name: /Liderazgo/ }))
    await usuario.click(screen.getByRole('checkbox', { name: /Ideas/ }))

    // Una frase por insignia: la de una categoría no describe a la otra.
    expect(screen.getByLabelText('Por qué — Liderazgo')).toBeInTheDocument()
    expect(screen.getByLabelText('Por qué — Ideas')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: /Reconocer a Andrea con 2 insignias/ }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar reconocimientos' }))

    const [enviados] = onGuardar.mock.calls[0] as [
      { categoria: string; integranteId: string; frase: string }[],
    ]
    expect(enviados.map((r) => r.categoria)).toEqual(['liderazgo', 'ideas'])
    expect(enviados.every((r) => r.integranteId === 'm-2')).toBe(true)
    expect(new Set(enviados.map((r) => r.frase)).size).toBe(2)
  })

  it('no limita cuántas insignias recibe una misma persona', async () => {
    const { usuario, onGuardar } = montar()

    // El presupuesto de dos es de personas, no de insignias: a la primera se le
    // pueden dar las seis sin gastar el turno de la segunda.
    await usuario.click(screen.getAllByRole('button', { name: 'Reconocer' })[0])
    for (const casilla of screen.getAllByRole('checkbox')) {
      await usuario.click(casilla)
    }
    await usuario.click(screen.getByRole('button', { name: /con 6 insignias/ }))

    expect(screen.getByText('Puedes reconocer a 1 compañero más, de 2')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Guardar reconocimientos' }))
    const [enviados] = onGuardar.mock.calls[0] as [{ integranteId: string }[]]
    expect(enviados).toHaveLength(6)
  })

  it('deja seguir agregando insignias a alguien ya reconocido, aun sin presupuesto', async () => {
    const { usuario } = montar()

    for (const indice of [0, 1]) {
      await usuario.click(screen.getAllByRole('button', { name: 'Reconocer' })[indice])
      await usuario.click(screen.getByRole('checkbox', { name: /Liderazgo/ }))
      await usuario.click(screen.getByRole('button', { name: /^Reconocer a / }))
    }

    const botones = screen.getAllByRole('button', { name: 'Reconocer' })
    // Las dos primeras personas ya son suyas: puede seguir sumándoles insignias.
    expect(botones[0]).toBeEnabled()
    expect(botones[1]).toBeEnabled()
    // La tercera exigiría un turno que ya no tiene.
    expect(botones[2]).toBeDisabled()
  })

  it('acompaña cada reconocimiento con una frase, prellenada por omisión', async () => {
    const { usuario, onGuardar } = montar()

    await usuario.click(screen.getAllByRole('button', { name: 'Reconocer' })[0])
    await usuario.click(screen.getByRole('checkbox', { name: /Liderazgo/ }))
    await usuario.click(screen.getByRole('button', { name: /Reconocer a Andrea/ }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar reconocimientos' }))

    expect(onGuardar).toHaveBeenCalledTimes(1)
    const [enviados] = onGuardar.mock.calls[0] as [{ frase: string; integranteId: string }[]]
    expect(enviados).toHaveLength(1)
    expect(enviados[0].integranteId).toBe('m-2')
    expect(enviados[0].frase).not.toBe('')
  })

  it('exige texto cuando se elige escribir la frase propia', async () => {
    const { usuario } = montar()

    await usuario.click(screen.getAllByRole('button', { name: 'Reconocer' })[0])
    await usuario.click(screen.getByRole('checkbox', { name: /Liderazgo/ }))
    await usuario.selectOptions(screen.getByLabelText('Por qué — Liderazgo'), 'propia')

    expect(screen.getByRole('button', { name: /Reconocer a Andrea/ })).toBeDisabled()

    await usuario.type(screen.getByLabelText('Tu frase — Liderazgo'), 'Nos sacó del atasco')
    expect(screen.getByRole('button', { name: /Reconocer a Andrea/ })).toBeEnabled()
  })

  it('no permite guardar sin haber repartido nada', () => {
    montar()

    expect(screen.getByRole('button', { name: 'Guardar reconocimientos' })).toBeDisabled()
  })

  it('dice desde cuándo se aplican y hasta cuándo se pueden cambiar', () => {
    // "Guardar" sin fecha no promete nada: el valor del cambio está en decir
    // que todavía se puede volver.
    montar()

    expect(screen.getByText(/Se aplican el 14 de noviembre/)).toBeInTheDocument()
  })

  it('avisa desde el principio que el reconocimiento llega sin autoría', () => {
    // El anonimato entre pares cambia lo que la gente se atreve a escribir, así
    // que decirlo después de enviar llegaría tarde.
    montar()

    expect(screen.getByText(/no quién se la dio/i)).toBeInTheDocument()
  })
})
