import { describe, expect, it } from 'vitest'
import { CATEGORIAS_INSIGNIA, NIVELES_INSIGNIA } from '@plataforma/shared'
import {
  duplicadosDeArte,
  emblemaDeInsignia,
  faltantesDeArte,
  ignoradosDeArte,
  nivelDeArchivo,
} from './arteInsignias'

const TOTAL_DE_ARTE = NIVELES_INSIGNIA.length * CATEGORIAS_INSIGNIA.length

describe('nivelDeArchivo', () => {
  it('acepta el nombre escueto', () => {
    expect(nivelDeArchivo('liderazgo', 'bronce')).toBe('bronce')
  })

  it('acepta el nombre con la categoría repetida como prefijo', () => {
    expect(nivelDeArchivo('liderazgo', 'liderazgo_diamante')).toBe('diamante')
    expect(nivelDeArchivo('comunicacion', 'comunicacion_bronce')).toBe('bronce')
  })

  it('no confunde el guion de las categorías compuestas', () => {
    expect(nivelDeArchivo('buen-juicio', 'buen-juicio_platino')).toBe('platino')
  })

  it('rechaza un prefijo que contradice su carpeta, en vez de reubicar el archivo', () => {
    expect(nivelDeArchivo('liderazgo', 'comunicacion_bronce')).toBeNull()
  })
})

describe('arteInsignias', () => {
  it('cubre las seis categorías por cinco niveles: el estado sin rango no lleva arte', () => {
    expect(TOTAL_DE_ARTE).toBe(30)
  })

  it('tiene el lote completo: las seis categorías en los cinco niveles', () => {
    // El lote se completó, así que esto deja de ser una aspiración y pasa a ser
    // una condición: si alguien borra o renombra un archivo, falla aquí y no en
    // una insignia que calladamente cae al emblema vectorial.
    expect(faltantesDeArte()).toEqual([])
  })

  it('resuelve toda combinación del catálogo a un archivo', () => {
    for (const categoria of CATEGORIAS_INSIGNIA) {
      for (const nivel of NIVELES_INSIGNIA) {
        expect(emblemaDeInsignia(categoria, nivel)).toBeTruthy()
      }
    }
  })

  it('enumera los faltantes sin inventar combinaciones fuera del catálogo', () => {
    for (const { categoria, nivel } of faltantesDeArte()) {
      expect(CATEGORIAS_INSIGNIA).toContain(categoria)
      expect(NIVELES_INSIGNIA).toContain(nivel)
    }
  })

  it('no deja archivos sin cargar por nombre inválido', () => {
    expect(ignoradosDeArte()).toEqual([])
  })

  it('no deja dos archivos compitiendo por el mismo emblema', () => {
    expect(duplicadosDeArte()).toEqual([])
  })

  it('no reporta como faltante nada que sí esté resuelto', () => {
    const faltantes = faltantesDeArte()
    const resueltos = CATEGORIAS_INSIGNIA.flatMap((categoria) =>
      NIVELES_INSIGNIA.filter((nivel) => emblemaDeInsignia(categoria, nivel)),
    )

    expect(faltantes.length + resueltos.length).toBe(TOTAL_DE_ARTE)
  })
})
