import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PerfilPropio, SolicitudNombre, Usuario } from '../cuentas/api'
import {
  actualizarDatosPerfil,
  cambiarVisibilidadCorreo,
  descartarSolicitudNombre,
  obtenerPerfilPropio,
  obtenerSolicitudNombre,
  solicitarCambioNombre,
} from '../cuentas/api'
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
  correoPublico: false,
  solicitudNombre: null,
  acumulado: { ideas: 3 },
}

const SOLICITUD: SolicitudNombre = {
  idSolicitud: 's1',
  nombre: 'Ana',
  apellidoPaterno: 'Garza',
  apellidoMaterno: 'López',
  estado: 'pendiente',
  motivoRechazo: null,
  creadaEn: '2026-11-02T12:00:00.000Z',
  resueltaEn: null,
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
    cambiarVisibilidadCorreo: vi.fn(),
    solicitarCambioNombre: vi.fn(),
    descartarSolicitudNombre: vi.fn(),
    obtenerSolicitudNombre: vi.fn(),
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
    vi.mocked(cambiarVisibilidadCorreo).mockReset()
    vi.mocked(solicitarCambioNombre).mockReset()
    vi.mocked(descartarSolicitudNombre).mockReset()
    vi.mocked(obtenerSolicitudNombre).mockReset().mockResolvedValue(SOLICITUD)
  })

  it('si la aprueban mientras escribo otra, aparece el aviso sin perder el borrador', async () => {
    vi.mocked(obtenerPerfilPropio).mockResolvedValue({ ...PERFIL, solicitudNombre: SOLICITUD })
    const { usuario } = renderPantalla()

    const apellido = await screen.findByLabelText('Apellido paterno')
    await usuario.clear(apellido)
    await usuario.type(apellido, 'Garcés')

    // El siguiente sondeo ve la solicitud aprobada y el perfil releído trae el
    // nombre nuevo.
    const aprobada = { ...SOLICITUD, estado: 'aprobada' as const }
    vi.mocked(obtenerSolicitudNombre).mockResolvedValue(aprobada)
    vi.mocked(obtenerPerfilPropio).mockResolvedValue({
      ...PERFIL,
      apellidoPaterno: 'Garza',
      solicitudNombre: aprobada,
    })

    expect(
      await screen.findByText('Tu cambio de nombre fue aprobado', {}, { timeout: 4000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ana Garza López' })).toBeInTheDocument()
    expect(screen.getByLabelText('Apellido paterno')).toHaveValue('Garcés')
  })

  it('si falla una recarga, el perfil sigue en pantalla con un aviso', async () => {
    vi.mocked(obtenerPerfilPropio).mockResolvedValue({ ...PERFIL, solicitudNombre: SOLICITUD })
    // La cancelaron en otra pestaña: el sondeo ya no la ve y el perfil se relee.
    vi.mocked(obtenerSolicitudNombre).mockResolvedValue(null)
    vi.mocked(obtenerPerfilPropio).mockResolvedValueOnce({ ...PERFIL, solicitudNombre: SOLICITUD })
    vi.mocked(obtenerPerfilPropio).mockRejectedValue(new Error('sin conexión'))
    renderPantalla()

    expect(await screen.findByText(/No pudimos actualizar tu perfil/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ana García López' })).toBeInTheDocument()
    expect(screen.getByLabelText('Apellido paterno')).toBeInTheDocument()
  })

  it('el correo es privado hasta que lo hago público con el interruptor', async () => {
    const { usuario } = renderPantalla()

    const interruptor = await screen.findByRole('switch', {
      name: 'Mostrar mi correo en mi perfil',
    })
    expect(interruptor).not.toBeChecked()
    expect(screen.getByText(/Solo tú lo ves/)).toBeInTheDocument()

    vi.mocked(cambiarVisibilidadCorreo).mockResolvedValue(USUARIO)
    vi.mocked(obtenerPerfilPropio).mockResolvedValue({ ...PERFIL, correoPublico: true })
    await usuario.click(interruptor)

    expect(cambiarVisibilidadCorreo).toHaveBeenCalledWith(true)
    await waitFor(() => expect(interruptor).toBeChecked())
    expect(screen.getByText('Otras personas con sesión lo ven en tu perfil.')).toBeInTheDocument()
  })

  it('si no se pudo guardar, el interruptor regresa y avisa', async () => {
    const { usuario } = renderPantalla()

    const interruptor = await screen.findByRole('switch', {
      name: 'Mostrar mi correo en mi perfil',
    })
    vi.mocked(cambiarVisibilidadCorreo).mockRejectedValue(
      new Error('No pudimos cambiar la visibilidad de tu correo.'),
    )
    await usuario.click(interruptor)

    expect(
      await screen.findByText('No pudimos cambiar la visibilidad de tu correo.'),
    ).toBeInTheDocument()
    expect(interruptor).not.toBeChecked()
  })

  it('muestra quién soy, mis estudios y las seis insignias', async () => {
    renderPantalla()

    expect(await screen.findByRole('heading', { name: 'Ana García López' })).toBeInTheDocument()
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
    expect(screen.getByText('Licenciatura · UNAM')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ideas, nivel Bronce' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /sin nivel todavía/ })).toHaveLength(5)
  })

  it('agrupa tus datos y la contraseña en Datos generales, y las insignias después', async () => {
    renderPantalla()
    await screen.findByRole('heading', { name: 'Ana García López' })

    const titulos = screen
      .getAllByRole('heading')
      .map((titulo) => `${titulo.tagName}:${titulo.textContent}`)
      .filter((titulo) => !titulo.startsWith('H1'))
    expect(titulos).toEqual([
      'H2:Ana García López',
      'H2:Datos generales',
      'H3:Tus datos',
      'H3:Contraseña',
      'H3:Ayudas',
      'H2:Insignias',
    ])
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

  it('al guardar, envía la solicitud al administrador y avisa sin cambiar el nombre', async () => {
    vi.mocked(solicitarCambioNombre).mockResolvedValue(SOLICITUD)
    const { usuario } = renderPantalla()

    const guardar = await screen.findByRole('button', { name: 'Guardar datos' })
    expect(guardar).toBeDisabled()

    const apellido = screen.getByLabelText('Apellido paterno')
    await usuario.clear(apellido)
    await usuario.type(apellido, ' Garza ')
    expect(guardar).toBeEnabled()

    vi.mocked(obtenerPerfilPropio).mockResolvedValue({ ...PERFIL, solicitudNombre: SOLICITUD })
    await usuario.click(guardar)

    expect(solicitarCambioNombre).toHaveBeenCalledWith({
      nombre: 'Ana',
      apellidoPaterno: 'Garza',
      apellidoMaterno: 'López',
    })
    expect(actualizarDatosPerfil).not.toHaveBeenCalled()
    expect(await screen.findByText('Solicitud enviada al administrador')).toBeInTheDocument()
    expect(screen.getByText('Ana Garza López')).toBeInTheDocument()
    // El formulario vuelve al nombre vigente.
    expect(screen.getByLabelText('Apellido paterno')).toHaveValue('García')
    expect(screen.getByRole('heading', { name: 'Ana García López' })).toBeInTheDocument()
  })

  it('cancelar la solicitud no borra lo que se está escribiendo', async () => {
    vi.mocked(obtenerPerfilPropio).mockResolvedValue({ ...PERFIL, solicitudNombre: SOLICITUD })
    vi.mocked(descartarSolicitudNombre).mockResolvedValue(undefined)
    const { usuario } = renderPantalla()

    const apellido = await screen.findByLabelText('Apellido paterno')
    await usuario.clear(apellido)
    await usuario.type(apellido, 'Garcés')

    vi.mocked(obtenerPerfilPropio).mockResolvedValue(PERFIL)
    await usuario.click(screen.getByRole('button', { name: 'Cancelar solicitud' }))

    expect(descartarSolicitudNombre).toHaveBeenCalledWith(SOLICITUD)
    await waitFor(() =>
      expect(screen.queryByText('Solicitud enviada al administrador')).not.toBeInTheDocument(),
    )
    expect(screen.getByLabelText('Apellido paterno')).toHaveValue('Garcés')
  })

  it('una solicitud aprobada avisa el nombre nuevo', async () => {
    vi.mocked(obtenerPerfilPropio).mockResolvedValue({
      ...PERFIL,
      apellidoPaterno: 'Garza',
      solicitudNombre: { ...SOLICITUD, estado: 'aprobada' },
    })
    renderPantalla()

    expect(await screen.findByText('Tu cambio de nombre fue aprobado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entendido' })).toBeInTheDocument()
  })

  it('una solicitud rechazada muestra el motivo', async () => {
    vi.mocked(obtenerPerfilPropio).mockResolvedValue({
      ...PERFIL,
      solicitudNombre: { ...SOLICITUD, estado: 'rechazada', motivoRechazo: 'Usa tu nombre legal.' },
    })
    renderPantalla()

    expect(await screen.findByText('Tu cambio de nombre fue rechazado')).toBeInTheDocument()
    expect(screen.getByText('Motivo: Usa tu nombre legal.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entendido' })).toBeInTheDocument()
  })

  it('un administrador guarda su nombre directamente', async () => {
    vi.mocked(obtenerPerfilPropio).mockResolvedValue({ ...PERFIL, tipoCuenta: 'administrador' })
    vi.mocked(actualizarDatosPerfil).mockResolvedValue({ ...USUARIO, apellidoPaterno: 'Garza' })
    const { usuario } = renderPantalla()

    const apellido = await screen.findByLabelText('Apellido paterno')
    await usuario.clear(apellido)
    await usuario.type(apellido, 'Garza')
    await usuario.click(screen.getByRole('button', { name: 'Guardar datos' }))

    expect(actualizarDatosPerfil).toHaveBeenCalledWith({
      nombre: 'Ana',
      apellidoPaterno: 'Garza',
      apellidoMaterno: 'López',
    })
    expect(solicitarCambioNombre).not.toHaveBeenCalled()
  })

  it('no deja guardar un apellido vacío', async () => {
    const { usuario } = renderPantalla()

    const apellido = await screen.findByLabelText('Apellido materno')
    await usuario.clear(apellido)
    await usuario.click(screen.getByRole('button', { name: 'Guardar datos' }))

    expect(screen.getByText('Este campo es obligatorio.')).toBeInTheDocument()
    expect(solicitarCambioNombre).not.toHaveBeenCalled()
  })
})
