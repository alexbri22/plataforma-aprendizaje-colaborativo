import {
  BLOQUES_BITACORA,
  LONGITUD_MAXIMA_RESPUESTA_BITACORA,
  type ClavePreguntaBitacora,
  type RespuestasBitacora,
} from '@plataforma/shared'
import { Textarea } from '../../components/ui'
import styles from './CamposBitacora.module.css'

// Bitácora guiada (nucleo §9.3): un campo por pregunta, en los tres bloques
// del documento de evaluaciones. Ninguno es obligatorio por separado; la
// entrada necesita al menos uno (validarRespuestasBitacora, compartida con
// el servidor). Controlado: el dueño del borrador es el formulario que lo usa.
export function CamposBitacora({
  respuestas,
  onCambiar,
  errores,
}: {
  respuestas: RespuestasBitacora
  onCambiar: (clave: ClavePreguntaBitacora, texto: string) => void
  errores?: Record<string, string>
}) {
  return (
    <div className={styles.bloques}>
      {BLOQUES_BITACORA.map((bloque) => (
        <fieldset key={bloque.clave} className={styles.bloque}>
          <legend className={styles.titulo}>{bloque.titulo}</legend>
          {bloque.preguntas.map((pregunta) => (
            <Textarea
              key={pregunta.clave}
              label={pregunta.texto}
              rows={2}
              value={respuestas[pregunta.clave] ?? ''}
              onChange={(e) => onCambiar(pregunta.clave, e.target.value)}
              maxLength={LONGITUD_MAXIMA_RESPUESTA_BITACORA}
              error={errores?.[pregunta.clave]}
            />
          ))}
        </fieldset>
      ))}
    </div>
  )
}

// Lectura de una entrada guiada: solo las preguntas respondidas, agrupadas
// por bloque; un bloque sin respuestas no aparece.
export function RespuestasDeBitacora({ respuestas }: { respuestas: RespuestasBitacora }) {
  return (
    <div className={styles.bloques}>
      {BLOQUES_BITACORA.map((bloque) => {
        const respondidas = bloque.preguntas.filter((pregunta) => respuestas[pregunta.clave])
        if (respondidas.length === 0) return null
        return (
          <section key={bloque.clave} className={styles.bloque}>
            <h3 className={styles.titulo}>{bloque.titulo}</h3>
            <dl className={styles.lista}>
              {respondidas.map((pregunta) => (
                <div key={pregunta.clave} className={styles.par}>
                  <dt className={styles.pregunta}>{pregunta.texto}</dt>
                  <dd className={styles.respuesta}>{respuestas[pregunta.clave]}</dd>
                </div>
              ))}
            </dl>
          </section>
        )
      })}
    </div>
  )
}
