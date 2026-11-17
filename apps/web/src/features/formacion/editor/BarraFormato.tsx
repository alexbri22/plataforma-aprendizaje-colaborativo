import { ACCIONES, aplicarFormato, type Accion } from './formatoMarkdown'
import styles from './BarraFormato.module.css'

/*
 * Barra de formato sobre un campo de texto (observaciones del 12 de
 * noviembre: escribir sin saberse la sintaxis). Inserta el mismo formato
 * básico que ya admite Markdown.tsx, así que lo guardado no cambia y se sigue
 * viendo igual. Un editor visual completo (WYSIWYG) queda como paso siguiente.
 */

export interface BarraFormatoProps {
  /** El id del textarea que controla. */
  idCampo: string
  valor: string
  onCambiar: (valor: string) => void
  maxLength?: number
  disabled?: boolean
}

export function BarraFormato({
  idCampo,
  valor,
  onCambiar,
  maxLength,
  disabled,
}: BarraFormatoProps) {
  function aplicar(accion: Accion) {
    const campo = document.getElementById(idCampo) as HTMLTextAreaElement | null
    const inicio = campo?.selectionStart ?? valor.length
    const fin = campo?.selectionEnd ?? valor.length
    const resultado = aplicarFormato(valor, inicio, fin, accion)
    if (maxLength !== undefined && resultado.valor.length > maxLength) return
    onCambiar(resultado.valor)
    // Después de que React pinte el valor nuevo, el cursor queda sobre lo
    // insertado para seguir escribiendo.
    requestAnimationFrame(() => {
      campo?.focus()
      campo?.setSelectionRange(resultado.inicio, resultado.fin)
    })
  }

  return (
    <div className={styles.barra} role="toolbar" aria-label="Formato" aria-controls={idCampo}>
      {ACCIONES.map((a) => (
        <button
          key={a.id}
          type="button"
          className={styles.boton}
          disabled={disabled}
          onClick={() => aplicar(a.accion)}
        >
          {a.etiqueta}
        </button>
      ))}
    </div>
  )
}
