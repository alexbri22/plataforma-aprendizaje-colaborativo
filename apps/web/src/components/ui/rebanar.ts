// Devuelve los elementos de la página pedida y la página realmente mostrada:
// si la lista se encoge (alguien deja de estar en ella) y la página ya no
// existe, muestra la última en lugar de una página vacía.
export function rebanar<T>(elementos: readonly T[], pagina: number, tamano: number) {
  const ultima = Math.max(0, Math.ceil(elementos.length / tamano) - 1)
  const actual = Math.min(Math.max(0, pagina), ultima)
  return { visibles: elementos.slice(actual * tamano, (actual + 1) * tamano), pagina: actual }
}
