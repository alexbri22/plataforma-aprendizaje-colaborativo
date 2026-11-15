/*
 * Formato básico que inserta la barra de formato (BarraFormato.tsx): el mismo
 * que ya interpreta Markdown.tsx.
 */

export type Accion =
  | { tipo: 'linea'; prefijo: string | ((n: number) => string) }
  | { tipo: 'envolver'; antes: string; despues: string; relleno: string }
  | { tipo: 'bloque'; texto: string }

export const ACCIONES: readonly { id: string; etiqueta: string; accion: Accion }[] = [
  { id: 'subtitulo', etiqueta: 'Subtítulo', accion: { tipo: 'linea', prefijo: '## ' } },
  {
    id: 'negritas',
    etiqueta: 'Negritas',

    accion: { tipo: 'envolver', antes: '**', despues: '**', relleno: 'texto en negritas' },
  },
  { id: 'lista', etiqueta: 'Lista', accion: { tipo: 'linea', prefijo: '- ' } },
  {
    id: 'numerada',
    etiqueta: 'Lista numerada',

    accion: { tipo: 'linea', prefijo: (n) => `${n}. ` },
  },
  { id: 'cita', etiqueta: 'Cita', accion: { tipo: 'linea', prefijo: '> ' } },
  {
    id: 'enlace',
    etiqueta: 'Enlace',

    accion: { tipo: 'envolver', antes: '[', despues: '](https://)', relleno: 'texto del enlace' },
  },
  {
    id: 'tabla',
    etiqueta: 'Tabla',

    accion: {
      tipo: 'bloque',
      texto: '| Columna 1 | Columna 2 |\n| --- | --- |\n| Dato | Dato |',
    },
  },
]

interface Resultado {
  valor: string
  inicio: number
  fin: number
}

/** Aplica una acción al texto con la selección [inicio, fin). Exportada para
 * probarla sin el DOM. */
export function aplicarFormato(
  valor: string,
  inicio: number,
  fin: number,
  accion: Accion,
): Resultado {
  if (accion.tipo === 'envolver') {
    const elegido = valor.slice(inicio, fin) || accion.relleno
    const nuevo = `${accion.antes}${elegido}${accion.despues}`
    return {
      valor: valor.slice(0, inicio) + nuevo + valor.slice(fin),
      inicio: inicio + accion.antes.length,
      fin: inicio + accion.antes.length + elegido.length,
    }
  }
  if (accion.tipo === 'bloque') {
    // Un bloque va en su propio párrafo, con una línea en blanco antes y después.
    const antes = valor.slice(0, inicio)
    const despues = valor.slice(fin)
    const separadorAntes =
      antes === '' || antes.endsWith('\n\n') ? '' : antes.endsWith('\n') ? '\n' : '\n\n'
    const separadorDespues =
      despues === '' || despues.startsWith('\n\n') ? '' : despues.startsWith('\n') ? '\n' : '\n\n'
    const insertado = separadorAntes + accion.texto + separadorDespues
    const pos = antes.length + separadorAntes.length
    return {
      valor: antes + insertado + despues,
      inicio: pos,
      fin: pos + accion.texto.length,
    }
  }
  // Por línea: cada línea tocada por la selección recibe el prefijo.
  const desde = valor.lastIndexOf('\n', inicio - 1) + 1
  // Una selección que termina justo después de un salto no toca la línea
  // siguiente.
  const ultimo = fin > inicio && valor[fin - 1] === '\n' ? fin - 1 : fin
  const finLinea = valor.indexOf('\n', ultimo)
  const hasta = finLinea === -1 ? valor.length : finLinea
  const lineas = valor.slice(desde, hasta).split('\n')
  const prefijo = accion.prefijo
  const nuevas = lineas.map(
    (l, i) => (typeof prefijo === 'function' ? prefijo(i + 1) : prefijo) + l,
  )
  const texto = nuevas.join('\n')
  return {
    valor: valor.slice(0, desde) + texto + valor.slice(hasta),
    inicio: desde,
    fin: desde + texto.length,
  }
}
