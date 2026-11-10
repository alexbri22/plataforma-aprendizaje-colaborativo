import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ETIQUETAS_TIPO_LECCION, LARGO_MAXIMO_REFLEXION } from '@plataforma/shared'
import { AvisoError, Button, IconoCargando, Textarea } from '../../components/ui'
import { useSesion } from '../cuentas'
import { BarraProgreso } from './BarraProgreso'
import { CuerpoRecurso } from './CuerpoRecurso'
import { etiquetaLeccion, formatoFecha, textoProgreso } from './formato'
import {
  ErrorFormacion,
  type CursoPublico,
  type LeccionPublica,
  type MiProgresoCurso,
  type ReflexionPropia,
} from './formacion.api'
import { MarcoFormacion } from './MarcoFormacion'
import { useDentroDeApp } from './marcoContexto'
import { Markdown } from './Markdown'
import { useCursoPublico, useLeccionPublica } from './useCursos'
import { useGuardarReflexion, useMarcarLeccion, useMiProgreso } from './useProgreso'
import styles from './PantallaLeccion.module.css'

/*
 * Visor de lecciones (docs/diseno-desarrollo-formacion.md §2.3 y §10.1):
 * lectura calmada con el índice del curso al lado. Es público. Con sesión,
 * además se marca la lección como completada, el índice señala las hechas y
 * la reflexión se guarda en privado. Progreso sobrio: texto y porcentaje,
 * Confirmed Green al terminar, sin rachas ni celebraciones.
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

function Indice({
  curso,
  idActual,
  completadas,
}: {
  curso: CursoPublico
  idActual: string
  completadas: ReadonlySet<string>
}) {
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
                {completadas.has(l.idLeccion) ? (
                  <span className={styles.indiceCompletada}>
                    <span aria-hidden="true">✓ </span>Completada
                  </span>
                ) : null}
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

/** La respuesta privada a una reflexión. Se monta ya con lo guardado y con
 * una llave por lección, para que el borrador empiece desde ahí. */
function RespuestaReflexion({
  idCurso,
  idLeccion,
  guardada,
}: {
  idCurso: string
  idLeccion: string
  guardada: ReflexionPropia | undefined
}) {
  const [texto, setTexto] = useState(guardada?.texto ?? '')
  const guardar = useGuardarReflexion(idCurso)
  const sinCambios = texto.trim() === (guardada?.texto ?? '')

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    guardar.mutate({ idLeccion, texto })
  }

  return (
    <form className={styles.respuesta} onSubmit={enviar}>
      <Textarea
        label="Tu respuesta"
        rows={5}
        maxLength={LARGO_MAXIMO_REFLEXION}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
      <p className={styles.reflexionNota}>
        Solo tú puedes leerla. No se califica ni se comparte con nadie.
      </p>
      {guardar.isError ? <AvisoError mensaje={guardar.error.message} /> : null}
      <div className={styles.respuestaAcciones}>
        <Button type="submit" size="sm" disabled={sinCambios || guardar.isPending}>
          {guardada && texto.trim() === '' ? 'Borrar reflexión' : 'Guardar reflexión'}
        </Button>
        <span role="status" className={styles.respuestaEstado}>
          {guardada && sinCambios ? `Guardada el ${formatoFecha(guardada.fechaActualizacion)}` : ''}
        </span>
      </div>
    </form>
  )
}

function CuerpoLeccion({
  leccion,
  idCurso,
  progreso,
}: {
  leccion: LeccionPublica
  idCurso: string
  /** Con sesión y ya leído; undefined sin sesión o mientras carga. */
  progreso: MiProgresoCurso | undefined
}) {
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
        {progreso ? (
          <RespuestaReflexion
            key={leccion.idLeccion}
            idCurso={idCurso}
            idLeccion={leccion.idLeccion}
            guardada={progreso.reflexiones.find((r) => r.idLeccion === leccion.idLeccion)}
          />
        ) : (
          <p className={styles.reflexionNota}>
            Esta reflexión es personal y no se califica. Tómate un momento para pensarla o anotarla.
          </p>
        )}
      </div>
    )
  }

  return (
    <>
      {leccion.contenido ? <Markdown fuente={leccion.contenido} /> : null}
      {leccion.recurso ? (
        <>
          <CuerpoRecurso recurso={leccion.recurso} />
          <footer className={styles.creditos}>
            {leccion.recurso.fuente ? <p>Fuente: {leccion.recurso.fuente}</p> : null}
            {leccion.recurso.licencia ? <p>Derechos de uso: {leccion.recurso.licencia}</p> : null}
          </footer>
        </>
      ) : null}
    </>
  )
}

/** Marcar la lección como hecha (o devolverla a pendiente). */
function ControlCompletar({
  idCurso,
  idLeccion,
  completada,
  alTerminarCurso,
}: {
  idCurso: string
  idLeccion: string
  completada: boolean
  alTerminarCurso: () => void
}) {
  const marcar = useMarcarLeccion(idCurso)
  const cambiar = (valor: boolean) =>
    marcar.mutate(
      { idLeccion, completada: valor },
      { onSuccess: (r) => (r.cursoCompletadoAhora ? alTerminarCurso() : undefined) },
    )

  return (
    <div className={styles.completar}>
      {marcar.isError ? (
        <div className={styles.completarError}>
          <AvisoError mensaje={marcar.error.message} />
        </div>
      ) : null}
      {completada ? (
        <>
          <p className={styles.completadaTexto}>
            <span aria-hidden="true">✓ </span>Completaste esta lección
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => cambiar(false)}
            disabled={marcar.isPending}
          >
            Marcar como pendiente
          </Button>
        </>
      ) : (
        <Button onClick={() => cambiar(true)} disabled={marcar.isPending}>
          Marcar como completada
        </Button>
      )}
    </div>
  )
}

function VisorLeccion() {
  const { id = '', idLeccion = '' } = useParams()
  const Titulo = useDentroDeApp() ? 'h2' : 'h1'
  const curso = useCursoPublico(id)
  const leccion = useLeccionPublica(id, idLeccion)
  const { usuario } = useSesion()
  // Sin sesión no se pide; si falla, el visor se sigue leyendo sin progreso.
  const progreso = useMiProgreso(id).data
  const error = curso.error ?? leccion.error
  const [indiceAbierto, setIndiceAbierto] = useState(indiceAbiertoAlInicio)
  // Solo la marca que terminó el curso lo avisa, y solo en esa lección.
  const [terminoEn, setTerminoEn] = useState<string | null>(null)

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
  const conProgreso = usuario !== null ? progreso : undefined
  const completadas = new Set(conProgreso?.leccionesCompletadas ?? [])

  return (
    <div className={styles.pagina}>
      <Link to={`/cursos/${c.idCurso}`} className={styles.volver}>
        ← {c.titulo}
      </Link>

      <div className={styles.visor}>
        <aside className={styles.lateral}>
          {conProgreso?.inscrito ? (
            <div className={styles.avance}>
              <BarraProgreso
                porcentaje={conProgreso.porcentaje}
                completo={conProgreso.fechaFinalizacion !== null}
                etiqueta={`Progreso en ${c.titulo}`}
              />
              <p>{textoProgreso(conProgreso)}</p>
            </div>
          ) : null}
          <details
            className={styles.plegable}
            open={indiceAbierto}
            onToggle={(e) => setIndiceAbierto(e.currentTarget.open)}
          >
            <summary>
              Lección {posicion} de {c.lecciones.length}
            </summary>
            <Indice curso={c} idActual={l.idLeccion} completadas={completadas} />
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
            <CuerpoLeccion leccion={l} idCurso={c.idCurso} progreso={conProgreso} />
          </div>

          {conProgreso && l.disponible ? (
            <ControlCompletar
              key={l.idLeccion}
              idCurso={c.idCurso}
              idLeccion={l.idLeccion}
              completada={completadas.has(l.idLeccion)}
              alTerminarCurso={() => setTerminoEn(l.idLeccion)}
            />
          ) : null}

          {terminoEn === l.idLeccion ? (
            <div className={styles.cursoTerminado} role="status">
              <p className={styles.cursoTerminadoTitulo}>Completaste el curso</p>
              <p>
                Terminaste todas las lecciones de «{c.titulo}». Puedes volver a ellas cuando
                quieras.
              </p>
              <Link to={`/cursos/${c.idCurso}`}>Volver al curso</Link>
            </div>
          ) : null}

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
