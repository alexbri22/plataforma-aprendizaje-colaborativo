// Análisis por bloques del subconjunto de markdown que usa el contenido
// formativo (ver Markdown.tsx). Separado del componente para poder probarlo
// sin renderizar y porque Fast Refresh exige que un .tsx solo exporte
// componentes.

export type Bloque =
  | { tipo: 'encabezado'; nivel: 2 | 3 | 4; texto: string }
  | { tipo: 'parrafo'; texto: string }
  | { tipo: 'lista'; ordenada: boolean; elementos: string[] }
  | { tipo: 'cita'; texto: string }
  | { tipo: 'tabla'; encabezados: string[]; filas: string[][] }

const RE_ENCABEZADO = /^(#{1,3})\s+(.*)$/
const RE_VINETA = /^[-*]\s+(.*)$/
const RE_NUMERADA = /^\d+[.)]\s+(.*)$/
const RE_CITA = /^>\s?(.*)$/
const RE_FILA_TABLA = /^\|(.*)\|\s*$/
const RE_SEPARADOR_TABLA = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/

function celdas(linea: string): string[] {
  return linea
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim())
}

export function analizarBloques(fuente: string): Bloque[] {
  const lineas = fuente.replace(/\r\n?/g, '\n').split('\n')
  const bloques: Bloque[] = []
  let i = 0

  while (i < lineas.length) {
    const linea = lineas[i].trimEnd()
    if (!linea.trim()) {
      i++
      continue
    }

    const encabezado = RE_ENCABEZADO.exec(linea)
    if (encabezado) {
      bloques.push({
        tipo: 'encabezado',
        nivel: (encabezado[1].length + 1) as 2 | 3 | 4,
        texto: encabezado[2],
      })
      i++
      continue
    }

    if (RE_FILA_TABLA.test(linea) && RE_SEPARADOR_TABLA.test(lineas[i + 1] ?? '')) {
      const encabezados = celdas(linea)
      const filas: string[][] = []
      i += 2
      while (i < lineas.length && RE_FILA_TABLA.test(lineas[i].trimEnd())) {
        filas.push(celdas(lineas[i]))
        i++
      }
      bloques.push({ tipo: 'tabla', encabezados, filas })
      continue
    }

    const ordenada = RE_NUMERADA.test(linea)
    if (ordenada || RE_VINETA.test(linea)) {
      const re = ordenada ? RE_NUMERADA : RE_VINETA
      const elementos: string[] = []
      while (i < lineas.length && re.test(lineas[i].trimEnd())) {
        elementos.push(re.exec(lineas[i].trimEnd())![1])
        i++
      }
      bloques.push({ tipo: 'lista', ordenada, elementos })
      continue
    }

    if (RE_CITA.test(linea)) {
      const partes: string[] = []
      while (i < lineas.length && RE_CITA.test(lineas[i].trimEnd())) {
        partes.push(RE_CITA.exec(lineas[i].trimEnd())![1])
        i++
      }
      bloques.push({ tipo: 'cita', texto: partes.join(' ') })
      continue
    }

    // Párrafo: líneas seguidas hasta una en blanco o el inicio de otro bloque.
    const partes: string[] = []
    while (i < lineas.length) {
      const actual = lineas[i].trimEnd()
      if (
        !actual.trim() ||
        RE_ENCABEZADO.test(actual) ||
        RE_VINETA.test(actual) ||
        RE_NUMERADA.test(actual) ||
        RE_CITA.test(actual) ||
        RE_FILA_TABLA.test(actual)
      ) {
        break
      }
      partes.push(actual.trim())
      i++
    }
    if (partes.length === 0) {
      // Una fila de tabla suelta, sin separador: se muestra como texto.
      partes.push(linea.trim())
      i++
    }
    bloques.push({ tipo: 'parrafo', texto: partes.join(' ') })
  }

  return bloques
}
