import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { renderConProveedores } from '../../pruebas/conProveedores'
import { obtenerActividades } from './actividades.api'
import { EntradaActividades } from './EntradaActividades'
import type { Actividad } from './tipos'

vi.mock('./actividades.api', async () => {
  const real = await vi.importActual<typeof import('./actividades.api')>('./actividades.api')
  return { ...real, obtenerActividades: vi.fn() }
})

function actividad(sobrescribir: Partial<Actividad>): Actividad {
  return {
    id: 'a1',
    nombre: 'Taller',
    objetivo: '',
    fase: 'desarrollo',
    rol: 'participante',
    numParticipantes: 1,
    fechaClave: '',
    nombreOrganizador: 'Ana',
    ...sobrescribir,
  }
}

function montar() {
  return renderConProveedores(
    <Routes>
      <Route path="/actividades" element={<EntradaActividades />} />
      <Route path="/actividades/organizo" element={<p>Organizo</p>} />
      <Route path="/actividades/participo" element={<p>Participo</p>} />
    </Routes>,
    { ruta: '/actividades' },
  )
}

describe('EntradaActividades', () => {
  it('quien organiza algo vigente entra a Organizo', async () => {
    vi.mocked(obtenerActividades).mockResolvedValueOnce([
      actividad({ rol: 'participante' }),
      actividad({ id: 'a2', rol: 'organizador' }),
    ])
    montar()
    expect(await screen.findByText('Organizo')).toBeInTheDocument()
  })

  it('quien solo participa, o solo organizó actividades archivadas, entra a Participo', async () => {
    vi.mocked(obtenerActividades).mockResolvedValueOnce([
      actividad({ rol: 'participante' }),
      actividad({ id: 'a2', rol: 'organizador', fase: 'archivada' }),
    ])
    montar()
    expect(await screen.findByText('Participo')).toBeInTheDocument()
  })

  it('una cuenta nueva, sin actividades, entra a Participo', async () => {
    vi.mocked(obtenerActividades).mockResolvedValueOnce([])
    montar()
    expect(await screen.findByText('Participo')).toBeInTheDocument()
  })
})
