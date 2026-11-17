import { useEffect } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { AvisoError, Badge, Button, Card, IconoCargando, Paginacion } from '../../components/ui'
import { BarraProgreso } from './BarraProgreso'
import { MisPropuestas } from './MisPropuestas'
import { useAvisosPropuestas } from './usePropuestas'
import type { MiCurso } from './formacion.api'
import { etiquetaTipo, formatoDuracion, formatoFecha, textoProgreso } from './formato'
import { IconoFlecha } from './iconos'
import {
  useCambiarGuardado,
  useMiFormacion,
  useMisConstancias,
  useRecursosGuardados,
} from './useProgreso'
import styles from './PantallaMiFormacion.module.css'

/*
 * Espacio individual de formación (docs/diseno-desarrollo-formacion.md §7.2 y
 * ESP-02): mis cursos, mis recursos guardados y mis propuestas de contenido
 * (nota del incremento 6). Es de la persona y de nadie más; no muestra
 * perfil, insignias ni comparación con otras personas.
 *
 * Observaciones del 12 de noviembre: por consistencia con el resto del sitio,
 * una sola página con tarjetas en cuadrícula, sin pestañas. "¿Qué quieres
 * fortalecer?" se mudó a Rutas recomendadas (/recursos), que es lo único que
 * usa. ?vista=guardados o ?vista=propuestas lleva a esa sección, para que los
 * enlaces de antes sigan sirviendo.
 */

const POR_PAGINA_GUARDADOS = 9

export function PantallaMiFormacion() {
  const [parametros] = useSearchParams()
  const vista = parametros.get('vista')
  // La sección dice si hay decisiones nuevas sobre mis propuestas, con texto.
  const avisos = useAvisosPropuestas().data ?? 0

  useEffect(() => {
    if (vista === 'guardados' || vista === 'propuestas') {
      document.getElementById(`seccion-${vista}`)?.scrollIntoView()
    }
  }, [vista])

  return (
    <AppShell seccionActiva="mi-formacion" titulo="Mi formación">
      <div className={styles.contenido}>
        <p className={styles.introduccion}>
          Continúa consultando los recursos que has seleccionado, así como aquellos que elegiste en
          algún momento.
        </p>

        <section id="seccion-cursos" className={styles.seccion} aria-labelledby="titulo-cursos">
          <h2 id="titulo-cursos" className={styles.tituloSeccion}>
            Cursos
          </h2>
          <MisCursos />
        </section>

        <section
          id="seccion-guardados"
          className={styles.seccion}
          aria-labelledby="titulo-guardados"
        >
          <h2 id="titulo-guardados" className={styles.tituloSeccion}>
            Recursos guardados
          </h2>
          <Guardados />
        </section>

        <section
          id="seccion-propuestas"
          className={styles.seccion}
          aria-labelledby="titulo-propuestas"
        >
          <h2 id="titulo-propuestas" className={styles.tituloSeccion}>
            {avisos > 0
              ? `Mis propuestas (${avisos} ${avisos === 1 ? 'nueva' : 'nuevas'})`
              : 'Mis propuestas'}
          </h2>
          <MisPropuestas />
        </section>
      </div>
    </AppShell>
  )
}

function Cargando({ etiqueta }: { etiqueta: string }) {
  return (
    <div className={styles.cargando} role="status" aria-label={etiqueta}>
      <IconoCargando size={24} />
    </div>
  )
}

function Vacio({ texto }: { texto: string }) {
  return (
    <div className={styles.vacio}>
      <p>{texto}</p>
      <Button variant="secondary" to="/recursos">
        Explorar recursos
      </Button>
    </div>
  )
}

function MisCursos() {
  const consulta = useMiFormacion()
  // Si falla o tarda, los cursos se muestran igual, sin el enlace.
  const constancias = useMisConstancias()
  const folioDe = new Map<string, string>()
  for (const k of constancias.data?.constancias ?? []) {
    if (k.idCurso) folioDe.set(k.idCurso, k.folio)
  }

  if (consulta.isPending) return <Cargando etiqueta="Cargando tus cursos" />
  if (consulta.isError) {
    return (
      <div className={styles.vacio}>
        <AvisoError mensaje={consulta.error.message} />
        <Button variant="secondary" size="sm" onClick={() => void consulta.refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }

  const { enCurso, completados } = consulta.data
  if (enCurso.length === 0 && completados.length === 0) {
    return (
      <Vacio texto="Todavía no empiezas ningún curso. Cuando lo hagas, aquí verás tu avance." />
    )
  }

  return (
    <ul className={styles.grid}>
      {enCurso.map((c) => (
        <li key={c.idCurso}>
          <TarjetaMiCurso curso={c} />
        </li>
      ))}
      {completados.map((c) => (
        <li key={c.idCurso}>
          <TarjetaMiCurso curso={c} folioConstancia={folioDe.get(c.idCurso)} />
        </li>
      ))}
    </ul>
  )
}

function TarjetaMiCurso({
  curso: c,
  folioConstancia,
}: {
  curso: MiCurso
  folioConstancia?: string
}) {
  const retirado = c.estatus === 'retirado'
  const terminado = c.fechaFinalizacion !== null

  return (
    <Card className={styles.tarjeta}>
      <div className={styles.tarjetaMeta}>
        {retirado ? (
          <Badge variant="neutral">Retirado</Badge>
        ) : terminado ? (
          <Badge variant="success">
            <span aria-hidden="true">✓ </span>Completado
          </Badge>
        ) : (
          <Badge variant="primary">En curso</Badge>
        )}
      </div>
      <h3 className={styles.tarjetaTitulo}>
        {retirado ? c.titulo : <Link to={`/cursos/${c.idCurso}`}>{c.titulo}</Link>}
      </h3>

      <div className={styles.avance}>
        <BarraProgreso
          porcentaje={c.porcentaje}
          completo={terminado}
          etiqueta={`Progreso en ${c.titulo}`}
        />
        <p className={styles.meta}>
          {[
            textoProgreso(c),
            terminado
              ? `Completado el ${formatoFecha(c.fechaFinalizacion as string)}`
              : `Empezado el ${formatoFecha(c.fechaInicio)}`,
          ].join(' · ')}
        </p>
      </div>

      {retirado ? (
        <p className={styles.nota}>
          Este curso se retiró del catálogo. Tu avance se conserva, pero sus lecciones ya no se
          pueden abrir.
        </p>
      ) : c.siguiente ? (
        <p className={styles.siguiente}>Sigue con: {c.siguiente.titulo}</p>
      ) : null}

      <div className={styles.pie}>
        {folioConstancia ? (
          <Link
            to={`/constancias/${folioConstancia}`}
            className={styles.enlaceConstancia}
            aria-label={`Ver la constancia de ${c.titulo}`}
          >
            Ver constancia
          </Link>
        ) : (
          <span />
        )}
        {!retirado && c.siguiente ? (
          <Link
            to={`/cursos/${c.idCurso}/lecciones/${c.siguiente.idLeccion}`}
            className={styles.enlaceAccion}
          >
            {terminado ? 'Ver lo nuevo' : 'Continuar'} <IconoFlecha className={styles.flecha} />
            <span className={styles.srOnly}>: {c.titulo}</span>
          </Link>
        ) : null}
      </div>
    </Card>
  )
}

function Guardados() {
  const [parametros, setParametros] = useSearchParams()
  const pagina = Math.max(1, Number(parametros.get('pagina')) || 1)
  const consulta = useRecursosGuardados(pagina, POR_PAGINA_GUARDADOS)
  const quitar = useCambiarGuardado()

  if (consulta.isPending) return <Cargando etiqueta="Cargando tus recursos guardados" />
  if (consulta.isError) {
    return (
      <div className={styles.vacio}>
        <AvisoError mensaje={consulta.error.message} />
        <Button variant="secondary" size="sm" onClick={() => void consulta.refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }

  const { recursos, paginacion } = consulta.data
  // Una página que ya no tiene nada (por ejemplo, al quitar el último
  // recurso de la página 2) se cambia por la última que sí existe: si no,
  // quedaría un panel vacío y Paginacion, que se oculta cuando todo cabe en
  // una página, no daría forma de volver. Solo con una respuesta real, no
  // con la anterior que se sigue mostrando mientras llega la nueva.
  if (recursos.length === 0 && pagina > 1 && !consulta.isPlaceholderData) {
    const ultima = Math.max(1, paginacion.totalPaginas)
    return (
      <Navigate
        replace
        to={ultima === 1 ? '?vista=guardados' : `?vista=guardados&pagina=${ultima}`}
      />
    )
  }
  if (paginacion.total === 0) {
    return (
      <p className={styles.nota}>
        Aún no guardas recursos. Usa «Guardar para después» en cualquier recurso y aparecerá aquí.
      </p>
    )
  }

  return (
    <div className={styles.bloque}>
      {quitar.isError ? <AvisoError mensaje={quitar.error.message} /> : null}
      <ul className={styles.grid}>
        {recursos.map((r) => (
          <li key={r.idRecurso}>
            <Card className={styles.tarjeta}>
              <div className={styles.tarjetaMeta}>
                <Badge variant="neutral">Guardado</Badge>
                <span>
                  {[etiquetaTipo(r.tipoRecurso), formatoDuracion(r.duracionMin, r.tipoRecurso)]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
              <h3 className={styles.tarjetaTitulo}>
                <Link to={`/recursos/${r.idRecurso}`}>{r.titulo}</Link>
              </h3>
              <div className={styles.pie}>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={quitar.isPending}
                  aria-label={`Quitar «${r.titulo}» de guardados`}
                  onClick={() => quitar.mutate({ idRecurso: r.idRecurso, guardar: false })}
                >
                  Quitar
                </Button>
                <Link to={`/recursos/${r.idRecurso}`} className={styles.enlaceAccion}>
                  Abrir <IconoFlecha className={styles.flecha} />
                  <span className={styles.srOnly}>: {r.titulo}</span>
                </Link>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      {/* Paginacion cuenta desde 0; la API, desde 1. */}
      <Paginacion
        total={paginacion.total}
        tamano={POR_PAGINA_GUARDADOS}
        pagina={pagina - 1}
        etiqueta="Recursos guardados"
        onCambiar={(p) =>
          setParametros(
            p === 0 ? { vista: 'guardados' } : { vista: 'guardados', pagina: String(p + 1) },
          )
        }
      />
    </div>
  )
}
