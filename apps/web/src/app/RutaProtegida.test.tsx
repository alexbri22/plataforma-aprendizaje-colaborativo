import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Usuario } from '../features/cuentas'
import { RutaProtegida } from './RutaProtegida'

function PantallaIngresoDePrueba() {
  const location = useLocation()
  const desde = (location.state as { desde?: string } | null)?.desde
  return <p>Pantalla de ingreso{desde ? ` — desde ${desde}` : ''}</p>
}

const useSesionMock = vi.fn()
vi.mock('../features/cuentas', async () => {
  const real = await vi.importActual<typeof import('../features/cuentas')>('../features/cuentas')
  return { ...real, useSesion: () => useSesionMock() }
})

const USUARIO_PRUEBA: Usuario = {
  idUsuario: 'u1',
  nombre: 'Ana',
  apellidoPaterno: 'García',
  apellidoMaterno: 'López',
  correo: 'ana@example.com',
  tipoCuenta: 'usuario',
}

function renderRuta() {
  return render(
    <MemoryRouter initialEntries={['/protegida']}>
      <Routes>
        <Route
          path="/protegida"
          element={
            <RutaProtegida>
              <p>Contenido protegido</p>
            </RutaProtegida>
          }
        />
        <Route path="/ingresar" element={<PantallaIngresoDePrueba />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RutaProtegida', () => {
  it('muestra un indicador de carga mientras se verifica la sesión', () => {
    useSesionMock.mockReturnValue({ usuario: null, cargando: true })
    renderRuta()

    expect(screen.getByRole('status', { name: 'Verificando sesión' })).toBeInTheDocument()
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })

  it('redirige a /ingresar conservando el destino cuando no hay sesión', () => {
    useSesionMock.mockReturnValue({ usuario: null, cargando: false })
    renderRuta()

    expect(screen.getByText('Pantalla de ingreso — desde /protegida')).toBeInTheDocument()
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })

  it('muestra el contenido cuando hay una sesión activa', () => {
    useSesionMock.mockReturnValue({ usuario: USUARIO_PRUEBA, cargando: false })
    renderRuta()

    expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
  })
})
