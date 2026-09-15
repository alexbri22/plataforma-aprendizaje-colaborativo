import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PerfilPropio, Usuario } from '../cuentas/api'
import { actualizarDatosPerfil, obtenerPerfilPropio } from '../cuentas/api'
import type { ReconocimientoEnPerfil } from '../insignias/insignias.api'
import { obtenerRecibidosEnPerfil } from '../insignias/insignias.api'
import { PantallaPerfil } from './PantallaPerfil'

const USUARIO: Usuario = {
  idUsuario: 'u1',
  nombre: 'Ana',
  apellidoPaterno: 'García',
  apellidoMaterno: 'López',
  correo: 'ana@example.com',
  tipoCuenta: 'usuario',
  fotoUrl: null,
}

// Ideas en bronce (3 pts, faltan 5 para plata); el resto en cero.
const PERFIL: PerfilPropio = {
  ...USUARIO,
  nivelEstudios: 'licenciatura',
  institucionEducativa: 'UNAM',
  acumulado: { ideas: 3 },
}

const RECIBIDOS: ReconocimientoEnPerfil[] = [
  {
    categoria: 'ideas',
    frase: 'Trajo una idea en la que nadie había pensado',
    puntos: 1,
    fuente: 'par',
    fecha: '2026-08-20T12:00:00.000Z',
    actividad: { id: 'a1', nombre: 'Proyecto de ecosistemas' },
  },
  {
    categoria: 'ideas',
    frase: 'Convirtió un problema en algo que sí podíamos hacer',
    puntos: 2,
    fuente: 'organizador',
    fecha: '2026-08-21T12:00:00.000Z',
    actividad: { id: 'a1', nombre: 'Proyecto de ecosistemas' },
  },
]

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  return {
    ...real,
    obtenerSesionActual: vi.fn(),
    cerrarSesion: vi.fn().mockResolvedValue(undefined),
    obtenerPerfilPropio: vi.fn(),
    actualizarDatosPerfil: vi.fn(),
  }
})

vi.mock('../insignias/insignias.api', async () => {
  const real = await vi.importActual<typeof import('../insignias/insignias.api')>(
    '../insignias/insignias.api',
  )
  return { ...real, obtenerRecibidosEnPerfil: vi.fn() }
})

function renderPantalla() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const usuario = userEvent.setup()
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/perfil']}>
        <PantallaPerfil />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { usuario }
}

describe('PantallaPerfil', () => {
  beforeEach(() => {
    vi.mocked(obtenerPerfilPropio).mockResolvedValue(PERFIL)
    vi.mocked(obtenerRecibidosEnPerfil).mockResolvedValue(RECIBIDOS)
    vi.mocked(actualizarDatosPerfil).mockReset()
  })

  it('muestra quién soy, mis estudios y las seis insignias', async () => {
    renderPantalla()

    expect(await screen.findByRole('heading', { name: 'Ana García López' })).toBeInTheDocument()
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
    expect(screen.getByText('Licenciatura · UNAM')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ideas, nivel Bronce' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /sin nivel todavía/ })).toHaveLength(5)
  })

  it('al abrir una insignia enseña las frases con su actividad y cuánto falta', async () => {
    const { usuario } = renderPantalla()

    await usuario.click(await screen.findByRole('button', { name: 'Ideas, nivel Bronce' }))

    const detalle = screen.getByRole('region', { name: 'Ideas' })
    expect(within(detalle).getByText('Faltan 5 pts para Plata')).toBeInTheDocument()
    expect(
      within(detalle).getByText('“Trajo una idea en la que nadie había pensado”'),
    ).toBeInTheDocument()
    expect(within(detalle).getAllByText(/Proyecto de ecosistemas/)).toHaveLength(2)
    // La del organizador se atribuye; la del par no.
    expect(within(detalle).getAllByText(/de quien organizó/)).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Ideas, nivel Bronce' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('una insignia sin reconocimientos explica cómo se gana', async () => {
    const { usuario } = renderPantalla()

    await usuario.click(await screen.findByRole('button', { name: 'Liderazgo, sin nivel todavía' }))

    expect(screen.getByText(/Todavía no has recibido esta insignia/)).toBeInTheDocument()
    expect(screen.getByText('Faltan 3 pts para Bronce')).toBeInTheDocument()
  })

  it('guarda nombre y apellidos solo cuando cambian', async () => {
    vi.mocked(actualizarDatosPerfil).mockResolvedValue({ ...USUARIO, apellidoPaterno: 'Garza' })
    const { usuario } = renderPantalla()

    const guardar = await screen.findByRole('button', { name: 'Guardar datos' })
    expect(guardar).toBeDisabled()

    const apellido = screen.getByLabelText('Apellido paterno')
    await usuario.clear(apellido)
    await usuario.type(apellido, ' Garza ')
    expect(guardar).toBeEnabled()
    await usuario.click(guardar)

    expect(actualizarDatosPerfil).toHaveBeenCalledWith({
      nombre: 'Ana',
      apellidoPaterno: 'Garza',
      apellidoMaterno: 'López',
    })
  })

  it('no deja guardar un apellido vacío', async () => {
    const { usuario } = renderPantalla()

    const apellido = await screen.findByLabelText('Apellido materno')
    await usuario.clear(apellido)
    await usuario.click(screen.getByRole('button', { name: 'Guardar datos' }))

    expect(screen.getByText('Este campo es obligatorio.')).toBeInTheDocument()
    expect(actualizarDatosPerfil).not.toHaveBeenCalled()
  })
})
