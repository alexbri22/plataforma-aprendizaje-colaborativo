import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
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

  it('muestra las actividades que organizo agrupadas por fase en la pestaña inicial', async () => {
    renderPantalla()

    expect(await screen.findByText('Proyecto de ecosistemas')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Organizo' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Curso de introducción a bases de datos')).toBeInTheDocument()
    expect(screen.queryByText('Debate de genética')).not.toBeInTheDocument()
  })

  it('cambia a las actividades en las que participo al activar esa pestaña', async () => {
    renderPantalla()

    await screen.findByText('Proyecto de ecosistemas')
    await userEvent.click(screen.getByRole('tab', { name: 'Participo' }))

    expect(await screen.findByText('Debate de genética')).toBeInTheDocument()
    expect(screen.queryByText('Proyecto de ecosistemas')).not.toBeInTheDocument()
  })
})
