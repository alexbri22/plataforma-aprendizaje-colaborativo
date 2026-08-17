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

/**
 * Extrae el nivel del nombre de archivo. Se aceptan dos formas: `bronce.png`, y
 * `liderazgo_bronce.png` con el nombre de la carpeta repetido como prefijo. La
 * segunda es redundante dentro del árbol, pero fuera de él —en una descarga, en
 * una pestaña del editor, en un adjunto— es la diferencia entre un archivo que
 * se identifica solo y seis llamados `bronce.png`.
 *
 * Devuelve null si el prefijo no coincide con su carpeta. Ese caso es un archivo
 * mal colocado, y aceptarlo lo colgaría de la categoría equivocada sin que nada
 * lo señale: `liderazgo/comunicacion_bronce.png` se leería como el bronce de
 * liderazgo. Ni las categorías ni los niveles usan guion bajo, así que partir por
 * el primero no tiene ambigüedad.
 */
export function nivelDeArchivo(carpeta: string, archivo: string): string | null {
  const separador = archivo.indexOf('_')
  if (separador === -1) return archivo

  const prefijo = archivo.slice(0, separador)
  return prefijo === carpeta ? archivo.slice(separador + 1) : null
}

const ARTE = new Map<string, string>()
const ORIGEN = new Map<string, string>()
const DESUBICADOS: string[] = []
const DUPLICADOS: string[][] = []

for (const [ruta, url] of Object.entries(ARCHIVOS)) {
  const partes = RUTA.exec(ruta)
  if (!partes) continue

  const [, carpeta, archivo] = partes
  const nivel = nivelDeArchivo(carpeta, archivo)

  if (!nivel) {
    DESUBICADOS.push(`${carpeta}/${archivo}.png`)
    continue
  }

  const clave = `${carpeta}/${nivel}`
  const anterior = ORIGEN.get(clave)

  // Las dos formas de nombre admitidas describen la misma insignia, así que
  // `bronce.png` y `comunicacion_bronce.png` en la misma carpeta compiten por
  // la misma casilla. Quedarse con uno en silencio deja al otro sin efecto y
  // vuelve el resultado dependiente del orden en que el bundler lea la carpeta.
  if (anterior) DUPLICADOS.push([anterior, `${carpeta}/${archivo}.png`])

  ORIGEN.set(clave, `${carpeta}/${archivo}.png`)
  ARTE.set(clave, url)
}

/**
 * Archivos cuyo prefijo contradice la carpeta en la que están. No se cargan, y
 * la pantalla de muestra los enseña: sin eso, un archivo mal colocado se
 * manifestaría como una insignia que sigue faltando, que es el síntoma más
 * lejano posible de su causa.
 */
export function desubicadosDeArte(): readonly string[] {
  return DESUBICADOS
}

/**
 * Pares de archivos que describen la misma insignia por usar las dos formas de
 * nombre a la vez. Solo uno queda en efecto, y cuál depende del orden de lectura
 * de la carpeta: hay que borrar el sobrante.
 */
export function duplicadosDeArte(): readonly (readonly string[])[] {
  return DUPLICADOS
}

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
