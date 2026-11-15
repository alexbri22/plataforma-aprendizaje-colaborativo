import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerSesionActual } from '../cuentas/api'
import { ErrorFormacion, verificarConstancia, type ConstanciaVerificada } from './formacion.api'
import { PantallaConstancia } from './PantallaConstancia'

vi.mock('../cuentas/api', async () => {
  const real = await vi.importActual<typeof import('../cuentas/api')>('../cuentas/api')
  return { ...real, obtenerSesionActual: vi.fn() }
})

vi.mock('./formacion.api', async () => {
  const real = await vi.importActual<typeof import('./formacion.api')>('./formacion.api')
  return { ...real, verificarConstancia: vi.fn() }
})

const CURSO: ConstanciaVerificada = {
  folio: 'CO3-7KQM-4XPA',
  tipo: 'curso',
  titulo: 'Acuerdos y responsabilidades claras',
  numCursos: 0,
  fechaFinalizacion: '2026-11-02T18:00:00.000Z',
  idCurso: 'c1',
  idRuta: null,
  nombre: 'Ana García López',
  elementos: ['responsabilidades', 'interdependencia_positiva'],
  duracionMin: 35,
  titulosCursos: [],
  fechaEmision: '2026-11-02T18:00:00.000Z',
  enCatalogo: true,
}

function renderEn(folio: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const usuario = userEvent.setup()
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/constancias/${folio}`]}>
        <Routes>
          <Route path="/constancias/:folio" element={<PantallaConstancia />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return usuario
}

beforeAll(() => {
  // jsdom no implementa la impresión.
  window.print = vi.fn()
})

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  // Pública: se abre sin sesión.
  vi.mocked(obtenerSesionActual).mockResolvedValue(null)
  vi.mocked(verificarConstancia).mockResolvedValue(CURSO)
})

describe('constancia verificada', () => {
  it('dice a quién, qué y cuándo, y lo que no es', async () => {
    renderEn('CO3-7KQM-4XPA')

    expect(
      await screen.findByRole('heading', { name: 'Constancia de finalización' }),
    ).toBeInTheDocument()
    expect(verificarConstancia).toHaveBeenCalledWith('CO3-7KQM-4XPA')
    expect(screen.getByText('Ana García López')).toBeInTheDocument()
    expect(screen.getByText('terminó todas las lecciones del curso')).toBeInTheDocument()
    expect(screen.getByText('Acuerdos y responsabilidades claras')).toBeInTheDocument()
    expect(screen.getByText(/2 de noviembre de 2026/)).toBeInTheDocument()
    expect(
      screen.getByText('Trabaja: Responsabilidades claras · Interdependencia positiva'),
    ).toBeInTheDocument()
    expect(screen.getByText(/Emitida por Co3 · Folio/)).toHaveTextContent('CO3-7KQM-4XPA')
    expect(screen.getByText(/No es un documento oficial ni una calificación/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver el curso' })).toHaveAttribute('href', '/cursos/c1')
  })

  it('no se indexa', async () => {
    renderEn('CO3-7KQM-4XPA')
    await screen.findByRole('heading', { name: 'Constancia de finalización' })
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
  })

  it('una ruta que ya no se ofrece sigue valiendo, con sus cursos', async () => {
    vi.mocked(verificarConstancia).mockResolvedValue({
      ...CURSO,
      tipo: 'ruta',
      titulo: 'Organización y corresponsabilidad',
      numCursos: 2,
      idCurso: null,
      idRuta: 'r1',
      titulosCursos: ['Acuerdos', 'Reuniones'],
      enCatalogo: false,
    })
    renderEn('CO3-7KQM-4XPA')

    expect(
      await screen.findByText('terminó todos los cursos de la ruta de aprendizaje'),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Acuerdos',
      'Reuniones',
    ])
    expect(screen.getByText(/Esta ruta ya no se ofrece en el catálogo/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver la ruta' })).not.toBeInTheDocument()
  })

  it('se imprime y se copia su enlace', async () => {
    const usuario = renderEn('CO3-7KQM-4XPA')

    await usuario.click(await screen.findByRole('button', { name: 'Imprimir o guardar como PDF' }))
    expect(window.print).toHaveBeenCalled()

    await usuario.click(screen.getByRole('button', { name: 'Copiar enlace' }))
    expect(await screen.findByText('Enlace copiado.')).toBeInTheDocument()
  })
})

describe('folio que no existe', () => {
  it('lo explica sin decir más', async () => {
    vi.mocked(verificarConstancia).mockRejectedValue(
      new ErrorFormacion('No encontramos una constancia con ese folio.', 404),
    )
    renderEn('CO3-0000-0000')

    expect(
      await screen.findByRole('heading', { name: 'No encontramos esta constancia' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })

  it('otro error ofrece reintentar', async () => {
    vi.mocked(verificarConstancia).mockRejectedValue(new ErrorFormacion('Sin conexión'))
    renderEn('CO3-7KQM-4XPA')

    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.getByText('Sin conexión')).toBeInTheDocument()
  })
})
