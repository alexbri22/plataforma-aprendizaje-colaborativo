import type { PublicacionDeProyecto, PublicacionesDeActividad } from '@plataforma/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerActividad } from '../actividades/actividades.api'
import type { Actividad } from '../actividades'
import type { Usuario } from '../cuentas/api'
import { PantallaPublicacion } from './PantallaPublicacion'
import {
  guardarPublicacion,
  obtenerPublicaciones,
  subirArchivoPublicacion,
} from './publicaciones.api'

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  const usuario: Usuario = {
    idUsuario: 'u1',
    nombre: 'Ana',
    apellidoPaterno: 'Soto',
    apellidoMaterno: '',
    correo: 'ana@example.com',
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

vi.mock('./publicaciones.api', async () => {
  const real = await vi.importActual<typeof import('./publicaciones.api')>('./publicaciones.api')
  return {
    ...real,
    obtenerPublicaciones: vi.fn(),
    guardarPublicacion: vi.fn(),
    subirArchivoPublicacion: vi.fn(),
    quitarArchivoPublicacion: vi.fn(),
  }
})

function renderPantalla() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/actividades/act-1/publicacion']}>
        <Routes>
          <Route path="/actividades/:id/publicacion" element={<PantallaPublicacion />} />
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
    rol: 'participante',
    numParticipantes: 4,
    fechaClave: '',
    nombreOrganizador: 'Olga Organizadora',
    capacidades: ['publicar_proyecto'],
    configuracion: {},
    ...sobrescribir,
  }
}

function publicacion(sobrescribir: Partial<PublicacionDeProyecto> = {}): PublicacionDeProyecto {
  return {
    id: 'pub-2',
    idEquipo: 'e2',
    descripcion: 'Un brazo que sirve café.',
    enlace: 'https://video.example.com/brazo',
    archivo: null,
    autor: 'Beto Vega',
    fechaCreacion: '2026-11-20T16:00:00.000Z',
    fechaActualizacion: '2026-11-20T16:00:00.000Z',
    ...sobrescribir,
  }
}

const DATOS: PublicacionesDeActividad = {
  equipos: [
    { id: 'e1', nombre: 'Alfa' },
    { id: 'e2', nombre: 'Beta' },
    { id: 'e3', nombre: 'Gamma' },
  ],
  publicaciones: [publicacion()],
  idMiEquipo: 'e1',
}

describe('PantallaPublicacion', () => {
  beforeEach(() => {
    vi.mocked(obtenerActividad).mockReset()
    vi.mocked(obtenerPublicaciones).mockReset().mockResolvedValue(DATOS)
    vi.mocked(guardarPublicacion).mockReset()
    vi.mocked(subirArchivoPublicacion).mockReset()
  })

  it('antes del cierre dice que los proyectos se publican en el cierre', async () => {
    vi.mocked(obtenerActividad).mockResolvedValue(
      actividad({ fase: 'desarrollo', capacidades: [] }),
    )
    renderPantalla()

    expect(await screen.findByText('Los proyectos se publican en el cierre.')).toBeInTheDocument()
  })

  it('quien participa publica el proyecto de su equipo desde un formulario cerrado de entrada', async () => {
    const usuario = userEvent.setup()
    vi.mocked(obtenerActividad).mockResolvedValue(actividad())
    vi.mocked(guardarPublicacion).mockResolvedValue(publicacion({ idEquipo: 'e1' }))
    renderPantalla()

    expect(await screen.findByText('Proyecto de tu equipo · Alfa')).toBeInTheDocument()
    expect(screen.getByText('Todavía no lo publican.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Descripción')).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Publicar proyecto' }))
    await usuario.type(screen.getByLabelText('Descripción'), '  Tesina sobre robótica  ')
    await usuario.click(screen.getByRole('button', { name: 'Publicar' }))

    await waitFor(() =>
      expect(guardarPublicacion).toHaveBeenCalledWith('act-1', {
        descripcion: 'Tesina sobre robótica',
        enlace: null,
      }),
    )
    expect(subirArchivoPublicacion).not.toHaveBeenCalled()
  })

  it('quien participa ve los proyectos publicados de los demás, no los que faltan', async () => {
    vi.mocked(obtenerActividad).mockResolvedValue(actividad())
    renderPantalla()

    expect(await screen.findByText('Un brazo que sirve café.')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'https://video.example.com/brazo' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Gamma')).not.toBeInTheDocument()
    expect(screen.queryByText('Sin publicar.')).not.toBeInTheDocument()
  })

  it('quien organiza ve todos los equipos y cuáles no han publicado', async () => {
    vi.mocked(obtenerActividad).mockResolvedValue(
      actividad({ rol: 'organizador', capacidades: [] }),
    )
    vi.mocked(obtenerPublicaciones).mockResolvedValue({ ...DATOS, idMiEquipo: null })
    renderPantalla()

    expect(await screen.findByText('Un brazo que sirve café.')).toBeInTheDocument()
    expect(screen.getAllByText('Sin publicar.')).toHaveLength(2)
    expect(screen.queryByText(/Proyecto de tu equipo/)).not.toBeInTheDocument()
  })
})
