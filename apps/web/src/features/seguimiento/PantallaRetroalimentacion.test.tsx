import {
  serializarEstadoEspacioEquipo,
  type RetroalimentacionDeActividad,
  type RetroalimentacionDeEquipo,
} from '@plataforma/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerActividad } from '../actividades/actividades.api'
import type { Actividad } from '../actividades'
import type { Usuario } from '../cuentas/api'
import { crearRetroalimentacionDeEquipo, obtenerRetroalimentacion } from './comentarios.api'
import { PantallaRetroalimentacion } from './PantallaRetroalimentacion'

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

vi.mock('./comentarios.api', async () => {
  const real = await vi.importActual<typeof import('./comentarios.api')>('./comentarios.api')
  return {
    ...real,
    obtenerRetroalimentacion: vi.fn(),
    crearRetroalimentacionDeEquipo: vi.fn(),
  }
})

function renderPantalla() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/actividades/act-1/evaluacion']}>
        <Routes>
          <Route path="/actividades/:id/evaluacion" element={<PantallaRetroalimentacion />} />
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
    fase: 'desarrollo',
    rol: 'organizador',
    numParticipantes: 4,
    fechaClave: '',
    nombreOrganizador: 'Olga Organizadora',
    idMiMembresia: 'org',
    capacidades: ['comentar'],
    configuracion: {
      espacio_equipo: serializarEstadoEspacioEquipo({
        metas: 'opcional',
        planeacion: 'deshabilitado',
        avances: 'opcional',
        recursos: 'opcional',
        producto: 'opcional',
      }),
    },
    ...sobrescribir,
  }
}

function retro(
  seccion: RetroalimentacionDeEquipo['seccion'],
  contenido: string,
  idEquipo = 'e1',
): RetroalimentacionDeEquipo {
  return {
    id: `r-${seccion}-${idEquipo}`,
    idMembresiaAutor: 'org',
    autor: 'Olga Organizadora',
    tipoEntidad: 'seccion_equipo',
    idEntidad: `${idEquipo}:${seccion}`,
    contenido,
    fechaCreacion: '2026-11-10T16:00:00.000Z',
    fechaActualizacion: '2026-11-10T16:00:00.000Z',
    idEquipo,
    seccion,
  }
}

const DATOS: RetroalimentacionDeActividad = {
  equipos: [
    { id: 'e1', nombre: 'Alfa' },
    { id: 'e2', nombre: 'Beta' },
  ],
  retroalimentacion: [retro('metas', 'Supieron definir metas claras.')],
  resumen: [{ idEquipo: 'e1', seccion: 'metas', elementos: 2, comentarios: 1 }],
}

describe('PantallaRetroalimentacion', () => {
  beforeEach(() => {
    vi.mocked(obtenerActividad).mockReset()
    vi.mocked(obtenerRetroalimentacion).mockReset().mockResolvedValue(DATOS)
    vi.mocked(crearRetroalimentacionDeEquipo).mockReset()
  })

  describe('quien organiza', () => {
    it('elige el equipo por su nombre y ve sus partes plegadas, con su contexto', async () => {
      vi.mocked(obtenerActividad).mockResolvedValue(actividad())
      renderPantalla()

      const selector = await screen.findByLabelText('Equipo')
      expect(
        within(selector)
          .getAllByRole('option')
          .map((o) => o.textContent),
      ).toEqual(['Alfa', 'Beta'])
      // General y las secciones habilitadas (Planeación está deshabilitada).
      const partes = within(screen.getByRole('main')).getAllByRole('button', { expanded: false })
      expect(partes.map((b) => b.textContent)).toEqual([
        'General',
        'Metas',
        'Avances',
        'Materiales',
        'Producto',
      ])
      expect(screen.getByText('2 metas · 1 comentario')).toBeInTheDocument()
      expect(screen.queryByText('Supieron definir metas claras.')).not.toBeInTheDocument()
    })

    it('al abrir una parte lee lo escrito y puede escribir más', async () => {
      const usuario = userEvent.setup()
      vi.mocked(obtenerActividad).mockResolvedValue(actividad())
      vi.mocked(crearRetroalimentacionDeEquipo).mockResolvedValue(retro('metas', 'Otra'))
      renderPantalla()

      await usuario.click(await screen.findByRole('button', { name: 'Metas' }))
      expect(screen.getByText('Supieron definir metas claras.')).toBeInTheDocument()

      // El formulario está cerrado de entrada: se abre con su botón.
      await usuario.click(screen.getByRole('button', { name: 'Escribir retroalimentación' }))
      await usuario.type(
        screen.getByLabelText('Escribir retroalimentación'),
        'Incorporaron rápido los comentarios.',
      )
      await usuario.click(screen.getByRole('button', { name: 'Enviar' }))

      await waitFor(() =>
        expect(crearRetroalimentacionDeEquipo).toHaveBeenCalledWith(
          'e1',
          'metas',
          'Incorporaron rápido los comentarios.',
        ),
      )
    })

    it('cambiar de equipo muestra la retroalimentación de ese equipo', async () => {
      const usuario = userEvent.setup()
      vi.mocked(obtenerActividad).mockResolvedValue(actividad())
      renderPantalla()

      await usuario.selectOptions(await screen.findByLabelText('Equipo'), 'Beta')
      await usuario.click(screen.getByRole('button', { name: 'Metas' }))

      expect(screen.getByText('Todavía no hay retroalimentación.')).toBeInTheDocument()
      // Beta todavía no agrega nada en ninguna sección.
      expect(screen.getAllByText('Sin contenido todavía')).toHaveLength(4)
    })
  })

  describe('quien participa', () => {
    it('ve solo las partes con retroalimentación, abiertas y sin poder escribir', async () => {
      vi.mocked(obtenerActividad).mockResolvedValue(
        actividad({ rol: 'participante', capacidades: [], idMiMembresia: 'yo' }),
      )
      vi.mocked(obtenerRetroalimentacion).mockResolvedValue({
        equipos: [{ id: 'e1', nombre: 'Alfa' }],
        retroalimentacion: [retro('metas', 'Supieron definir metas claras.')],
        resumen: [],
      })
      renderPantalla()

      expect(await screen.findByText('Supieron definir metas claras.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Metas' })).toHaveAttribute('aria-expanded', 'true')
      expect(screen.queryByRole('button', { name: 'General' })).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Escribir retroalimentación' }),
      ).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Equipo')).not.toBeInTheDocument()
    })

    it('sin retroalimentación lo dice en una línea', async () => {
      vi.mocked(obtenerActividad).mockResolvedValue(
        actividad({ rol: 'participante', capacidades: [] }),
      )
      vi.mocked(obtenerRetroalimentacion).mockResolvedValue({
        equipos: [{ id: 'e1', nombre: 'Alfa' }],
        retroalimentacion: [],
        resumen: [],
      })
      renderPantalla()

      expect(await screen.findByText('Todavía no hay retroalimentación.')).toBeInTheDocument()
    })
  })
})
