import {
  ETIQUETAS_AREA,
  ETIQUETAS_ELEMENTO,
  ETIQUETAS_NIVEL_CURSO,
  ETIQUETAS_SECCION,
  ETIQUETAS_TIPO_RECURSO,
} from '@plataforma/shared'
import { IconoCargando } from '../../../components/ui'
import { CuerpoRecurso } from '../CuerpoRecurso'
import type { ArchivoRecurso, CursoAdmin, LeccionAdmin, RecursoAdmin } from '../formacion.api'
import { etiquetaLeccion, formatoTamano } from '../formato'
import { Markdown } from '../Markdown'
import { useRecursoPublico } from '../useRecursos'
import styles from './VistaPrevia.module.css'

/*
 * Vista previa de un recurso o un curso que todavía no se publica (§12.3 y
 * nota del incremento 6): lo que verá la persona, en una sola página y con
 * todas las lecciones abiertas, que es más fácil de revisar que el visor
 * lección por lección. La usan el administrador en la cola y el autor en su
 * editor. No crea inscripciones: el progreso solo acepta cursos publicados.
 */

function meta(partes: (string | null | undefined)[]): string {
  return partes.filter(Boolean).join(' · ')
}

export function VistaPreviaRecurso({
  recurso,
  urlArchivo,
}: {
  recurso: RecursoAdmin
  urlArchivo: (archivo: ArchivoRecurso) => string
}) {
  const { archivo } = recurso
  return (
    <article className={styles.vista}>
      <header className={styles.cabecera}>
        <p className={styles.eyebrow}>
          {meta([
            ETIQUETAS_TIPO_RECURSO[recurso.tipoRecurso],
            ETIQUETAS_SECCION[recurso.seccion],
            recurso.duracionMin ? `${recurso.duracionMin} min` : null,
          ])}
        </p>
        <h3 className={styles.titulo}>{recurso.titulo}</h3>
        {recurso.resumen ? <p className={styles.resumen}>{recurso.resumen}</p> : null}
        <p className={styles.etiquetas}>
          {meta([
            recurso.area ? ETIQUETAS_AREA[recurso.area] : null,
            ...recurso.elementos.map((e) => ETIQUETAS_ELEMENTO[e]),
          ])}
        </p>
      </header>
      {archivo ? (
        <p className={styles.archivo}>
          <a href={urlArchivo(archivo)} target="_blank" rel="noopener noreferrer">
            Abrir {archivo.nombre}
          </a>{' '}
          · {formatoTamano(archivo.tamano)}
        </p>
      ) : null}
      {/* El archivo de un borrador no se sirve en la dirección pública: el
          enlace de arriba es el que lo abre. */}
      <CuerpoRecurso recurso={{ ...recurso, archivo: null }} />
      <p className={styles.fuente}>
        {meta([
          recurso.fuente ? `Fuente: ${recurso.fuente}` : null,
          recurso.licencia ? `Licencia: ${recurso.licencia}` : null,
        ])}
      </p>
    </article>
  )
}

export function VistaPreviaCurso({ curso }: { curso: CursoAdmin }) {
  return (
    <article className={styles.vista}>
      <header className={styles.cabecera}>
        <p className={styles.eyebrow}>
          {meta([
            'Curso',
            curso.nivel ? `Nivel ${ETIQUETAS_NIVEL_CURSO[curso.nivel].toLowerCase()}` : null,
            `${curso.lecciones.length} ${curso.lecciones.length === 1 ? 'lección' : 'lecciones'}`,
            curso.duracionMin ? `${curso.duracionMin} min` : null,
          ])}
        </p>
        <h3 className={styles.titulo}>{curso.titulo}</h3>
        {curso.resumen ? <p className={styles.resumen}>{curso.resumen}</p> : null}
        <p className={styles.etiquetas}>
          {meta([
            curso.area ? ETIQUETAS_AREA[curso.area] : null,
            ...curso.elementos.map((e) => ETIQUETAS_ELEMENTO[e]),
          ])}
        </p>
      </header>
      {curso.objetivo ? (
        <section className={styles.bloque}>
          <h4>Objetivo</h4>
          <p>{curso.objetivo}</p>
        </section>
      ) : null}
      {curso.practicaFinal ? (
        <section className={styles.bloque}>
          <h4>Resultado práctico</h4>
          <p>{curso.practicaFinal}</p>
        </section>
      ) : null}
      <ol className={styles.lecciones}>
        {curso.lecciones.map((l, i) => (
          <li key={l.idLeccion} className={styles.leccion}>
            <p className={styles.eyebrow}>
              {meta([
                `Lección ${i + 1}`,
                etiquetaLeccion({ tipo: l.tipo, tipoRecurso: l.recurso?.tipoRecurso }),
                l.duracionEfectivaMin ? `${l.duracionEfectivaMin} min` : null,
                l.obligatoria ? null : 'Opcional',
              ])}
            </p>
            <h4 className={styles.leccionTitulo}>
              {l.titulo || l.recurso?.titulo || 'Sin título'}
            </h4>
            {l.tipo === 'recurso' ? <LeccionDeRecurso leccion={l} /> : null}
            {l.contenido ? <Markdown fuente={l.contenido} /> : null}
          </li>
        ))}
      </ol>
    </article>
  )
}

/** Una lección que reutiliza un recurso publicado: se muestra el recurso. */
function LeccionDeRecurso({ leccion }: { leccion: LeccionAdmin }) {
  const idRecurso = leccion.recurso?.idRecurso ?? ''
  const consulta = useRecursoPublico(idRecurso)
  if (!leccion.recurso || leccion.recurso.estatus !== 'publicado') {
    return <p className={styles.aviso}>El recurso de esta lección no está publicado.</p>
  }
  if (consulta.isPending) {
    return (
      <div role="status" aria-label="Cargando el recurso">
        <IconoCargando size={16} />
      </div>
    )
  }
  if (!consulta.data) return <p className={styles.aviso}>No pudimos cargar el recurso.</p>
  return (
    <div className={styles.recurso}>
      <p className={styles.recursoTitulo}>
        {ETIQUETAS_TIPO_RECURSO[consulta.data.tipoRecurso]}: {consulta.data.titulo}
      </p>
      <CuerpoRecurso recurso={consulta.data} />
    </div>
  )
}
