import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ETIQUETAS_TIPO_LECCION } from '@plataforma/shared'
import { AvisoError, Button, IconoCargando } from '../../components/ui'
import { CuerpoRecurso } from './CuerpoRecurso'
import { etiquetaLeccion } from './formato'
import { ErrorFormacion, type CursoPublico, type LeccionPublica } from './formacion.api'
import { MarcoFormacion } from './MarcoFormacion'
import { useDentroDeApp } from './marcoContexto'
import { Markdown } from './Markdown'
import { useCursoPublico, useLeccionPublica } from './useCursos'
import styles from './PantallaLeccion.module.css'

/*
 * Visor de lecciones (docs/diseno-desarrollo-formacion.md §2.3 y §10.1):
 * lectura calmada con el índice del curso al lado. Es público; todavía no
 * guarda progreso, que llega con la inscripción y exigirá sesión.
 */
export function PantallaLeccion() {
  return (
    <MarcoFormacion titulo="Recursos">
      <VisorLeccion />
    </MarcoFormacion>
  )
}

// Mismo corte que PantallaLeccion.module.css: en angosto el índice empieza
// plegado para que lo primero sea la lección.
const ANCHO_CON_INDICE = '(min-width: 56rem)'

function indiceAbiertoAlInicio(): boolean {
  return window.matchMedia?.(ANCHO_CON_INDICE).matches ?? true
}

function Indice({ curso, idActual }: { curso: CursoPublico; idActual: string }) {
  return (
    <nav aria-label="Lecciones del curso">
      <ol className={styles.indice}>
        {curso.lecciones.map((l, i) => {
          const numero = String(i + 1).padStart(2, '0')
          const contenido = (
            <>
              <span className={styles.indiceNumero}>{numero}</span>
              <span className={styles.indiceTexto}>
                <span>{l.titulo}</span>
                <span className={styles.indiceMeta}>
                  {[etiquetaLeccion(l), l.duracionMin ? `${l.duracionMin} min` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
            </>
          )
          return (
            <li key={l.idLeccion}>
              {l.disponible ? (
                <Link
                  to={`/cursos/${curso.idCurso}/lecciones/${l.idLeccion}`}
                  className={l.idLeccion === idActual ? styles.indiceActual : styles.indiceEnlace}
                  aria-current={l.idLeccion === idActual ? 'step' : undefined}
                >
                  {contenido}
                </Link>
              ) : (
                <span className={styles.indiceInactivo}>{contenido}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function CuerpoLeccion({ leccion }: { leccion: LeccionPublica }) {
  if (!leccion.disponible) {
    return (
      <div className={styles.noDisponible} role="status">
        <p className={styles.noDisponibleTitulo}>Esta lección no está disponible por ahora</p>
        <p>El recurso que usaba se retiró. Puedes continuar con la siguiente lección.</p>
      </div>
    )
  }

  if (leccion.tipo === 'reflexion') {
    return (
      <div className={styles.reflexion}>
        <p className={styles.reflexionTitulo}>Para reflexionar</p>
        <Markdown fuente={leccion.contenido} />
        <p className={styles.reflexionNota}>
          Esta reflexión es personal y no se califica. Tómate un momento para pensarla o anotarla.
        </p>
      </div>
    )
  }

  return (
    <>
      {leccion.contenido ? <Markdown fuente={leccion.contenido} /> : null}
      {leccion.recurso ? <CuerpoRecurso recurso={leccion.recurso} /> : null}
    </>
  )
}

function VisorLeccion() {
  const { id = '', idLeccion = '' } = useParams()
  const Titulo = useDentroDeApp() ? 'h2' : 'h1'
  const curso = useCursoPublico(id)
  const leccion = useLeccionPublica(id, idLeccion)
  const error = curso.error ?? leccion.error
  const [indiceAbierto, setIndiceAbierto] = useState(indiceAbiertoAlInicio)

  // La ruta no cambia de pantalla al pasar de lección: sin esto, "Siguiente"
  // dejaría a la persona al final de la lección nueva.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [idLeccion])

  if (error) {
    const noExiste = error instanceof ErrorFormacion && error.status === 404
    return (
      <div className={styles.pagina}>
        <div className={styles.estado}>
          {noExiste ? (
            <>
              <Titulo className={styles.titulo}>No encontramos esta lección</Titulo>
              <p>Puede que el curso se haya retirado o que el enlace esté incompleto.</p>
              <Button variant="secondary" to="/recursos">
                Ver todos los recursos
              </Button>
            </>
          ) : (
            <AvisoError mensaje={error.message} />
          )}
        </div>
      </div>
    )
  }

  if (!curso.data || !leccion.data) {
    return (
      <div className={styles.pagina}>
        <div className={styles.estado} role="status" aria-label="Cargando lección">
          <IconoCargando size={24} />
        </div>
      </div>
    )
  }

  const c = curso.data
  const l = leccion.data
  const rutaDe = (idL: string) => `/cursos/${c.idCurso}/lecciones/${idL}`
  const posicion = c.lecciones.findIndex((x) => x.idLeccion === l.idLeccion) + 1

  return (
    <div className={styles.pagina}>
      <Link to={`/cursos/${c.idCurso}`} className={styles.volver}>
        ← {c.titulo}
      </Link>

      <div className={styles.visor}>
        <aside className={styles.lateral}>
          <details
            className={styles.plegable}
            open={indiceAbierto}
            onToggle={(e) => setIndiceAbierto(e.currentTarget.open)}
          >
            <summary>
              Lección {posicion} de {c.lecciones.length}
            </summary>
            <Indice curso={c} idActual={l.idLeccion} />
          </details>
        </aside>

        <article className={styles.leccion}>
          <header className={styles.cabecera}>
            <p className={styles.eyebrow}>
              {[
                `Lección ${posicion} de ${c.lecciones.length}`,
                l.tipo === 'recurso' ? etiquetaLeccion(l) : ETIQUETAS_TIPO_LECCION[l.tipo],
                l.duracionMin ? `${l.duracionMin} min` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <Titulo className={styles.titulo}>{l.titulo}</Titulo>
          </header>

          <div className={styles.cuerpo}>
            <CuerpoLeccion leccion={l} />
          </div>

          <nav className={styles.navegacion} aria-label="Navegación entre lecciones">
            {l.anterior ? (
              <Link to={rutaDe(l.anterior.idLeccion)} className={styles.anterior}>
                <span className={styles.navegacionEtiqueta}>← Anterior</span>
                <span>{l.anterior.titulo}</span>
              </Link>
            ) : (
              <span />
            )}
            {l.siguiente ? (
              <Link to={rutaDe(l.siguiente.idLeccion)} className={styles.siguiente}>
                <span className={styles.navegacionEtiqueta}>Siguiente →</span>
                <span>{l.siguiente.titulo}</span>
              </Link>
            ) : (
              <Link to={`/cursos/${c.idCurso}`} className={styles.siguiente}>
                <span className={styles.navegacionEtiqueta}>Terminaste las lecciones</span>
                <span>Volver al curso</span>
              </Link>
            )}
          </nav>
        </article>
      </div>
    </div>
  )
}
