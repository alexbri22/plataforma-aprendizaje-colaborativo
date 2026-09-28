import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Usuario } from '../cuentas/api'
import { ACTIVIDADES_PRUEBA } from './actividades.fixtures'
import { PantallaMisActividades } from './PantallaMisActividades'
import type { Actividad } from './tipos'

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  const usuario: Usuario = {
    idUsuario: 'u1',
    nombre: 'Ana',
    apellidoPaterno: 'García',
    apellidoMaterno: 'López',
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

// El backend real solo cubre crear y listar actividades en este incremento
// (docs/diseno-desarrollo-nucleo.md §11.2, "Actividades I"). Se mockea aquí
// todo el módulo, en vez de golpear fetch, para no depender de un servidor
// en las pruebas de la pantalla (mismo patrón que
// apps/web/src/features/cuentas/PantallaIngresar.test.tsx).
let actividades: Actividad[]

vi.mock('./actividades.api', () => ({
  obtenerActividades: vi.fn(() => Promise.resolve(actividades)),
}))

function renderPantalla() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PantallaMisActividades />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PantallaMisActividades', () => {
  beforeEach(() => {
    actividades = [...ACTIVIDADES_PRUEBA]
  })

  it('muestra en una sola lista las actividades que organizo, sin importar su estado', async () => {
    renderPantalla()

    expect(await screen.findByText('Proyecto de ecosistemas')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Organizo' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Curso de introducción a bases de datos')).toBeInTheDocument()
    expect(screen.getByText('Taller de retroalimentación entre pares')).toBeInTheDocument()
    expect(screen.queryByText('Debate de genética')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })

  it('pone el estado de la actividad sobre el título, a todo el ancho', async () => {
    renderPantalla()

    const titulo = await screen.findByRole('heading', { name: 'Proyecto de ecosistemas' })
    const tarjeta = titulo.closest('a') as HTMLElement
    expect(within(tarjeta).getByText('Inscripción')).toBeInTheDocument()
    // Ya no hay una etiqueta "Estado" suelta: la propia píldora lo dice.
    expect(screen.queryByText('Estado')).not.toBeInTheDocument()
  })

  it('filtra por estado y permite volver a ver todas', async () => {
    renderPantalla()

    await screen.findByText('Proyecto de ecosistemas')
    await userEvent.selectOptions(screen.getByLabelText('Ver actividades en'), 'desarrollo')

    expect(screen.getByText('Taller de retroalimentación entre pares')).toBeInTheDocument()
    expect(screen.queryByText('Proyecto de ecosistemas')).not.toBeInTheDocument()
    expect(screen.queryByText('Curso de introducción a bases de datos')).not.toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Ver actividades en'), 'todas')

    expect(screen.getByText('Proyecto de ecosistemas')).toBeInTheDocument()
    expect(screen.getByText('Curso de introducción a bases de datos')).toBeInTheDocument()
  })

  it('avisa cuando ninguna actividad de la pestaña tiene el estado elegido', async () => {
    renderPantalla()

    await screen.findByText('Proyecto de ecosistemas')
    await userEvent.selectOptions(screen.getByLabelText('Ver actividades en'), 'cierre')

    expect(
      screen.getByText('Ninguna actividad coincide con tu búsqueda o filtro.'),
    ).toBeInTheDocument()
  })

  it('cambia a las actividades en las que participo al activar esa pestaña', async () => {
    renderPantalla()

    await screen.findByText('Proyecto de ecosistemas')
    await userEvent.click(screen.getByRole('tab', { name: 'Participo' }))

    expect(await screen.findByText('Debate de genética')).toBeInTheDocument()
    expect(screen.queryByText('Proyecto de ecosistemas')).not.toBeInTheDocument()
  })

  it('busca por nombre u objetivo sin distinguir mayúsculas ni acentos', async () => {
    renderPantalla()

    await screen.findByText('Proyecto de ecosistemas')
    await userEvent.type(screen.getByLabelText('Buscar actividades'), 'RETROALIMENTACION')

    expect(screen.getByText('Taller de retroalimentación entre pares')).toBeInTheDocument()
    expect(screen.queryByText('Proyecto de ecosistemas')).not.toBeInTheDocument()
  })

  it('combina la búsqueda con el filtro por estado', async () => {
    renderPantalla()

    await screen.findByText('Proyecto de ecosistemas')
    await userEvent.type(screen.getByLabelText('Buscar actividades'), 'proyecto')
    await userEvent.selectOptions(screen.getByLabelText('Ver actividades en'), 'desarrollo')

    expect(
      screen.getByText('Ninguna actividad coincide con tu búsqueda o filtro.'),
    ).toBeInTheDocument()
  })

  it('limpia búsqueda y filtro desde el estado sin resultados', async () => {
    renderPantalla()

    await screen.findByText('Proyecto de ecosistemas')
    await userEvent.type(screen.getByLabelText('Buscar actividades'), 'zzz')
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    expect(screen.getByLabelText('Buscar actividades')).toHaveValue('')
    expect(screen.getByLabelText('Ver actividades en')).toHaveValue('todas')
    expect(screen.getByText('Proyecto de ecosistemas')).toBeInTheDocument()
  })
})
