import { Link, useParams } from 'react-router-dom'
import { ETIQUETAS_AREA, ETIQUETAS_ELEMENTO, ETIQUETAS_NIVEL_CURSO } from '@plataforma/shared'
import { AvisoError, Badge, Button, Card, IconoCargando } from '../../components/ui'
import { etiquetaLeccion } from './formato'
import { ErrorFormacion, type CursoPublico } from './formacion.api'
import { MarcoFormacion } from './MarcoFormacion'
import { useDentroDeApp } from './marcoContexto'
import { useCursoPublico } from './useCursos'
import styles from './PantallaCurso.module.css'

const FECHA = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' })

/*
 * Ficha de un curso (docs/diseno-desarrollo-formacion.md §5.3): lo que la
 * persona necesita saber antes de empezar. Es pública, como las lecciones.
 */
export function PantallaCurso() {
  return (
    <MarcoFormacion titulo="Recursos">
      <FichaCurso />
    </MarcoFormacion>
  )
}

function Contenido({ curso }: { curso: CursoPublico }) {
  const Titulo = useDentroDeApp() ? 'h2' : 'h1'
  const primera = curso.lecciones.find((l) => l.disponible) ?? curso.lecciones[0]

  return (
    <article className={styles.ficha}>
      <div className={styles.principal}>
        <header>
          <p className={styles.eyebrow}>
            {[
              'Curso',
              curso.area ? ETIQUETAS_AREA[curso.area] : null,
              curso.nivel ? ETIQUETAS_NIVEL_CURSO[curso.nivel] : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <Titulo className={styles.titulo}>{curso.titulo}</Titulo>
          <p className={styles.resumen}>{curso.resumen}</p>
        </header>

        <section aria-labelledby="titulo-objetivo">
          <h2 id="titulo-objetivo">Qué vas a aprender</h2>
          <p>{curso.objetivo}</p>
        </section>

        <section aria-labelledby="titulo-temario">
          <h2 id="titulo-temario">Lecciones</h2>
          <ol className={styles.temario}>
            {curso.lecciones.map((l, i) => (
              <li key={l.idLeccion}>
                <span className={styles.numero}>{String(i + 1).padStart(2, '0')}</span>
                <div className={styles.temarioTexto}>
                  {l.disponible ? (
                    <Link to={`/cursos/${curso.idCurso}/lecciones/${l.idLeccion}`}>{l.titulo}</Link>
                  ) : (
                    <span className={styles.noDisponible}>{l.titulo}</span>
                  )}
                  <span className={styles.temarioMeta}>
                    {[
                      etiquetaLeccion(l),
                      l.duracionMin ? `${l.duracionMin} min` : null,
                      l.obligatoria ? null : 'Opcional',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="titulo-elementos">
          <h2 id="titulo-elementos">Elementos de colaboración que trabaja</h2>
          <ul className={styles.elementos}>
            {curso.elementos.map((e) => (
              <li key={e}>
                <Badge variant="neutral">{ETIQUETAS_ELEMENTO[e]}</Badge>
              </li>
            ))}
          </ul>
        </section>

        <footer className={styles.pie}>
          {curso.autor ? <p>Responsable del contenido: {curso.autor}</p> : null}
          <p>
            Actualizado el{' '}
            <time dateTime={curso.fechaActualizacion}>
              {FECHA.format(new Date(curso.fechaActualizacion))}
            </time>
          </p>
        </footer>
      </div>

      <aside className={styles.lateral} aria-label="Resumen del curso">
        <Card className={styles.tarjeta}>
          <dl className={styles.datos}>
            <div>
              <dt>Duración</dt>
              <dd>{curso.duracionMin} min</dd>
            </div>
            <div>
              <dt>Lecciones</dt>
              <dd>{curso.numLecciones}</dd>
            </div>
            {curso.nivel ? (
              <div>
                <dt>Nivel</dt>
                <dd>{ETIQUETAS_NIVEL_CURSO[curso.nivel]}</dd>
              </div>
            ) : null}
          </dl>
          <div className={styles.resultado}>
            <p className={styles.resultadoTitulo}>Lo que te llevas</p>
            <p>{curso.practicaFinal}</p>
          </div>
          {primera?.disponible ? (
            <Button to={`/cursos/${curso.idCurso}/lecciones/${primera.idLeccion}`}>
              Empezar curso
            </Button>
          ) : null}
        </Card>
      </aside>
    </article>
  )
}

function FichaCurso() {
  const { id = '' } = useParams()
  const consulta = useCursoPublico(id)
  const Titulo = useDentroDeApp() ? 'h2' : 'h1'
  // Tras un 404 la consulta conserva los datos de antes: el curso ya no existe
  // para el público y no se debe seguir mostrando.
  const noExiste = consulta.error instanceof ErrorFormacion && consulta.error.status === 404

  return (
    <div className={styles.pagina}>
      <Link to="/recursos" className={styles.volver}>
        ← Todos los recursos
      </Link>

      {consulta.isPending ? (
        <div className={styles.estado} role="status" aria-label="Cargando curso">
          <IconoCargando size={24} />
        </div>
      ) : null}

      {consulta.isError ? (
        <div className={styles.estado}>
          {noExiste ? (
            <>
              <Titulo className={styles.titulo}>No encontramos este curso</Titulo>
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

      {consulta.data && !noExiste ? <Contenido curso={consulta.data} /> : null}
    </div>
  )
}
