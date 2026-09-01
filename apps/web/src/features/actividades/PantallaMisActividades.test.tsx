import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Usuario } from '../cuentas/api'
import { ACTIVIDADES_PRUEBA, INVITACIONES_PRUEBA } from './actividades.fixtures'
import { PantallaMisActividades } from './PantallaMisActividades'
import type { Actividad, InvitacionPendiente } from './tipos'

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

// El backend real solo cubre crear y listar actividades en este incremento
// (docs/diseno-desarrollo-nucleo.md §11.2, "Actividades I"); las invitaciones
// siguen mockeadas en actividades.api.ts. Se mockea aquí todo el módulo, en
// vez de golpear fetch, para no depender de un servidor en las pruebas de la
// pantalla (mismo patrón que apps/web/src/features/cuentas/PantallaIngresar.test.tsx).
let actividades: Actividad[]
let invitaciones: InvitacionPendiente[]

vi.mock('./actividades.api', () => ({
  obtenerActividades: vi.fn(() => Promise.resolve(actividades)),
  obtenerInvitaciones: vi.fn(() => Promise.resolve(invitaciones)),
  aceptarInvitacion: vi.fn((id: string) => {
    const invitacion = invitaciones.find((item) => item.id === id)
    if (!invitacion) throw new Error('La invitación ya no está disponible.')
    invitaciones = invitaciones.filter((item) => item.id !== id)
    const nueva: Actividad = {
      id: invitacion.id,
      nombre: invitacion.nombre,
      objetivo: invitacion.objetivo,
      fase: 'inscripcion',
      rol: 'participante',
      numParticipantes: 0,
      fechaClave: 'Te uniste recién',
    }
    actividades = [...actividades, nueva]
    return Promise.resolve(nueva)
  }),
  rechazarInvitacion: vi.fn((id: string) => {
    invitaciones = invitaciones.filter((item) => item.id !== id)
    return Promise.resolve(undefined)
  }),
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
    invitaciones = [...INVITACIONES_PRUEBA]
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

  it('muestra las invitaciones pendientes arriba, fuera de las pestañas', async () => {
    renderPantalla()

    expect(
      await screen.findByRole('region', { name: 'Invitaciones pendientes' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Club de lectura científica')).toBeInTheDocument()
  })

  it('al aceptar una invitación, desaparece de pendientes y aparece entre las actividades en las que participo', async () => {
    renderPantalla()

    await userEvent.click(await screen.findByRole('button', { name: 'Aceptar' }))

    expect(
      screen.queryByRole('region', { name: 'Invitaciones pendientes' }),
    ).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Participo' }))
    expect(await screen.findByText('Club de lectura científica')).toBeInTheDocument()
  })

  it('al rechazar una invitación, desaparece sin agregarse a ninguna pestaña', async () => {
    renderPantalla()

    await userEvent.click(await screen.findByRole('button', { name: 'Rechazar' }))

    expect(screen.queryByText('Club de lectura científica')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Participo' }))
    expect(screen.queryByText('Club de lectura científica')).not.toBeInTheDocument()
  })
})
