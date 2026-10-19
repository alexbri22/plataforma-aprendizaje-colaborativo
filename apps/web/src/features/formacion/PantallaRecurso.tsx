import { Link, useParams } from 'react-router-dom'
import { ETIQUETAS_AREA, ETIQUETAS_ELEMENTO, ETIQUETAS_SECCION } from '@plataforma/shared'
import { AvisoError, Badge, Button, IconoCargando } from '../../components/ui'
import { etiquetaTipo, formatoDuracion, formatoTamano } from './formato'
import { MarcoFormacion } from './MarcoFormacion'
import { useDentroDeApp } from './marcoContexto'
import { Markdown } from './Markdown'
import { ErrorFormacion, urlArchivo, type RecursoPublico } from './formacion.api'
import { useRecursoPublico } from './useRecursos'
import styles from './PantallaRecurso.module.css'

const FECHA = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' })

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
function Cuerpo({ recurso }: { recurso: RecursoPublico }) {
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

export function PantallaRecurso() {
  return (
    <MarcoFormacion titulo="Recursos">
      <DetalleRecurso />
    </MarcoFormacion>
  )
}

function DetalleRecurso() {
  const Titulo = useDentroDeApp() ? 'h2' : 'h1'
  const { id = '' } = useParams()
  const consulta = useRecursoPublico(id)

  return (
    <div className={styles.pagina}>
      <Link to="/recursos" className={styles.volver}>
        ← Todos los recursos
      </Link>

      {consulta.isPending ? (
        <div className={styles.estado} role="status" aria-label="Cargando recurso">
          <IconoCargando size={24} />
        </div>
      ) : null}

      {consulta.isError ? (
        <div className={styles.estado}>
          {consulta.error instanceof ErrorFormacion && consulta.error.status === 404 ? (
            <>
              <Titulo className={styles.titulo}>No encontramos este recurso</Titulo>
              <p className={styles.resumen}>
                Puede que se haya retirado o que el enlace esté incompleto.
              </p>
              <Button variant="secondary" to="/recursos">
                Ver todos los recursos
              </Button>
            </>
          ) : (
            <>
              <AvisoError mensaje={consulta.error.message} />
              <Button variant="secondary" size="sm" onClick={() => void consulta.refetch()}>
                Reintentar
              </Button>
            </>
          )}
        </div>
      ) : null}

      {consulta.data ? (
        <article className={styles.articulo}>
          <header className={styles.cabecera}>
            <p className={styles.eyebrow}>
              {[
                etiquetaTipo(consulta.data.tipoRecurso),
                consulta.data.area ? ETIQUETAS_AREA[consulta.data.area] : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <Titulo className={styles.titulo}>{consulta.data.titulo}</Titulo>
            {consulta.data.resumen ? (
              <p className={styles.resumen}>{consulta.data.resumen}</p>
            ) : null}
            <div className={styles.meta}>
              {consulta.data.duracionMin ? (
                <span>{formatoDuracion(consulta.data.duracionMin, consulta.data.tipoRecurso)}</span>
              ) : null}
              <span>{ETIQUETAS_SECCION[consulta.data.seccion]}</span>
            </div>
            {consulta.data.elementos.length > 0 ? (
              <ul className={styles.elementos} aria-label="Elementos de colaboración">
                {consulta.data.elementos.map((e) => (
                  <li key={e}>
                    <Badge variant="neutral">{ETIQUETAS_ELEMENTO[e]}</Badge>
                  </li>
                ))}
              </ul>
            ) : null}
          </header>

          <div className={styles.cuerpo}>
            <Cuerpo recurso={consulta.data} />
          </div>

          <footer className={styles.pie}>
            {consulta.data.fuente ? <p>Fuente: {consulta.data.fuente}</p> : null}
            {consulta.data.licencia ? <p>Derechos de uso: {consulta.data.licencia}</p> : null}
            <p>
              Actualizado el{' '}
              <time dateTime={consulta.data.fechaActualizacion}>
                {FECHA.format(new Date(consulta.data.fechaActualizacion))}
              </time>
            </p>
          </footer>
        </article>
      ) : null}
    </div>
  )
}
