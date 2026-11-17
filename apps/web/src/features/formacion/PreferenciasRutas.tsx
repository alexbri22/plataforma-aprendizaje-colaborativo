import { useState } from 'react'
import {
  ELEMENTOS_COLABORACION,
  ETIQUETAS_ELEMENTO,
  MAX_ELEMENTOS_PREFERIDOS,
  type ElementoColaboracion,
} from '@plataforma/shared'
import { AvisoError, Checkbox } from '../../components/ui'
import { useGuardarPreferencias, usePreferencias } from './useProgreso'
import styles from './PantallaRecursos.module.css'

/**
 * "¿Qué quieres fortalecer?": hasta dos elementos de Johnson y Johnson. Es una
 * declaración propia y privada que el recomendador usa como interés; no es una
 * evaluación. Desde las observaciones del 12 de noviembre vive junto a las
 * Rutas recomendadas, que es lo único que la usa, y se guarda al marcar: ya no
 * hay botón "Guardar". Mientras se guarda, las casillas esperan, para que dos
 * clics seguidos no lleguen en desorden.
 *
 * Lo guardado (la consulta) es la única fuente de verdad: las casillas no
 * guardan una copia propia. Si las preferencias cambian en otra pestaña y la
 * consulta se actualiza, el siguiente clic parte de lo guardado y no pisa ese
 * cambio. Mientras se guarda se muestra lo que se mandó; si falla, vuelve solo
 * a lo guardado.
 */
export function PreferenciasRutas() {
  const consulta = usePreferencias()
  if (!consulta.data) return null
  return <FormularioPreferencias guardadas={consulta.data} />
}

function FormularioPreferencias({ guardadas }: { guardadas: ElementoColaboracion[] }) {
  const [guardadoAhora, setGuardadoAhora] = useState(false)
  const guardar = useGuardarPreferencias()
  const elegidos = guardar.isPending ? (guardar.variables ?? guardadas) : guardadas
  const lleno = elegidos.length >= MAX_ELEMENTOS_PREFERIDOS

  function alternar(e: ElementoColaboracion) {
    const nuevos = elegidos.includes(e)
      ? elegidos.filter((x) => x !== e)
      : ELEMENTOS_COLABORACION.filter((x) => x === e || elegidos.includes(x))
    setGuardadoAhora(false)
    guardar.mutate(nuevos, { onSuccess: () => setGuardadoAhora(true) })
  }

  return (
    <div id="preferencias" className={styles.preferencias}>
      <fieldset className={styles.preferenciasCampos}>
        <legend className={styles.preferenciasTitulo}>¿Qué quieres fortalecer?</legend>
        <p className={styles.preferenciasNota}>
          Elige hasta {MAX_ELEMENTOS_PREFERIDOS} y te recomendamos una ruta. Nadie más lo ve y no es
          una evaluación.
        </p>
        <div className={styles.preferenciasOpciones}>
          {ELEMENTOS_COLABORACION.map((e) => (
            <Checkbox
              key={e}
              label={ETIQUETAS_ELEMENTO[e]}
              checked={elegidos.includes(e)}
              disabled={guardar.isPending || (lleno && !elegidos.includes(e))}
              onChange={() => alternar(e)}
            />
          ))}
        </div>
      </fieldset>
      {guardar.isError ? <AvisoError mensaje={guardar.error.message} /> : null}
      <p role="status" className={styles.preferenciasNota}>
        {guardar.isPending
          ? 'Guardando…'
          : guardadoAhora
            ? 'Guardado. La ruta recomendada ya lo toma en cuenta.'
            : ''}
      </p>
    </div>
  )
}
