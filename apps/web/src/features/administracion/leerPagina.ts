/** Página de la URL (?pagina=2); cualquier otro valor es la primera. */
export function leerPagina(valor: string | null): number {
  const n = Number(valor)
  return Number.isInteger(n) && n >= 1 ? n : 1
}
