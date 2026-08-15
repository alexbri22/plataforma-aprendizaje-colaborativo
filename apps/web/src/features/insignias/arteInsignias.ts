import { CATEGORIAS_INSIGNIA, NIVELES_INSIGNIA } from '@plataforma/shared'
import type { CategoriaInsignia, NivelInsignia } from '@plataforma/shared'

/*
 * Resuelve el PNG de una insignia a partir de su categoría y su nivel.
 *
 * El mapa se arma con `import.meta.glob` y no con imports estáticos por dos
 * razones. Son 36 combinaciones, y escribirlas a mano es una lista que se
 * desincroniza del disco en cuanto alguien agrega o renombra un archivo. Y un
 * import estático de un archivo inexistente rompe el build: mientras el arte se
 * sube por tandas, eso dejaría el proyecto sin compilar hasta tener las 36
 * piezas. Aquí, lo que falta simplemente no está en el mapa y quien pregunta
 * recibe undefined.
 */

/** Una categoría sin puntos suficientes no tiene nivel, pero sí tiene arte
 * propio: es el estado "todavía no", no la ausencia de insignia. */
export const SIN_RANGO = 'sin-rango'

export type NivelArte = NivelInsignia | typeof SIN_RANGO

const ARCHIVOS = import.meta.glob<string>('./assets/insignias/*/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})

const RUTA = /\/assets\/insignias\/([^/]+)\/([^/]+)\.png$/

const ARTE = new Map<string, string>(
  Object.entries(ARCHIVOS).flatMap(([ruta, url]) => {
    const partes = RUTA.exec(ruta)
    return partes ? [[`${partes[1]}/${partes[2]}`, url] as const] : []
  }),
)

/** URL del PNG, o undefined si ese archivo todavía no se ha subido. */
export function arteDeInsignia(categoria: CategoriaInsignia, nivel: NivelArte): string | undefined {
  return ARTE.get(`${categoria}/${nivel}`)
}

export interface FaltanteDeArte {
  readonly categoria: CategoriaInsignia
  readonly nivel: NivelArte
}

/**
 * Combinaciones sin archivo, en el orden del catálogo. Existe para que la
 * pantalla de muestra pueda decir qué falta por subir en lugar de que el hueco
 * se lea como un defecto, y para que una prueba pueda afirmar que ya no falta
 * nada el día que se complete el lote.
 */
export function faltantesDeArte(): FaltanteDeArte[] {
  const niveles: NivelArte[] = [...NIVELES_INSIGNIA, SIN_RANGO]

  return CATEGORIAS_INSIGNIA.flatMap((categoria) =>
    niveles
      .filter((nivel) => !arteDeInsignia(categoria, nivel))
      .map((nivel) => ({ categoria, nivel })),
  )
}
