import { useEffect, useState } from 'react'

/** Espera a que la persona deje de escribir antes de buscar, para no pedir
 * una página por cada tecla. */
export function useValorDiferido(valor: string, ms = 300): string {
  const [diferido, setDiferido] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setDiferido(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return diferido
}
