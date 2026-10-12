import { useId } from 'react'
import { infoFase, ORDEN_FASES } from './fase'
import type { FaseActividad } from './tipos'
import styles from './SelectorFase.module.css'

export interface SelectorFaseProps {
  valor: FaseActividad | 'todas'
  onCambiar: (valor: FaseActividad | 'todas') => void
}

// Remplaza el picker de estado por un diagrama de las etapas del ciclo de
// vida (fase.ts, ORDEN_FASES, ya incluye formación de equipos). Cada círculo
// filtra por esa fase; tocar la fase ya activa vuelve a "todos los estados".
// Gris/azul y no el color propio de cada fase (infoFase().variant): esto es
// un filtro, no la píldora de estado de la tarjeta.
export function SelectorFase({ valor, onCambiar }: SelectorFaseProps) {
  const idBase = useId()

  return (
    <div className={styles.selector}>
      <span className={styles.etiquetaGrupo} id={`${idBase}-grupo`}>
        Ver actividades en
      </span>

      <div className={styles.pasos} role="group" aria-labelledby={`${idBase}-grupo`}>
        {ORDEN_FASES.map((fase) => {
          const activo = valor === fase
          const idTexto = `${idBase}-${fase}`

          return (
            <div className={styles.paso} key={fase}>
              <button
                type="button"
                className={[styles.circulo, activo ? styles.circuloActivo : null]
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={activo}
                aria-labelledby={idTexto}
                onClick={() => onCambiar(activo ? 'todas' : fase)}
              />
              <span
                id={idTexto}
                className={[styles.texto, activo ? styles.textoActivo : null]
                  .filter(Boolean)
                  .join(' ')}
              >
                {infoFase(fase).etiqueta}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
