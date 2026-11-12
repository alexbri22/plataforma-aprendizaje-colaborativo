import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerSesionActual, type Usuario } from '../cuentas/api'
import { marcarLeccion, obtenerMiProgreso, type MiProgresoCurso } from './formacion.api'
import { useMarcarLeccion, useMiProgreso } from './useProgreso'

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  return { ...real, obtenerSesionActual: vi.fn() }
})

vi.mock('./formacion.api', async () => {
  const real = await vi.importActual<typeof import('./formacion.api')>('./formacion.api')
  return { ...real, marcarLeccion: vi.fn(), obtenerMiProgreso: vi.fn() }
})

function usuario(idUsuario: string, nombre: string): Usuario {
  return {
    idUsuario,
    nombre,
    apellidoPaterno: 'Prueba',
    apellidoMaterno: 'Prueba',
    correo: `${idUsuario}@example.com`,
    tipoCuenta: 'usuario',
    fotoUrl: null,
  }
}

const ANA = usuario('u-ana', 'Ana')
const BETO = usuario('u-beto', 'Beto')

function progreso(parcial: Partial<MiProgresoCurso>): MiProgresoCurso {
  return {
    idCurso: 'c1',
    inscrito: true,
    fechaInicio: '2026-11-01T12:00:00.000Z',
    fechaFinalizacion: null,
    leccionesCompletadas: [],
    total: 2,
    completadas: 0,
    porcentaje: 0,
    siguiente: null,
    reflexiones: [],
    ...parcial,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('datos privados por sesión', () => {
  it('la respuesta de una marca de Ana no aparece en lo que ve Beto', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const envoltura = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    vi.mocked(obtenerSesionActual).mockResolvedValue(ANA)
    vi.mocked(obtenerMiProgreso).mockResolvedValue(progreso({ reflexiones: [] }))
    // La marca de Ana tarda: su respuesta llega cuando ya entró Beto.
    let responder: (valor: Awaited<ReturnType<typeof marcarLeccion>>) => void = () => {}
    vi.mocked(marcarLeccion).mockReturnValue(new Promise((r) => (responder = r)))

    const { result } = renderHook(
      () => ({ marcar: useMarcarLeccion('c1'), progreso: useMiProgreso('c1') }),
      { wrapper: envoltura },
    )
    await waitFor(() => expect(result.current.progreso.data).toBeDefined())
    act(() => result.current.marcar.mutate({ idLeccion: 'l1', completada: true }))

    // Entra Beto (como lo hace useSesion al iniciar sesión): su progreso es
    // otro.
    vi.mocked(obtenerMiProgreso).mockResolvedValue(progreso({ inscrito: false }))
    act(() => queryClient.setQueryData(['sesion'], BETO))
    await waitFor(() => expect(result.current.progreso.data?.inscrito).toBe(false))

    // Llega la respuesta de Ana, con su reflexión privada.
    const deAna = progreso({
      leccionesCompletadas: ['l1'],
      completadas: 1,
      porcentaje: 50,
      reflexiones: [
        {
          idLeccion: 'l2',
          texto: 'Privado de Ana',
          fechaActualizacion: '2026-11-01T12:00:00.000Z',
        },
      ],
    })
    await act(async () => responder({ progreso: deAna, cursoCompletadoAhora: false }))

    expect(result.current.progreso.data).toMatchObject({ inscrito: false, reflexiones: [] })
    expect(JSON.stringify(result.current.progreso.data)).not.toContain('Privado de Ana')
  })
})
