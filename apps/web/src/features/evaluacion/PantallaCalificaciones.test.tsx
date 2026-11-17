import type { CalificacionDeParticipante } from '@plataforma/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerActividad } from '../actividades/actividades.api'
import type { Actividad } from '../actividades'
import type { Usuario } from '../cuentas/api'
import { obtenerCalificaciones } from './calificaciones.api'
import { PantallaCalificaciones } from './PantallaCalificaciones'

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  const usuario: Usuario = {
    idUsuario: 'u1',
    nombre: 'Olga',
    apellidoPaterno: 'Organizadora',
    apellidoMaterno: '',
    correo: 'olga@example.com',
    tipoCuenta: 'usuario',
    fotoUrl: null,
  }
  return {
    ...real,
    obtenerSesionActual: vi.fn().mockResolvedValue(usuario),
    cerrarSesion: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock('../actividades/actividades.api', async () => {
  const real = await vi.importActual<typeof import('../actividades/actividades.api')>(
    '../actividades/actividades.api',
  )
  return { ...real, obtenerActividad: vi.fn() }
})

vi.mock('./calificaciones.api', async () => {
  const real = await vi.importActual<typeof import('./calificaciones.api')>('./calificaciones.api')
  return { ...real, obtenerCalificaciones: vi.fn() }
})

function renderPantalla() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/actividades/act-1/calificaciones']}>
        <Routes>
          <Route path="/actividades/:id/calificaciones" element={<PantallaCalificaciones />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function actividad(sobrescribir: Partial<Actividad> = {}): Actividad {
  return {
    id: 'act-1',
    nombre: 'Club de robótica',
    objetivo: '',
    fase: 'cierre',
    rol: 'organizador',
    numParticipantes: 2,
    fechaClave: '',
    nombreOrganizador: 'Olga Organizadora',
    capacidades: ['capturar_puntaje'],
    configuracion: { calificacion: 'habilitada' },
    ...sobrescribir,
  }
}

function calificacion(
  sobrescribir: Partial<CalificacionDeParticipante>,
): CalificacionDeParticipante {
  return {
    idMembresia: 'm1',
    nombre: 'Ana Soto',
    equipo: { id: 'e1', nombre: 'Alfa' },
    valor: 0,
    provisional: true,
    porCalificar: [],
    porResponder: 0,
    ...sobrescribir,
  }
}

describe('PantallaCalificaciones', () => {
  beforeEach(() => {
    vi.mocked(obtenerActividad).mockReset()
    vi.mocked(obtenerCalificaciones).mockReset()
  })

  it('antes del cierre no muestra calificaciones', async () => {
    vi.mocked(obtenerActividad).mockResolvedValue(actividad({ fase: 'desarrollo' }))
    vi.mocked(obtenerCalificaciones).mockResolvedValue([calificacion({})])
    renderPantalla()

    expect(await screen.findByText('Las calificaciones se ven en el cierre.')).toBeInTheDocument()
    expect(screen.queryByText('Ana Soto')).not.toBeInTheDocument()
  })

  it('nombra lo que falta calificar y separa lo que el participante no ha respondido', async () => {
    vi.mocked(obtenerActividad).mockResolvedValue(actividad())
    vi.mocked(obtenerCalificaciones).mockResolvedValue([
      calificacion({
        porCalificar: ['Metas', 'Avances', 'Bitácora', 'Aprendizaje', 'Producto'],
        porResponder: 2,
      }),
      calificacion({ idMembresia: 'm2', nombre: 'Beto Vega', valor: 8, provisional: false }),
    ])
    renderPantalla()

    expect(await screen.findByText('Metas, Avances, Bitácora y 2 más')).toBeInTheDocument()
    expect(screen.getByText('2 cuestionarios por responder')).toBeInTheDocument()
    expect(screen.getByText('Nada')).toBeInTheDocument()
  })

  it('cada fila lleva al desglose: Calificar si falta algo, Ver desglose si no', async () => {
    vi.mocked(obtenerActividad).mockResolvedValue(actividad())
    vi.mocked(obtenerCalificaciones).mockResolvedValue([
      calificacion({ porCalificar: ['Metas'] }),
      calificacion({ idMembresia: 'm2', nombre: 'Beto Vega' }),
    ])
    renderPantalla()

    expect(await screen.findByRole('link', { name: 'Calificar Ana Soto' })).toHaveAttribute(
      'href',
      '/actividades/act-1/calificaciones/m1',
    )
    expect(screen.getByRole('link', { name: 'Ver el desglose de Beto Vega' })).toHaveAttribute(
      'href',
      '/actividades/act-1/calificaciones/m2',
    )
  })
})
