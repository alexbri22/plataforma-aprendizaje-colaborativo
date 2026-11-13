import styles from './BarraProgreso.module.css'

export interface BarraProgresoProps {
  porcentaje: number
  /** Curso terminado: el relleno pasa a Confirmed Green. */
  completo?: boolean
  /** Nombre accesible, por ejemplo "Progreso en Acuerdos claros". */
  etiqueta: string
}

/*
 * Avance en un curso (DESIGN.md, "Course progress"). Sobria a propósito: Study
 * Ink mientras se avanza y Confirmed Green al terminar, nunca Apothecary
 * Amber, que es del reconocimiento. Siempre va junto al texto que resume
 * ("2 de 3 lecciones · 66 %"): la barra sola no basta.
 */
export function BarraProgreso({ porcentaje, completo = false, etiqueta }: BarraProgresoProps) {
  const valor = Math.max(0, Math.min(100, Math.round(porcentaje)))
  return (
    <div
      className={styles.barra}
      role="progressbar"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={valor}
    >
      <span
        className={completo ? styles.rellenoCompleto : styles.relleno}
        style={{ width: `${valor}%` }}
      />
    </div>
  )
}
