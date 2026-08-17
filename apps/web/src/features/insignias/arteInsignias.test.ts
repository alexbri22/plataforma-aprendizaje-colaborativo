import { describe, expect, it } from 'vitest'
import { CATEGORIAS_INSIGNIA, NIVELES_INSIGNIA } from '@plataforma/shared'
import {
  SIN_RANGO,
  arteDeInsignia,
  desubicadosDeArte,
  duplicadosDeArte,
  faltantesDeArte,
  nivelDeArchivo,
  type NivelArte,
} from './arteInsignias'

const TODOS_LOS_NIVELES: NivelArte[] = [...NIVELES_INSIGNIA, SIN_RANGO]
const TOTAL_DE_ARTE = TODOS_LOS_NIVELES.length * CATEGORIAS_INSIGNIA.length

describe('nivelDeArchivo', () => {
  it('acepta el nombre escueto', () => {
    expect(nivelDeArchivo('liderazgo', 'bronce')).toBe('bronce')
    expect(nivelDeArchivo('buen-juicio', 'sin-rango')).toBe('sin-rango')
  })

  it('acepta el nombre con la categoría repetida como prefijo', () => {
    expect(nivelDeArchivo('liderazgo', 'liderazgo_diamante')).toBe('diamante')
    expect(nivelDeArchivo('comunicacion', 'comunicacion_bronce')).toBe('bronce')
  })

  it('no confunde el guion de las categorías y niveles compuestos', () => {
    expect(nivelDeArchivo('buen-juicio', 'buen-juicio_sin-rango')).toBe('sin-rango')
  })

  it('rechaza un prefijo que contradice su carpeta, en vez de reubicar el archivo', () => {
    expect(nivelDeArchivo('liderazgo', 'comunicacion_bronce')).toBeNull()
  })
})

describe('arteInsignias', () => {
  it('cubre las seis categorías por cinco niveles más el estado sin rango', () => {
    expect(TOTAL_DE_ARTE).toBe(36)
  })

  it('devuelve undefined para una combinación cuyo PNG no se ha subido', () => {
    // Mientras el lote esté incompleto, preguntar por lo que falta no debe
    // reventar: el componente decide qué dibujar en su lugar.
    const sinSubir = faltantesDeArte()[0]
    if (!sinSubir) return

    expect(arteDeInsignia(sinSubir.categoria, sinSubir.nivel)).toBeUndefined()
  })

  it('enumera los faltantes sin inventar combinaciones fuera del catálogo', () => {
    for (const { categoria, nivel } of faltantesDeArte()) {
      expect(CATEGORIAS_INSIGNIA).toContain(categoria)
      expect(TODOS_LOS_NIVELES).toContain(nivel)
    }
  })

  it('no deja archivos desubicados en la carpeta', () => {
    expect(desubicadosDeArte()).toEqual([])
  })

  it('no deja dos archivos compitiendo por la misma insignia', () => {
    expect(duplicadosDeArte()).toEqual([])
  })

  it('no reporta como faltante nada que sí esté resuelto', () => {
    const faltantes = faltantesDeArte()
    const resueltos = CATEGORIAS_INSIGNIA.flatMap((categoria) =>
      TODOS_LOS_NIVELES.filter((nivel) => arteDeInsignia(categoria, nivel)),
    )

    expect(faltantes.length + resueltos.length).toBe(TOTAL_DE_ARTE)
  })
})
