import { useId } from 'react'
import { infoFase, ORDEN_FASES } from './fase'
import type { FaseActividad } from './tipos'
import styles from './SelectorFase.module.css'

export interface SelectorFaseProps {
  valor: FaseActividad | 'todas'
  onCambiar: (valor: FaseActividad | 'todas') => void
}

interface Opcion {
  valor: FaseActividad | 'todas'
  etiqueta: string
}

// 'todas' va primero y es el estado por defecto (sin filtro) — antes no
// tenía su propio círculo y solo se volvía a él tocando de nuevo la fase
// activa, lo que no dejaba ver cuál era la opción inicial.
const OPCIONES: Opcion[] = [
  { valor: 'todas', etiqueta: 'Todas' },
  ...ORDEN_FASES.map((fase) => ({ valor: fase, etiqueta: infoFase(fase).etiqueta })),
]

// Remplaza el picker de estado por un diagrama de las etapas del ciclo de
// vida (fase.ts, ORDEN_FASES, ya incluye formación de equipos), con 'todas'
// como primer paso. Cada círculo de fase filtra por esa fase; tocar la fase
// ya activa, o tocar 'todas', vuelve a "todos los estados". Gris/azul y no
// el color propio de cada fase (infoFase().variant): esto es un filtro, no
// la píldora de estado de la tarjeta.
export function SelectorFase({ valor, onCambiar }: SelectorFaseProps) {
  const idBase = useId()

  return (
    <div className={styles.selector}>
      <span className={styles.etiquetaGrupo} id={`${idBase}-grupo`}>
        Ver actividades por etapa
      </span>

      <div className={styles.pasos} role="group" aria-labelledby={`${idBase}-grupo`}>
        {OPCIONES.map((opcion) => {
          const activo = valor === opcion.valor
          const idTexto = `${idBase}-${opcion.valor}`

          return (
            <div className={styles.paso} key={opcion.valor}>
              <button
                type="button"
                className={[styles.circulo, activo ? styles.circuloActivo : null]
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={activo}
                aria-labelledby={idTexto}
                onClick={() =>
                  onCambiar(opcion.valor === 'todas' || activo ? 'todas' : opcion.valor)
                }
              />
              <span
                id={idTexto}
                className={[styles.texto, activo ? styles.textoActivo : null]
                  .filter(Boolean)
                  .join(' ')}
              >
                {opcion.etiqueta}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
