export type Entrada = number | 'hueco'

/** Páginas a mostrar: siempre la primera y la última, y las vecinas de la
 * actual; lo demás se resume con un hueco (…). */
export function paginasVisibles(pagina: number, total: number): Entrada[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const vecinas = [pagina - 1, pagina, pagina + 1].filter((p) => p > 1 && p < total)
  const numeros = [1, ...vecinas, total]
  const resultado: Entrada[] = []
  for (const n of numeros) {
    const anterior = resultado[resultado.length - 1]
    if (typeof anterior === 'number' && n - anterior > 1) {
      resultado.push(n - anterior === 2 ? anterior + 1 : 'hueco')
    }
    resultado.push(n)
  }
  return resultado
}
