import { afterEach, describe, expect, it, vi } from 'vitest'
import { listarRutas, type ResumenRutaPublica } from './formacion.api'

function ruta(n: number): ResumenRutaPublica {
  return {
    idRuta: `r${n}`,
    titulo: `Ruta ${n}`,
    finalidad: '',
    destacada: false,
    derivado: { elementos: [], nivelInicial: null, duracionMin: 0, numCursos: 0 },
    cursos: [],
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('listarRutas', () => {
  it('recorre todas las páginas del catálogo, no solo la primera', async () => {
    const todas = Array.from({ length: 51 }, (_, i) => ruta(i + 1))
    const fetchFalso = vi.fn(async (url: string) => {
      const pagina = Number(new URL(url, 'http://x').searchParams.get('pagina'))
      const rutas = todas.slice((pagina - 1) * 50, pagina * 50)
      return new Response(
        JSON.stringify({
          rutas,
          paginacion: { pagina, porPagina: 50, total: 51, totalPaginas: 2 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })
    vi.stubGlobal('fetch', fetchFalso)

    const { rutas } = await listarRutas()
    expect(rutas).toHaveLength(51)
    expect(rutas.at(-1)?.idRuta).toBe('r51')
    expect(fetchFalso).toHaveBeenCalledTimes(2)
  })
})
