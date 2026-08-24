import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Usuario } from '../cuentas/api'
import { _reiniciarDatosDePrueba, crearActividad } from './actividades.api'
import { PantallaResumenActividad } from './PantallaResumenActividad'

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  const usuario: Usuario = {
    idUsuario: 'u1',
    nombre: 'Ana',
    apellidoPaterno: 'García',
    apellidoMaterno: 'López',
    correo: 'ana@example.com',
    tipoCuenta: 'usuario',
  }
  return {
    ...real,
    obtenerSesionActual: vi.fn().mockResolvedValue(usuario),
    cerrarSesion: vi.fn().mockResolvedValue(undefined),
  }
})

function renderPantalla(id: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/actividades/${id}`]}>
        <Routes>
          <Route path="/actividades/:id" element={<PantallaResumenActividad />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PantallaResumenActividad', () => {
  beforeEach(() => {
    _reiniciarDatosDePrueba()
  })

  it('muestra un aviso cuando la actividad no existe', async () => {
    renderPantalla('no-existe')

    expect(
      await screen.findByText('No encontramos esta actividad, o ya no formas parte de ella.'),
    ).toBeInTheDocument()
  })

  it('una actividad recién creada ya tiene fase Inscripción y clave de ingreso', async () => {
    const nueva = await crearActividad({
      nombre: 'Club de robótica',
      objetivo: 'Construir un brazo robótico.',
      informacionGeneral: 'Prototipo funcional con reporte técnico.',
      fechaInicio: '2026-09-01',
      fechaTermino: '2026-11-01',
      fechaLimiteInscripcion: '2026-09-05',
      plazoCierreDias: 10,
      numeroEquiposEsperado: 3,
    })
    renderPantalla(nueva.id)

    expect(await screen.findByText('Inscripción')).toBeInTheDocument()
    expect(screen.getByText('Clave de ingreso')).toBeInTheDocument()
    expect(screen.getByText(/^[A-Z2-9]{8}$/)).toBeInTheDocument()
  })
})
