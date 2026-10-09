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

function renderPantalla(rol: 'organizo' | 'participo') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PantallaMisActividades rol={rol} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PantallaMisActividades', () => {
  beforeEach(() => {
    actividades = [...ACTIVIDADES_PRUEBA]
  })

  describe('rol="organizo"', () => {
    it('muestra en una sola lista las actividades que organizo, sin importar su estado', async () => {
      renderPantalla('organizo')

      expect(await screen.findByText('Proyecto de ecosistemas')).toBeInTheDocument()
      expect(screen.getByText('Curso de introducción a bases de datos')).toBeInTheDocument()
      expect(screen.getByText('Taller de retroalimentación entre pares')).toBeInTheDocument()
      expect(screen.queryByText('Debate de genética')).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
    })

    it('tiene como única acción crear actividad', async () => {
      renderPantalla('organizo')

      await screen.findByText('Proyecto de ecosistemas')
      expect(screen.getByRole('link', { name: 'Crear actividad' })).toHaveAttribute(
        'href',
        '/actividades/nueva',
      )
      expect(screen.queryByRole('link', { name: 'Unirse con clave' })).not.toBeInTheDocument()
    })

    it('cada tarjeta trae el nombre como título y el objetivo como descripción', async () => {
      renderPantalla('organizo')

      const titulo = await screen.findByRole('heading', { name: 'Proyecto de ecosistemas' })
      const tarjeta = titulo.closest('a') as HTMLElement
      expect(
        within(tarjeta).getByText(
          'Investigar y presentar el impacto humano en un ecosistema local.',
        ),
      ).toBeInTheDocument()
      // El estado (antes una píldora sobre el título) se quitó de la tarjeta
      // a pedido de producto; vuelve en otra forma, todavía por definir.
      expect(within(tarjeta).queryByText('Inscripción')).not.toBeInTheDocument()
    })

    it('filtra por estado al tocar su círculo, y vuelve a ver todas al tocarlo de nuevo', async () => {
      renderPantalla('organizo')

      await screen.findByText('Proyecto de ecosistemas')
      const circuloDesarrollo = screen.getByRole('button', { name: 'En desarrollo' })
      await userEvent.click(circuloDesarrollo)

      expect(circuloDesarrollo).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByText('Taller de retroalimentación entre pares')).toBeInTheDocument()
      expect(screen.queryByText('Proyecto de ecosistemas')).not.toBeInTheDocument()
      expect(screen.queryByText('Curso de introducción a bases de datos')).not.toBeInTheDocument()

      await userEvent.click(circuloDesarrollo)

      expect(circuloDesarrollo).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByText('Proyecto de ecosistemas')).toBeInTheDocument()
      expect(screen.getByText('Curso de introducción a bases de datos')).toBeInTheDocument()
    })

    it('avisa cuando ninguna actividad tiene el estado elegido', async () => {
      renderPantalla('organizo')

      await screen.findByText('Proyecto de ecosistemas')
      await userEvent.click(screen.getByRole('button', { name: 'Cierre' }))

      expect(
        screen.getByText('Ninguna actividad coincide con tu búsqueda o filtro.'),
      ).toBeInTheDocument()
    })

    it('busca por nombre sin distinguir mayúsculas ni acentos', async () => {
      renderPantalla('organizo')

      await screen.findByText('Proyecto de ecosistemas')
      await userEvent.type(screen.getByLabelText('Buscar actividades'), 'RETROALIMENTACION')

      expect(screen.getByText('Taller de retroalimentación entre pares')).toBeInTheDocument()
      expect(screen.queryByText('Proyecto de ecosistemas')).not.toBeInTheDocument()
    })

    it('busca por clave de ingreso', async () => {
      renderPantalla('organizo')

      await screen.findByText('Proyecto de ecosistemas')
      await userEvent.type(screen.getByLabelText('Buscar actividades'), 'eco4h7kp')

      expect(screen.getByText('Proyecto de ecosistemas')).toBeInTheDocument()
      expect(screen.queryByText('Curso de introducción a bases de datos')).not.toBeInTheDocument()
    })

    it('ya no busca por el texto del objetivo', async () => {
      renderPantalla('organizo')

      // "impacto" solo aparece en el objetivo de "Proyecto de ecosistemas"
      // (ver actividades.fixtures.ts), no en su nombre, clave ni organizador.
      await screen.findByText('Proyecto de ecosistemas')
      await userEvent.type(screen.getByLabelText('Buscar actividades'), 'impacto')

      expect(
        screen.getByText('Ninguna actividad coincide con tu búsqueda o filtro.'),
      ).toBeInTheDocument()
    })

    it('combina la búsqueda con el filtro por estado', async () => {
      renderPantalla('organizo')

      await screen.findByText('Proyecto de ecosistemas')
      await userEvent.type(screen.getByLabelText('Buscar actividades'), 'proyecto')
      await userEvent.click(screen.getByRole('button', { name: 'En desarrollo' }))

      expect(
        screen.getByText('Ninguna actividad coincide con tu búsqueda o filtro.'),
      ).toBeInTheDocument()
    })

    it('limpia búsqueda y filtro desde el estado sin resultados', async () => {
      renderPantalla('organizo')

      await screen.findByText('Proyecto de ecosistemas')
      await userEvent.type(screen.getByLabelText('Buscar actividades'), 'zzz')
      const circuloDesarrollo = screen.getByRole('button', { name: 'En desarrollo' })
      await userEvent.click(circuloDesarrollo)
      await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

      expect(screen.getByLabelText('Buscar actividades')).toHaveValue('')
      expect(circuloDesarrollo).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByText('Proyecto de ecosistemas')).toBeInTheDocument()
    })
  })

  describe('rol="participo"', () => {
    it('muestra solo las actividades en las que participo', async () => {
      renderPantalla('participo')

      expect(await screen.findByText('Debate de genética')).toBeInTheDocument()
      expect(screen.getByText('Proyecto integrador de biología')).toBeInTheDocument()
      expect(screen.queryByText('Proyecto de ecosistemas')).not.toBeInTheDocument()
    })

    it('tiene como única acción unirse con clave', async () => {
      renderPantalla('participo')

      await screen.findByText('Debate de genética')
      expect(screen.getByRole('link', { name: 'Unirse con clave' })).toHaveAttribute(
        'href',
        '/actividades/unirse',
      )
      expect(screen.queryByRole('link', { name: 'Crear actividad' })).not.toBeInTheDocument()
    })

    it('busca por nombre de quien organiza', async () => {
      renderPantalla('participo')

      await screen.findByText('Debate de genética')
      await userEvent.type(screen.getByLabelText('Buscar actividades'), 'sofía ramírez')

      expect(screen.getByText('Proyecto integrador de biología')).toBeInTheDocument()
      expect(screen.queryByText('Debate de genética')).not.toBeInTheDocument()
    })
  })

  it('cuando no organiza ninguna actividad, invita a crear la primera', async () => {
    actividades = ACTIVIDADES_PRUEBA.filter((a) => a.rol === 'participante')
    renderPantalla('organizo')

    expect(
      await screen.findByText(
        'Todavía no organizas ninguna actividad. Crea la primera para empezar.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Crear actividad' })).toBeInTheDocument()
  })

  it('cuando no participa en ninguna actividad, invita a unirse con una clave', async () => {
    actividades = ACTIVIDADES_PRUEBA.filter((a) => a.rol !== 'participante')
    renderPantalla('participo')

    expect(
      await screen.findByText(
        'Todavía no participas en ninguna actividad. Únete con la clave que te compartieron.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Unirse con clave' })).toBeInTheDocument()
  })
})
