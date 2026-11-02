import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderConProveedores } from '../../pruebas/conProveedores'
import type { Usuario } from '../cuentas'
import { marcarPistaVista, obtenerPistasVistas } from './ayuda.api'
import { Bienvenida } from './Bienvenida'
import { BotonAyuda } from './BotonAyuda'

// Mismo mock que AppShell.test.tsx: usePistas solo consulta con sesión.
vi.mock('../cuentas/useSesion', async () => {
  const real = await vi.importActual<typeof import('../cuentas/useSesion')>('../cuentas/useSesion')
  const usuario: Usuario = {
    idUsuario: 'u1',
    nombre: 'Ana',
    apellidoPaterno: 'García',
    apellidoMaterno: 'López',
    correo: 'ana@example.com',
    tipoCuenta: 'usuario',
    fotoUrl: null,
  }
  return { ...real, useSesion: () => ({ usuario, cargando: false }) }
})

describe('BotonAyuda', () => {
  beforeEach(() => {
    vi.mocked(marcarPistaVista).mockClear()
  })

  it('la primera vez se abre sola y "Entendido" la marca como vista', async () => {
    vi.mocked(obtenerPistasVistas).mockResolvedValueOnce(['bienvenida'])
    const usuario = userEvent.setup()
    renderConProveedores(<BotonAyuda idPista="equipos" organiza enPausa={false} />)

    expect(await screen.findByRole('dialog', { name: 'Equipos' })).toHaveTextContent(
      /sugiere equipos/,
    )
    await usuario.click(screen.getByRole('button', { name: 'Entendido' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(vi.mocked(marcarPistaVista).mock.calls[0][0]).toBe('equipos')
  })

  it('ya vista, solo se abre al hacer clic, con el texto de quien participa', async () => {
    vi.mocked(obtenerPistasVistas).mockResolvedValueOnce(['bienvenida', 'equipos'])
    const usuario = userEvent.setup()
    renderConProveedores(<BotonAyuda idPista="equipos" organiza={false} enPausa={false} />)

    await waitFor(() => expect(obtenerPistasVistas).toHaveBeenCalled())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Ayuda: Equipos' }))
    expect(screen.getByRole('dialog', { name: 'Equipos' })).toHaveTextContent(
      /únete al que quieras/,
    )
    expect(marcarPistaVista).not.toHaveBeenCalled()
  })

  it('no se abre sola mientras la bienvenida está pendiente', async () => {
    vi.mocked(obtenerPistasVistas).mockResolvedValueOnce([])
    renderConProveedores(<BotonAyuda idPista="equipos" organiza enPausa />)

    await waitFor(() => expect(obtenerPistasVistas).toHaveBeenCalled())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('Bienvenida', () => {
  function montar() {
    return renderConProveedores(
      <Routes>
        <Route path="/" element={<Bienvenida />} />
        <Route path="/actividades/nueva" element={<p>Crear actividad</p>} />
      </Routes>,
    )
  }

  it('elegir Organizar pasa al último paso y lleva ahí al terminar', async () => {
    vi.mocked(obtenerPistasVistas).mockResolvedValueOnce([])
    const usuario = userEvent.setup()
    montar()

    await usuario.click(await screen.findByRole('button', { name: 'Siguiente' }))
    await usuario.click(screen.getByRole('button', { name: /Organizar/ }))

    expect(screen.getByText('Paso 3 de 3')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Crear mi actividad' }))

    expect(await screen.findByText('Crear actividad')).toBeInTheDocument()
    expect(vi.mocked(marcarPistaVista).mock.calls.at(-1)?.[0]).toBe('bienvenida')
  })

  it('no aparece si ya se vio', async () => {
    vi.mocked(obtenerPistasVistas).mockResolvedValueOnce(['bienvenida'])
    montar()

    await waitFor(() => expect(obtenerPistasVistas).toHaveBeenCalled())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
