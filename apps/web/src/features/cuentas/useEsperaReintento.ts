import { useCallback, useEffect, useState } from 'react'

/** "12 minutos", "1 minuto", "45 segundos": lo que falta, redondeado hacia
 * arriba para no prometer que ya se puede antes de tiempo. */
export function describirEspera(segundos: number): string {
  if (segundos >= 60) {
    const minutos = Math.ceil(segundos / 60)
    return minutos === 1 ? '1 minuto' : `${minutos} minutos`
  }
  return segundos === 1 ? '1 segundo' : `${segundos} segundos`
}

/** "11:58": la cuenta regresiva del botón mientras no se puede reintentar. */
export function formatearCuentaRegresiva(segundos: number): string {
  const minutos = Math.floor(segundos / 60)
  return `${minutos}:${String(segundos % 60).padStart(2, '0')}`
}

// Tras un 429 el formulario no sirve hasta que el servidor reinicie el
// conteo: en vez de dejar que la persona siga intentando a ciegas, se lleva
// la cuenta regresiva aquí y el formulario se deshabilita hasta que llegue
// a cero.
export function useEsperaReintento() {
  const [hasta, setHasta] = useState<number | null>(null)
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    if (hasta === null) return
    const intervalo = window.setInterval(() => {
      const momento = Date.now()
      setAhora(momento)
      if (momento >= hasta) setHasta(null)
    }, 1000)
    return () => window.clearInterval(intervalo)
  }, [hasta])

  const iniciar = useCallback((segundos: number) => {
    const momento = Date.now()
    setAhora(momento)
    setHasta(momento + segundos * 1000)
  }, [])

  const segundosRestantes = hasta === null ? 0 : Math.max(0, Math.ceil((hasta - ahora) / 1000))

  return { esperando: segundosRestantes > 0, segundosRestantes, iniciar }
}
