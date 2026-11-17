import { useEffect } from 'react'
import { ETIQUETAS_ACCION_REVISION, type TipoContenido } from '@plataforma/shared'
import type { EntradaHistorial, PropuestaCurso, PropuestaRecurso } from '../formacion.api'
import { formatoFecha } from '../formato'
import { useMarcarAvisoVisto } from '../usePropuestas'
import styles from './AvisoRevision.module.css'

/*
 * Lo que el autor ve arriba de su propuesta (nota del incremento 6): en qué
 * estado está, qué decidió el administrador y por qué, y el historial. Al
 * mostrarse una decisión nueva, se marca como vista: así se apaga el punto
 * de "Mi formación".
 */

const DECISIONES = new Set([
  'aprobada',
  'cambios_solicitados',
  'rechazada',
  'retirada',
  'publicada_de_nuevo',
])

function ultimaDecision(historial: EntradaHistorial[]): EntradaHistorial | null {
  return [...historial].reverse().find((h) => DECISIONES.has(h.accion)) ?? null
}

type Tono = 'neutral' | 'cambios' | 'exito' | 'cerrado'

export function AvisoRevision({
  tipo,
  contenido,
}: {
  tipo: TipoContenido
  contenido: PropuestaRecurso | PropuestaCurso
}) {
  const id = 'idRecurso' in contenido ? contenido.idRecurso : contenido.idCurso
  const { estatus, revision } = contenido
  const decision = ultimaDecision(revision.historial)
  const marcar = useMarcarAvisoVisto()
  const { mutate } = marcar

  useEffect(() => {
    if (revision.decisionSinVer) mutate({ tipo, id })
  }, [revision.decisionSinVer, mutate, tipo, id])

  let tono: Tono = 'neutral'
  let titulo: string
  let texto: string
  switch (estatus) {
    case 'en_revision':
      titulo = 'En revisión'
      texto = `La enviaste${
        revision.fechaEnvio ? ` el ${formatoFecha(revision.fechaEnvio)}` : ''
      }. Mientras se revisa nadie la edita; si necesitas cambiar algo, cancela el envío.`
      break
    case 'cambios_solicitados':
      tono = 'cambios'
      titulo = 'Te pidieron cambios'
      texto = 'Corrige lo que se indica y vuelve a enviarla a revisión.'
      break
    case 'rechazado':
      tono = 'cerrado'
      titulo = 'No se publicó'
      texto = 'Una propuesta rechazada ya no se edita. Puedes eliminarla.'
      break
    case 'publicado':
      tono = 'exito'
      titulo = 'Publicada'
      texto =
        'Ya está en el catálogo, con tu nombre como autor. Desde ahora los cambios los hace el administrador.'
      break
    case 'retirado':
      tono = 'cerrado'
      titulo = 'Retirada del catálogo'
      texto = 'Ya no se muestra en Recursos.'
      break
    default:
      titulo = 'Borrador'
      texto =
        'Solo tú lo ves. Cuando cumpla los mínimos de publicación, envíalo a revisión. Si se publica, tu nombre aparecerá como autor.'
  }

  return (
    <section className={`${styles.aviso} ${styles[tono]}`} aria-labelledby={`aviso-revision-${id}`}>
      <h2 id={`aviso-revision-${id}`} className={styles.titulo}>
        {titulo}
      </h2>
      <p className={styles.texto}>{texto}</p>
      {decision?.motivo ? (
        <blockquote className={styles.motivo}>
          <p className={styles.motivoEtiqueta}>
            {ETIQUETAS_ACCION_REVISION[decision.accion]} · {formatoFecha(decision.fecha)}
          </p>
          <p>{decision.motivo}</p>
        </blockquote>
      ) : null}
      {revision.historial.length > 0 ? (
        <details className={styles.historial}>
          <summary>Historial de la revisión</summary>
          <ol>
            {revision.historial.map((h, i) => (
              <li key={`${h.fecha}-${i}`}>
                <span className={styles.fecha}>{formatoFecha(h.fecha)}</span>{' '}
                {ETIQUETAS_ACCION_REVISION[h.accion]}
                {h.motivo ? <span className={styles.motivoCorto}>: {h.motivo}</span> : null}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  )
}

/** Antes de crear la propuesta: qué pasa con ella. */
export function NotaAutoria() {
  return (
    <p className={styles.nota}>
      Tu propuesta será un borrador que solo tú ves. Cuando la envíes, un administrador la revisa
      antes de publicarla. Si se publica, tu nombre aparecerá como autor.
    </p>
  )
}
