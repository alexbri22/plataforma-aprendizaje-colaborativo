import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerSesionActual } from '../cuentas/api'
import { ConstanciasEnPerfil, type ConstanciasEnPerfilProps } from './ConstanciasEnPerfil'
import {
  cambiarVisibilidadConstancias,
  obtenerConstanciasDeUsuario,
  obtenerMisConstancias,
  type ConstanciaPropia,
} from './formacion.api'

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  return { ...real, obtenerSesionActual: vi.fn() }
})

vi.mock('./formacion.api', async () => {
  const real = await vi.importActual<typeof import('./formacion.api')>('./formacion.api')
  return {
    ...real,
    obtenerMisConstancias: vi.fn(),
    cambiarVisibilidadConstancias: vi.fn(),
    obtenerConstanciasDeUsuario: vi.fn(),
  }
})

const ANA = {
  idUsuario: 'u1',
  nombre: 'Ana',
  apellidoPaterno: 'García',
  apellidoMaterno: 'López',
  correo: 'ana@example.com',
  tipoCuenta: 'usuario' as const,
  fotoUrl: null,
}

function constancia(parcial: Partial<ConstanciaPropia> = {}): ConstanciaPropia {
  return {
    folio: 'CO3-7KQM-4XPA',
    tipo: 'curso',
    titulo: 'Acuerdos y responsabilidades claras',
    numCursos: 0,
    fechaFinalizacion: '2026-11-02T18:00:00.000Z',
    idCurso: 'c1',
    idRuta: null,
    ...parcial,
  }
}

const RUTA = constancia({
  folio: 'CO3-R7TA-0001',
  tipo: 'ruta',
  titulo: 'Organización y corresponsabilidad',
  numCursos: 2,
  fechaFinalizacion: '2026-11-04T18:00:00.000Z',
  idCurso: null,
  idRuta: 'r1',
})

function renderizar(props: ConstanciasEnPerfilProps) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const usuario = userEvent.setup()
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ConstanciasEnPerfil {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return usuario
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(obtenerSesionActual).mockResolvedValue(ANA)
  vi.mocked(obtenerMisConstancias).mockResolvedValue({
    constancias: [RUTA, constancia()],
    publicas: false,
  })
  vi.mocked(obtenerConstanciasDeUsuario).mockResolvedValue([])
})

describe('en mi perfil', () => {
  it('lista lo que terminé, con su fecha y su constancia, sin niveles ni puntos', async () => {
    renderizar({ propio: true })

    const grupo = await screen.findByRole('region', { name: 'Formación completada' })
    const filas = await within(grupo).findAllByRole('listitem')
    expect(filas).toHaveLength(2)
    expect(
      within(filas[0]).getByText('Ruta · 2 cursos · Terminada el 4 de noviembre de 2026'),
    ).toBeInTheDocument()
    expect(
      within(filas[1]).getByText('Curso · Terminado el 2 de noviembre de 2026'),
    ).toBeInTheDocument()
    expect(
      within(filas[1]).getByRole('link', {
        name: 'Ver la constancia de Acuerdos y responsabilidades claras',
      }),
    ).toHaveAttribute('href', '/constancias/CO3-7KQM-4XPA')
    expect(grupo).not.toHaveTextContent(/nivel|puntos|insignia/i)
  })

  it('están ocultas por defecto y se pueden mostrar', async () => {
    vi.mocked(cambiarVisibilidadConstancias).mockResolvedValue(true)
    const usuario = renderizar({ propio: true })

    const interruptor = await screen.findByRole('switch', {
      name: 'Mostrar mis constancias en mi perfil',
    })
    expect(interruptor).not.toBeChecked()
    expect(screen.getByText(/Solo tú las ves/)).toBeInTheDocument()

    await usuario.click(interruptor)

    expect(cambiarVisibilidadConstancias).toHaveBeenCalledWith(true, expect.anything())
    expect(
      await screen.findByText('Otras personas con sesión las ven en tu perfil.'),
    ).toBeInTheDocument()
    expect(interruptor).toBeChecked()
  })

  it('sin constancias invita a terminar un curso', async () => {
    vi.mocked(obtenerMisConstancias).mockResolvedValue({ constancias: [], publicas: false })
    renderizar({ propio: true })

    expect(
      await screen.findByText(/Cuando termines un curso o una ruta, su constancia aparecerá aquí/),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Explorar cursos' })).toHaveAttribute(
      'href',
      '/recursos',
    )
  })

  it('muestra las cinco más recientes y el resto a pedido', async () => {
    vi.mocked(obtenerMisConstancias).mockResolvedValue({
      constancias: Array.from({ length: 7 }, (_, i) =>
        constancia({ folio: `CO3-0000-000${i}`, titulo: `Curso ${i}` }),
      ),
      publicas: false,
    })
    const usuario = renderizar({ propio: true })

    const grupo = await screen.findByRole('region', { name: 'Formación completada' })
    expect(await within(grupo).findAllByRole('listitem')).toHaveLength(5)
    await usuario.click(within(grupo).getByRole('button', { name: 'Ver las 7' }))
    expect(within(grupo).getAllByRole('listitem')).toHaveLength(7)
  })
})

describe('en el perfil de otra persona', () => {
  it('si las ocultó o no tiene, el grupo no aparece', async () => {
    renderizar({ idUsuario: 'u2' })

    await vi.waitFor(() => expect(obtenerConstanciasDeUsuario).toHaveBeenCalledWith('u2'))
    expect(screen.queryByRole('region', { name: 'Formación completada' })).not.toBeInTheDocument()
  })

  it('si las mostró, se leen sin el interruptor', async () => {
    vi.mocked(obtenerConstanciasDeUsuario).mockResolvedValue([constancia()])
    renderizar({ idUsuario: 'u2' })

    const grupo = await screen.findByRole('region', { name: 'Formación completada' })
    expect(within(grupo).getAllByRole('listitem')).toHaveLength(1)
    expect(within(grupo).queryByRole('switch')).not.toBeInTheDocument()
    expect(obtenerMisConstancias).not.toHaveBeenCalled()
  })
})
