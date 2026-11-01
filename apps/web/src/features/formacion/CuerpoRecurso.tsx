import { formatoTamano } from './formato'
import { Markdown } from './Markdown'
import { urlArchivo, type RecursoPublico } from './formacion.api'
import styles from './PantallaRecurso.module.css'

function dominio(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function AccionExterna({ href, children }: { href: string; children: string }) {
  return (
    <a className={styles.accion} href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className={styles.srOnly}> (se abre en otra pestaña)</span>
    </a>
  )
}

// Cuerpo según el tipo (§6.2 de docs/diseno-desarrollo-formacion.md). Los
// videos y enlaces no se incrustan: se abren en su sitio, y el video siempre
// lleva su transcripción en la página.
export function CuerpoRecurso({ recurso }: { recurso: RecursoPublico }) {
  const { tipoRecurso, contenido, archivo, transcripcion } = recurso

  return (
    <>
      {tipoRecurso === 'pdf' && archivo ? (
        <div className={styles.bloqueAccion}>
          <AccionExterna href={urlArchivo(archivo)}>Abrir PDF</AccionExterna>
          <span className={styles.detalleAccion}>
            {archivo.nombre} · {formatoTamano(archivo.tamano)}
          </span>
        </div>
      ) : null}

      {(tipoRecurso === 'video' || tipoRecurso === 'enlace') && contenido ? (
        <div className={styles.bloqueAccion}>
          <AccionExterna href={contenido}>
            {tipoRecurso === 'video' ? 'Ver video' : 'Abrir enlace'}
          </AccionExterna>
          <span className={styles.detalleAccion}>{dominio(contenido)}</span>
        </div>
      ) : null}

      {(tipoRecurso === 'texto' || tipoRecurso === 'plantilla') && contenido ? (
        <Markdown fuente={contenido} />
      ) : null}

      {tipoRecurso === 'plantilla' && archivo ? (
        <div className={styles.bloqueAccion}>
          <AccionExterna href={urlArchivo(archivo)}>Descargar plantilla</AccionExterna>
          <span className={styles.detalleAccion}>PDF · {formatoTamano(archivo.tamano)}</span>
        </div>
      ) : null}

      {tipoRecurso === 'pdf' && contenido ? <Markdown fuente={contenido} /> : null}

      {transcripcion ? (
        <section className={styles.transcripcion} aria-labelledby="titulo-transcripcion">
          <h2 id="titulo-transcripcion">Transcripción</h2>
          <Markdown fuente={transcripcion} />
        </section>
      ) : null}
    </>
  )
}
