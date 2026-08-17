import { CATEGORIAS_INSIGNIA, NIVELES_INSIGNIA } from '@plataforma/shared'
import type { CategoriaInsignia, NivelInsignia } from '@plataforma/shared'

/*
 * Resuelve el emblema de una categoría en un nivel: el disco que va DENTRO del
 * marco, no la insignia completa. El marco lo pone `MarcoRango`.
 *
 * No hay emblema para el estado sin nivel. Una categoría que aún no se gana se
 * dibuja con el hueco punteado del marco y el emblema vectorial en gris, de modo
 * que el arte solo cubre los cinco niveles: 5 × 6 = 30 archivos.
 *
 * El mapa se arma con `import.meta.glob` y no con imports estáticos por dos
 * razones. Treinta combinaciones escritas a mano son una lista que se
 * desincroniza del disco en cuanto alguien agrega o renombra un archivo. Y un
 * import estático de un archivo inexistente rompe el build: mientras el arte se
 * sube por tandas, eso dejaría el proyecto sin compilar hasta tener las 30
 * piezas. Aquí, lo que falta simplemente no está en el mapa y quien pregunta
 * recibe undefined.
 */

const ARCHIVOS = import.meta.glob<string>('./assets/insignias/*/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})

const RUTA = /\/assets\/insignias\/([^/]+)\/([^/]+)\.png$/

const NIVELES_VALIDOS: readonly string[] = NIVELES_INSIGNIA

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

export type MotivoIgnorado = 'prefijo-no-coincide' | 'nivel-desconocido'

export interface ArchivoIgnorado {
  readonly archivo: string
  readonly motivo: MotivoIgnorado
}

const ARTE = new Map<string, string>()
const ORIGEN = new Map<string, string>()
const IGNORADOS: ArchivoIgnorado[] = []
const DUPLICADOS: string[][] = []

for (const [ruta, url] of Object.entries(ARCHIVOS)) {
  const partes = RUTA.exec(ruta)
  if (!partes) continue

  const [, carpeta, archivo] = partes
  const nombre = `${carpeta}/${archivo}.png`
  const nivel = nivelDeArchivo(carpeta, archivo)

  if (!nivel) {
    IGNORADOS.push({ archivo: nombre, motivo: 'prefijo-no-coincide' })
    continue
  }

  // Un `sin-rango.png` heredado de la versión anterior cae aquí: ya no se usa,
  // y decirlo es mejor que cargarlo en una casilla que nadie consulta.
  if (!NIVELES_VALIDOS.includes(nivel)) {
    IGNORADOS.push({ archivo: nombre, motivo: 'nivel-desconocido' })
    continue
  }

  const clave = `${carpeta}/${nivel}`
  const anterior = ORIGEN.get(clave)

  // Las dos formas de nombre admitidas describen el mismo emblema, así que
  // `bronce.png` y `comunicacion_bronce.png` en la misma carpeta compiten por
  // la misma casilla. Quedarse con uno en silencio deja al otro sin efecto y
  // vuelve el resultado dependiente del orden en que el bundler lea la carpeta.
  if (anterior) DUPLICADOS.push([anterior, nombre])

  ORIGEN.set(clave, nombre)
  ARTE.set(clave, url)
}

/**
 * Archivos que no se cargan, con el motivo. Sin esta lista, un archivo mal
 * nombrado se manifestaría como una insignia que sigue faltando, que es el
 * síntoma más lejano posible de su causa.
 */
export function ignoradosDeArte(): readonly ArchivoIgnorado[] {
  return IGNORADOS
}

/**
 * Pares de archivos que describen el mismo emblema por usar las dos formas de
 * nombre a la vez. Solo uno queda en efecto, y cuál depende del orden de lectura
 * de la carpeta: hay que borrar el sobrante.
 */
export function duplicadosDeArte(): readonly (readonly string[])[] {
  return DUPLICADOS
}

/** URL del emblema, o undefined si ese archivo todavía no se ha subido. */
export function emblemaDeInsignia(
  categoria: CategoriaInsignia,
  nivel: NivelInsignia,
): string | undefined {
  return ARTE.get(`${categoria}/${nivel}`)
}

export interface FaltanteDeArte {
  readonly categoria: CategoriaInsignia
  readonly nivel: NivelInsignia
}

/**
 * Combinaciones sin archivo, en el orden del catálogo. Existe para que la
 * pantalla de muestra pueda decir qué falta por subir en lugar de que el hueco
 * se lea como un defecto, y para que una prueba pueda afirmar que ya no falta
 * nada el día que se complete el lote.
 */
export function faltantesDeArte(): FaltanteDeArte[] {
  return CATEGORIAS_INSIGNIA.flatMap((categoria) =>
    NIVELES_INSIGNIA.filter((nivel) => !emblemaDeInsignia(categoria, nivel)).map((nivel) => ({
      categoria,
      nivel,
    })),
  )
}
